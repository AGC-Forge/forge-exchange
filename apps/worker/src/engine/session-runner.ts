// ── Shared session/job types (duplicated here to avoid cross-app import) ──
import { captureSessionError } from '../utils/sentry.js'
import type { Redis as IORedis } from "ioredis";
import type { BrowserPoolManager } from "./browser-pool.js";
import { HumanBehaviorEngine } from "../behavior/behavior-engine.js";
import { ProxyManager } from "../proxy/proxy-manager.js";
import type { WorkerLogger } from "../utils/logger.js";
import type { CampaignJobPayload, ContextLease, OSType, BrowserType, GeoTarget } from "@forge-exchange/worker-kit"
import { prismaWorker } from '@forge-exchange/db'
import {
  ConsistentFingerprintGenerator
} from '../fingerprint/consistent-fingerprint.js'
import { ConsistentStealthInjector } from '../stealth/consistent-injector.js'
import { OS_BROWSER_COMPAT } from "../fingerprint/matrix.js";
import { ProxyResolver } from '../proxy/proxy-resolver.js'

export interface SessionResult {
  sessionId: string;
  campaignId: string;
  success: boolean;
  durationMs: number;
  pagesVisited: number;
  creditsUsed: number;
  ipUsed?: string;
  errorType?: string;
  errorMessage?: string;
}

export class SessionRunner {
  private pool: BrowserPoolManager;
  private redis: IORedis;
  private logger: WorkerLogger;
  private fpGen: ConsistentFingerprintGenerator
  private injector: ConsistentStealthInjector
  private behavior: HumanBehaviorEngine;
  private proxy: ProxyManager;
  private proxyResolver: ProxyResolver

  constructor(deps: {
    pool: BrowserPoolManager;
    redis: IORedis;
    logger: WorkerLogger;

  }) {
    this.pool = deps.pool;
    this.redis = deps.redis;
    this.logger = deps.logger;
    this.fpGen = new ConsistentFingerprintGenerator()
    this.injector = new ConsistentStealthInjector(deps.logger)
    this.behavior = new HumanBehaviorEngine(deps.logger);
    this.proxy = new ProxyManager(deps.logger);
    this.proxyResolver = new ProxyResolver(deps.logger)

  }

  async run(payload: CampaignJobPayload): Promise<any> {
    const startTime = Date.now()
    let lease: ContextLease | null = null
    let sessionId = ''
    let geoTarget: GeoTarget | null = null

    try {
      // ── 1. Validasi campaign ────────────────────────────
      const campaign = await prismaWorker.campaign.findUnique({
        where: { id: payload.campaignId, deletedAt: null },
        select: {
          todayCount: true,
          dailyLimit: true,
          status: true,
          totalLimit: true,
          totalSessions: true,
          // Phase 3: ambil OS + browser dari campaign config
          os: true,
          osVersion: true,
          browserType: true,
          browserVersion: true,
        },
      })

      if (!campaign) throw new SessionError('CAMPAIGN_NOT_FOUND', 'Campaign tidak ditemukan')
      if (campaign.status === 'cancelled') throw new SessionError('CAMPAIGN_STOPPED', 'Campaign dihentikan')
      if (campaign.todayCount >= campaign.dailyLimit) throw new SessionError('DAILY_LIMIT', 'Daily limit tercapai')
      if (campaign.totalLimit && campaign.totalSessions >= campaign.totalLimit)
        throw new SessionError('TOTAL_LIMIT', 'Total limit tercapai')

      // ── 2. Stop/pause check ─────────────────────────────
      const [stopped, paused] = await Promise.all([
        this.redis.get(`campaign:stop:${payload.campaignId}`),
        this.redis.get(`campaign:pause:${payload.campaignId}`),
      ])
      if (stopped) throw new SessionError('STOPPED', 'Campaign dihentikan')
      if (paused) throw new SessionError('PAUSED', 'Campaign dijeda')

      // ── 3. Pick GEO + proxy ─────────────────────────────
      geoTarget = this.pickGeoTarget(payload.geoTargets)
      const resolvedProxy = await this.proxyResolver.resolve(geoTarget)

      if (!resolvedProxy || !resolvedProxy.id) throw new SessionError('PROXY_RESOLVER_NOT_FOUND', 'Proxy resolver tidak ditemukan')

      // Rotate IP sebelum launch untuk mobile/rotating proxy
      if (resolvedProxy?.rotateUrl) {
        await this.proxyResolver.rotateIfSupported(resolvedProxy)
        // Brief wait setelah rotate agar IP benar-benar berganti
        await new Promise(r => setTimeout(r, 1500))
      }

      this.logger.info('Proxy resolved', {
        source: resolvedProxy?.source ?? 'none',
        type: resolvedProxy?.type,
        country: resolvedProxy?.country ?? geoTarget?.country ?? 'US',
      })

      const proxyUrl = resolvedProxy
        ? this.proxy.buildProxyUrl({
          id: resolvedProxy.id,
          type: resolvedProxy.type,
          host: resolvedProxy.host,
          port: resolvedProxy.port,
          username: resolvedProxy.username,
          password: resolvedProxy.password,
          country: resolvedProxy.country,
        })
        : undefined


      // ── 4. Resolve OS + Browser ─────────────────────────
      // Priority: campaign config → payload → random default
      const targetCountry = geoTarget?.country ?? null
      const executionSource = geoTarget?.proxySource ?? 'none'
      const country = resolvedProxy?.country ?? targetCountry ?? 'US'
      const os: OSType = (campaign.os || payload.os || 'windows') as OSType
      const osVersion = campaign.osVersion || payload.osVersion || '11'
      const compatBrowsers = OS_BROWSER_COMPAT[os]
      const rawBrowser = campaign.browserType || payload.browserType || 'chrome'
      const browser: BrowserType = compatBrowsers.includes(rawBrowser as BrowserType)
        ? rawBrowser as BrowserType
        : compatBrowsers[0] as BrowserType
      const browserVersion = campaign.browserVersion || payload.browserVersion || '120'

      // ── 5. Generate CONSISTENT fingerprint ──────────────
      const fpProfile = this.fpGen.generate({
        os, osVersion, browser, browserVersion, country,
      })

      this.logger.info('Fingerprint generated', {
        os, osVersion, browser, browserVersion,
        gpu: fpProfile.gpu.renderer.slice(0, 40),
        platform: fpProfile.platform,
        screen: `${fpProfile.screen.width}x${fpProfile.screen.height}`,
      })

      // ── 6. Session duration ─────────────────────────────
      const duration = this.randomBetween(payload.minDuration, payload.maxDuration) * 1000

      // ── 7. Create session record ────────────────────────
      const session = await prismaWorker.browserSession.create({
        data: {
          campaignId: payload.campaignId,
          userId: payload.userId,
          proxyId: resolvedProxy?.id ?? null,
          status: 'running',
          mode: 'ephemeral',
          targetUrl: payload.targetUrl,
          userAgent: fpProfile.userAgent,
          targetCountry,
          executionSource,
          country: country,
          creditsUsed: payload.creditsPerSession,
          startedAt: new Date(),
        },
      })
      sessionId = session.id

      await prismaWorker.campaign.update({
        where: { id: payload.campaignId },
        data: { status: 'running' },
      })

      // ── 8. Acquire browser context ──────────────────────
      lease = await this.pool.acquireContext({
        userAgent: fpProfile.userAgent,
        viewport: { width: fpProfile.screen.width, height: fpProfile.screen.height },
        locale: fpProfile.locale.language,
        timezone: fpProfile.timezone,
        proxyUrl,
        geolocation: fpProfile.geolocation,
        extraHttpHeaders: { 'Accept-Language': fpProfile.locale.languages.join(',') },
      })

      // ── 9. Inject consistent fingerprint ────────────────
      await this.injector.injectToContext(lease.context, fpProfile, {
        proxyIp: resolvedProxy?.host,
      })

      // ── 10. Open page ────────────────────────────────────
      const page = await lease.context.newPage()
      await this.injector.injectToPage(page)

      page.setDefaultTimeout(60_000)
      page.setDefaultNavigationTimeout(30_000)

      // ── 11. Navigate ─────────────────────────────────────
      this.logger.info(`Navigating: ${payload.targetUrl}`, { sessionId })
      const response = await page.goto(payload.targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })

      if (!response) throw new SessionError('NAVIGATION_FAILED', 'Gagal membuka halaman')
      if (response.status() === 403) throw new SessionError('BLOCKED_403', 'Akses ditolak (403)')
      if (response.status() >= 500) throw new SessionError('SERVER_ERROR', `Server error (${response.status()})`)

      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => { })

      // ── 12. Behavior simulation ──────────────────────────
      const behaviorProfile = payload.behaviorProfileId
        ? await this.fetchBehaviorProfile(payload.behaviorProfileId)
        : this.defaultBehaviorProfile()

      if (payload.customClickTargets?.length) {
        behaviorProfile.customClickEnabled = true
        behaviorProfile.customClickTargets = payload.customClickTargets as any
      }

      await this.behavior.simulate(page, behaviorProfile, duration)

      // ── 13. Collect metrics ──────────────────────────────
      const scrollDepth = await page.evaluate(() => {
        const h = document.body.scrollHeight - window.innerHeight
        return h > 0 ? Math.round((window.scrollY / h) * 100) : 100
      }).catch(() => 0)
      const ipUsed = await this.detectCurrentIp(page)
      const observedCountry = ipUsed
        ? await this.lookupCountryByIp(ipUsed)
        : undefined
      const analyticsCountry = observedCountry ?? country

      // ── 14. Analytics event ──────────────────────────────
      await prismaWorker.analyticsEvent.create({
        data: {
          campaignId: payload.campaignId,
          sessionId,
          eventType: 'pageview',
          country: analyticsCountry,
          browser: fpProfile.browser,
          os: fpProfile.os,
          deviceType: ['android', 'ios'].includes(os) ? 'mobile' : 'desktop',
          screenSize: `${fpProfile.screen.width}x${fpProfile.screen.height}`,
          duration: Math.round(duration / 1000),
          bounce: scrollDepth < 20,
        },
      })

      // ── 15. Finalize ─────────────────────────────────────
      const durationMs = Date.now() - startTime

      await prismaWorker.$transaction([
        prismaWorker.browserSession.update({
          where: { id: sessionId },
          data: {
            status: 'completed',
            completedAt: new Date(),
            ipUsed,
            observedCountry,
            country: analyticsCountry,
            durationMs: BigInt(durationMs),
            scrollDepth,
          },
        }),
        prismaWorker.campaign.update({
          where: { id: payload.campaignId },
          data: {
            totalSessions: { increment: 1 },
            successCount: { increment: 1 },
            todayCount: { increment: 1 },
          },
        }),
        prismaWorker.trafficLog.create({
          data: {
            campaignId: payload.campaignId,
            sessionId,
            country: analyticsCountry,
            success: true,
            duration: Math.round(durationMs / 1000),
            creditsUsed: payload.creditsPerSession,
          },
        }),
        prismaWorker.subscription.update({
          where: { userId: payload.userId },
          data: {
            creditBalance: { decrement: payload.creditsPerSession },
            creditUsed: { increment: payload.creditsPerSession },
          },
        }),
      ])

      this.logger.info('Session completed', { sessionId, durationMs, scrollDepth })

      return { sessionId, success: true, durationMs }

    } catch (err: any) {
      const code = err instanceof SessionError ? err.code : 'UNKNOWN_ERROR'
      const message = err instanceof SessionError ? err.message : String(err.message ?? err)

      this.logger.error('Session failed', { sessionId, code, message })

      const isExpected = [
        'Daily limit reached',
        'Campaign stopped',
        'Campaign paused',
        'Campaign inactive',
        'Total limit reached',
      ].some(msg => message.includes(msg))

      if (!isExpected) {
        captureSessionError(err, {
          sessionId: sessionId || undefined,
          campaignId: payload.campaignId,
          workerId: process.env.WORKER_ID ?? 'worker-01',
          proxySource: geoTarget?.proxySource,
          country: geoTarget?.country,
          browser: payload.browserType,
          os: payload.os,
        })
      }

      if (sessionId) {
        await prismaWorker.$transaction([
          prismaWorker.browserSession.update({
            where: { id: sessionId },
            data: { status: 'failed', completedAt: new Date(), errorType: code, errorMessage: message, durationMs: BigInt(Date.now() - startTime) },
          }),
          prismaWorker.campaign.update({
            where: { id: payload.campaignId },
            data: { failCount: { increment: 1 } },
          }),
        ]).catch(() => { })
      }

      const noRetry = ['STOPPED', 'PAUSED', 'DAILY_LIMIT', 'TOTAL_LIMIT', 'CAMPAIGN_NOT_FOUND']
      if (!noRetry.includes(code)) throw err

      return { sessionId, success: false, errorType: code }

    } finally {
      if (lease) await this.pool.releaseContext(lease.leaseId).catch(() => { })
    }
  }

  private pickGeoTarget(
    targets: CampaignJobPayload["geoTargets"],
  ): (typeof targets)[0] | null {
    if (!targets?.length) return null
    const total = targets.reduce((s, t) => s + t.weight, 0)
    let rand = Math.random() * total
    for (const t of targets) {
      rand -= t.weight
      if (rand <= 0) return t
    }
    return targets[0] ?? null
  }

  async fetchProxy(proxyPoolId: string) {
    return prismaWorker.proxyPool.findUnique({
      where: { id: proxyPoolId, status: "active" },
      select: {
        id: true,
        type: true,
        host: true,
        port: true,
        username: true,
        password: true,
        country: true,
      },
    });
  }

  private async fetchBehaviorProfile(profileId: string) {
    const p = await prismaWorker.behaviorProfile.findUnique({
      where: { id: profileId },
    });
    if (!p) return this.defaultBehaviorProfile();
    return {
      mouseMovement: p.mouseMovement,
      mouseSpeed: p.mouseSpeed as any,
      scrollEnabled: p.scrollEnabled,
      scrollDepth: p.scrollDepth,
      internalLinkClick: p.internalLinkClick,
      linkClickRate: p.linkClickRate,
      idlePauseEnabled: p.idlePauseEnabled,
      tabSwitching: p.tabSwitching,
      keyboardTyping: p.keyboardTyping,
      customClickEnabled: p.customClickEnabled,
      customClickTargets: (p.customClickTargets as any[]) ?? [],
      customClickOrder: p.customClickOrder as any,
      customClickMaxPerSession: p.customClickMaxPerSession,
      readingSpeed: p.readingSpeed as any,
      attentionSpan: p.attentionSpan,
    };
  }

  private defaultBehaviorProfile() {
    return {
      mouseMovement: true,
      mouseSpeed: "normal" as const,
      scrollEnabled: true,
      scrollDepth: 70,
      internalLinkClick: true,
      linkClickRate: 30,
      idlePauseEnabled: true,
      tabSwitching: false,
      keyboardTyping: false,
      customClickEnabled: false,
      customClickTargets: [],
      customClickOrder: "sequential" as const,
      customClickMaxPerSession: 3,
      readingSpeed: "normal" as const,
      attentionSpan: 60,
    };
  }

  async detectCurrentIp(page: any): Promise<string | undefined> {
    try {
      const res = await page.evaluate(() =>
        fetch("https://api.ipify.org?format=json").then((r) => r.json()),
      );
      return res?.ip;
    } catch {
      return undefined;
    }
  }

  async lookupCountryByIp(ip: string): Promise<string | undefined> {
    try {
      const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return undefined

      const data = await res.json() as {
        success?: boolean
        country_code?: string
      }

      if (data.success === false) return undefined
      return typeof data.country_code === 'string'
        ? data.country_code.toUpperCase()
        : undefined
    } catch {
      return undefined
    }
  }

  hashIp(ip: string): string {
    // Simple hash for privacy — use crypto in production
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
      hash = (hash << 5) - hash + ip.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }

  parseBrowser(ua: string): string {
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Edg")) return "Edge";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Safari")) return "Safari";
    return "Unknown";
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(min + Math.random() * (max - min));
  }
}


class SessionError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "SessionError";
  }
}
