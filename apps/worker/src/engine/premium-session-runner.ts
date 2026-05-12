import type { Redis as IORedis } from "ioredis";
import type { BrowserPoolManager } from './browser-pool.js'
import { AntidetectManager } from '../antidetect/antidetect-manager.js'
import { HumanBehaviorEngine } from '../behavior/behavior-engine.js'
import { ProxyManager } from '../proxy/proxy-manager.js'
import type { WorkerLogger } from '../utils/logger.js'
import type { WorkerReporter } from '../utils/reporter.js'
import type { CampaignJobPayload } from './session-runner.js'
import { prismaWorker } from '@forge-exchange/db'

export interface PremiumJobPayload extends CampaignJobPayload {
  mode: 'premium'
  provider: ProviderType     // gologin | adspower | multilogin | dolphin | nstbrowser
  os: string           // windows | macos | linux | android | ios
  osVersion?: string
  browser: string           // chrome | firefox | safari | edge
  browserVersion?: string
  reuseProfileId?: string        // optional: reuse existing profile
}

export class PremiumSessionRunner {
  private antidetect: AntidetectManager
  private behavior: HumanBehaviorEngine
  private proxy: ProxyManager
  private redis: IORedis
  private logger: WorkerLogger
  private reporter: WorkerReporter

  constructor(deps: {
    pool: BrowserPoolManager
    redis: IORedis
    logger: WorkerLogger
    reporter: WorkerReporter
  }) {
    this.redis = deps.redis
    this.logger = deps.logger
    this.reporter = deps.reporter
    this.antidetect = new AntidetectManager(deps.logger)
    this.behavior = new HumanBehaviorEngine(deps.logger)
    this.proxy = new ProxyManager(deps.logger)
  }

  // ── Main run ──────────────────────────────────────────────
  async run(payload: PremiumJobPayload): Promise<any> {
    const startTime = Date.now()
    let sessionId = ''

    try {
      // ── 1. Validasi campaign ────────────────────────────
      const campaign = await prismaWorker.campaign.findUnique({
        where: { id: payload.campaignId, deletedAt: null },
        select: { todayCount: true, dailyLimit: true, status: true, totalLimit: true, totalSessions: true },
      })

      if (!campaign || campaign.status === 'cancelled') {
        throw new Error('Campaign tidak aktif')
      }
      if (campaign.todayCount >= campaign.dailyLimit) {
        throw new Error('Daily limit tercapai')
      }

      // ── 2. Check stop/pause signal ──────────────────────
      const stopped = await this.redis.get(`campaign:stop:${payload.campaignId}`)
      const paused = await this.redis.get(`campaign:pause:${payload.campaignId}`)
      if (stopped) throw new Error('Campaign dihentikan')
      if (paused) throw new Error('Campaign dijeda')

      // ── 3. Fetch proxy jika ada ─────────────────────────
      let proxyUrl: string | undefined
      const geoTarget = this.pickGeoTarget(payload.geoTargets)

      if (geoTarget?.proxyPoolId) {
        const proxyData = await prismaWorker.proxyPool.findUnique({
          where: { id: geoTarget.proxyPoolId, status: 'active' },
          select: { type: true, host: true, port: true, username: true, password: true },
        })
        if (proxyData) {
          proxyUrl = this.proxy.buildProxyUrl(proxyData as any)
        }
      }

      // ── 4. Create session record ────────────────────────
      const session = await prismaWorker.browserSession.create({
        data: {
          campaignId: payload.campaignId,
          userId: payload.userId,
          status: 'running',
          mode: 'ephemeral',
          targetUrl: payload.targetUrl,
          country: geoTarget?.country ?? null,
          creditsUsed: payload.creditsPerSession,
          startedAt: new Date(),
        },
      })
      sessionId = session.id

      // Update campaign → running
      await prismaWorker.campaign.update({
        where: { id: payload.campaignId },
        data: { status: 'running' },
      })

      // ── 5. Fetch behavior profile ────────────────────────
      const behaviorProfile = payload.behaviorProfileId
        ? await this.fetchBehaviorProfile(payload.behaviorProfileId)
        : this.defaultBehaviorProfile()

      if (payload.customClickTargets?.length) {
        behaviorProfile.customClickEnabled = true
        behaviorProfile.customClickTargets = payload.customClickTargets as any
      }

      // ── 6. Build profile config untuk antidetect ─────────
      const profileConfig = {
        name: `campaign-${payload.campaignId}-${Date.now()}`,
        os: payload.os as any,
        osVersion: payload.osVersion,
        browser: payload.browser as any,
        browserVersion: payload.browserVersion,
        proxyUrl,
        language: this.getLocale(geoTarget?.country),
        timezone: this.getTimezone(geoTarget?.country),
      }

      // ── 7. Run premium session via antidetect ─────────────
      const duration = this.randomBetween(payload.minDuration, payload.maxDuration) * 1000

      await this.antidetect.runPremiumSession(
        {
          campaignId: payload.campaignId,
          userId: payload.userId,
          provider: payload.provider,
          profileConfig,
          reuseProfileId: payload.reuseProfileId,
        },
        // Session callback — jalan setelah browser terbuka
        async (context, page) => {
          // Set extra headers
          await context.setExtraHTTPHeaders({
            'Accept-Language': this.getLocale(geoTarget?.country),
          })

          // Navigate ke target
          this.logger.info(`[Premium] Navigating: ${payload.targetUrl}`, { sessionId })

          const response = await page.goto(payload.targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
          })

          if (!response || response.status() >= 500) {
            throw new Error(`Navigation failed: HTTP ${response?.status()}`)
          }

          await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => { })

          // Human behavior simulation
          this.logger.info(`[Premium] Starting human behavior (${duration}ms)`, { sessionId })
          await this.behavior.simulate(page, behaviorProfile, duration)

          // Analytics event
          await prismaWorker.analyticsEvent.create({
            data: {
              campaignId: payload.campaignId,
              sessionId,
              eventType: 'pageview',
              country: geoTarget?.country ?? null,
              browser: payload.browser,
              os: payload.os,
              deviceType: this.getDeviceType(payload.os),
              duration: Math.round(duration / 1000),
            },
          })
        }
      )

      // ── 8. Finalize ──────────────────────────────────────
      const durationMs = Date.now() - startTime

      await prismaWorker.$transaction([
        prismaWorker.browserSession.update({
          where: { id: sessionId },
          data: {
            status: 'completed',
            completedAt: new Date(),
            durationMs: BigInt(durationMs),
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
            country: geoTarget?.country ?? null,
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

      this.logger.info(`[Premium] Session completed via ${payload.provider}`, {
        sessionId, durationMs,
      })

      return { sessionId, success: true, durationMs, provider: payload.provider }

    } catch (err: any) {
      this.logger.error(`[Premium] Session failed`, {
        sessionId, error: err.message, provider: payload.provider,
      })

      if (sessionId) {
        await prismaWorker.browserSession.update({
          where: { id: sessionId },
          data: {
            status: 'failed',
            completedAt: new Date(),
            durationMs: BigInt(Date.now() - startTime),
            errorMessage: err.message,
          },
        }).catch(() => { })

        await prismaWorker.campaign.update({
          where: { id: payload.campaignId },
          data: { failCount: { increment: 1 } },
        }).catch(() => { })
      }

      throw err
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  private pickGeoTarget(targets: any[]): any {
    if (!targets?.length) return null
    const total = targets.reduce((s, t) => s + t.weight, 0)
    let rand = Math.random() * total
    for (const t of targets) {
      rand -= t.weight
      if (rand <= 0) return t
    }
    return targets[0]
  }

  private async fetchBehaviorProfile(id: string): Promise<any> {
    const p = await prismaWorker.behaviorProfile.findUnique({ where: { id } })
    if (!p) return this.defaultBehaviorProfile()
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
    }
  }

  private defaultBehaviorProfile(): any {
    return {
      mouseMovement: true, mouseSpeed: 'normal',
      scrollEnabled: true, scrollDepth: 70,
      internalLinkClick: true, linkClickRate: 30,
      idlePauseEnabled: true, tabSwitching: false, keyboardTyping: false,
      customClickEnabled: false, customClickTargets: [],
      customClickOrder: 'sequential', customClickMaxPerSession: 3,
      readingSpeed: 'normal', attentionSpan: 60,
    }
  }

  private getLocale(country?: string): string {
    const map: Record<string, string> = {
      US: 'en-US', GB: 'en-GB', DE: 'de-DE', FR: 'fr-FR',
      JP: 'ja-JP', ID: 'id-ID', SG: 'en-SG', AU: 'en-AU',
    }
    return map[country ?? 'US'] ?? 'en-US'
  }

  private getTimezone(country?: string): string {
    const map: Record<string, string> = {
      US: 'America/New_York', GB: 'Europe/London',
      DE: 'Europe/Berlin', FR: 'Europe/Paris',
      JP: 'Asia/Tokyo', ID: 'Asia/Jakarta',
      SG: 'Asia/Singapore', AU: 'Australia/Sydney',
    }
    return map[country ?? 'US'] ?? 'America/New_York'
  }

  private getDeviceType(os: string): string {
    const mobile = ['android', 'ios']
    return mobile.includes(os) ? 'mobile' : 'desktop'
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(min + Math.random() * (max - min))
  }
}
