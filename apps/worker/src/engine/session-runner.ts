// ── Shared session/job types (duplicated here to avoid cross-app import) ──
export interface GeoTarget {
  country: string
  proxyPoolId?: string
  weight: number
}
export interface CustomClickTarget {
  selector: string
  clickRate: number
  waitBefore: number
  waitAfter: number
}
export interface CampaignJobPayload {
  campaignId: string
  userId: string
  targetUrl: string
  deviceType: string
  minDuration: number
  maxDuration: number
  geoTargets: GeoTarget[]
  behaviorProfileId?: string
  customClickTargets?: CustomClickTarget[]
  creditsPerSession: number
}

import type { Redis as IORedis } from "ioredis";
import type { BrowserPoolManager, ContextLease } from "./browser-pool.js";
import { FingerprintEngine } from "../fingerprint/fingerprint-engine.js";
import { StealthEngine } from "../stealth/stealth-engine.js";
import { HumanBehaviorEngine } from "../behavior/behavior-engine.js";
import { ProxyManager } from "../proxy/proxy-manager.js";
import type { WorkerLogger } from "../utils/logger.js";
import type { WorkerReporter } from "../utils/reporter.js";
import { prismaWorker } from '@forge-exchange/db'

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
  private reporter: WorkerReporter;
  private fingerprint: FingerprintEngine;
  private stealth: StealthEngine;
  private behavior: HumanBehaviorEngine;
  private proxy: ProxyManager;

  constructor(deps: {
    pool: BrowserPoolManager;
    redis: IORedis;
    logger: WorkerLogger;
    reporter: WorkerReporter;
  }) {
    this.pool = deps.pool;
    this.redis = deps.redis;
    this.logger = deps.logger;
    this.reporter = deps.reporter;
    this.fingerprint = new FingerprintEngine(deps.logger);
    this.stealth = new StealthEngine(deps.logger);
    this.behavior = new HumanBehaviorEngine(deps.logger);
    this.proxy = new ProxyManager(deps.logger);
  }

  // ── Main run ──────────────────────────────────────────────
  async run(payload: CampaignJobPayload): Promise<SessionResult> {
    const startTime = Date.now();
    let lease: ContextLease | null = null;
    let sessionId = "";

    try {
      // ── 1. Check daily limit ────────────────────────────
      const campaign = await prismaWorker.campaign.findUnique({
        where: { id: payload.campaignId },
        select: {
          todayCount: true,
          dailyLimit: true,
          status: true,
          totalLimit: true,
          totalSessions: true,
        },
      });

      if (!campaign)
        throw new SessionError(
          "CAMPAIGN_NOT_FOUND",
          "Campaign tidak ditemukan",
        );
      if (campaign.status !== "queued" && campaign.status !== "running") {
        throw new SessionError("CAMPAIGN_STOPPED", "Campaign tidak aktif");
      }
      if (campaign.todayCount >= campaign.dailyLimit) {
        throw new SessionError("DAILY_LIMIT", "Daily limit tercapai");
      }
      if (
        campaign.totalLimit &&
        campaign.totalSessions >= campaign.totalLimit
      ) {
        throw new SessionError("TOTAL_LIMIT", "Total limit tercapai");
      }

      // ── 2. Check stop/pause signals ─────────────────────
      const [stopped, paused] = await Promise.all([
        this.redis.get(`campaign:stop:${payload.campaignId}`),
        this.redis.get(`campaign:pause:${payload.campaignId}`),
      ]);
      if (stopped) throw new SessionError("STOPPED", "Campaign dihentikan");
      if (paused) throw new SessionError("PAUSED", "Campaign dijeda");

      // ── 3. Pick GEO + proxy ─────────────────────────────
      const geoTarget = this.pickGeoTarget(payload.geoTargets);
      const proxyData = geoTarget?.proxyPoolId
        ? await this.fetchProxy(geoTarget.proxyPoolId)
        : null;

      // ── 4. Generate fingerprint ─────────────────────────
      const fpProfile = this.fingerprint.generate({
        deviceType: payload.deviceType as any,
        country: geoTarget?.country,
      });

      // ── 5. Calculate session duration ───────────────────
      const duration =
        this.randomBetween(payload.minDuration, payload.maxDuration) * 1000;

      // ── 6. Create session record in DB ──────────────────
      const session = await prismaWorker.browserSession.create({
        data: {
          campaignId: payload.campaignId,
          userId: payload.userId,
          proxyId: proxyData?.id ?? null,
          status: "running",
          mode: "ephemeral",
          targetUrl: payload.targetUrl,
          userAgent: fpProfile.userAgent,
          country: geoTarget?.country ?? null,
          creditsUsed: payload.creditsPerSession,
          startedAt: new Date(),
        },
      });
      sessionId = session.id;

      // Update campaign status → running
      await prismaWorker.campaign.update({
        where: { id: payload.campaignId },
        data: { status: "running" },
      });

      // ── 7. Acquire browser context ──────────────────────
      const geoHint = this.proxy.getGeoHint(geoTarget?.country);

      lease = await this.pool.acquireContext({
        engine: "chromium",
        proxyUrl: proxyData ? this.proxy.buildProxyUrl(proxyData) : undefined,
        userAgent: fpProfile.userAgent,
        viewport: {
          width: fpProfile.screenWidth,
          height: fpProfile.screenHeight,
        },
        locale: fpProfile.language,
        timezone: fpProfile.timezone,
        geolocation: geoHint,
      });

      // ── 8. Inject fingerprint ───────────────────────────
      await this.fingerprint.inject(lease.context, fpProfile);

      // ── 9. Apply stealth ────────────────────────────────
      await this.stealth.applyToContext(lease.context);

      // ── 10. Open page ────────────────────────────────────
      const page = await lease.context.newPage();
      await this.stealth.applyToPage(page);

      // Set browser timeout
      page.setDefaultTimeout(60_000);
      page.setDefaultNavigationTimeout(30_000);

      // ── 11. Navigate to target ───────────────────────────
      this.logger.info(`Navigating to: ${payload.targetUrl}`, { sessionId });

      const response = await page.goto(payload.targetUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });

      if (!response)
        throw new SessionError(
          "NAVIGATION_FAILED",
          "Halaman tidak bisa dibuka",
        );

      const status = response.status();
      if (status === 403)
        throw new SessionError("BLOCKED_403", "Akses ditolak (403)");
      if (status === 404)
        throw new SessionError(
          "NOT_FOUND_404",
          "Halaman tidak ditemukan (404)",
        );
      if (status >= 500)
        throw new SessionError("SERVER_ERROR", `Server error (${status})`);

      // Wait for page to be reasonably loaded
      await page
        .waitForLoadState("networkidle", { timeout: 10_000 })
        .catch(() => { });

      // ── 12. Get actual IP (if no proxy, skip) ────────────
      let ipUsed: string | undefined;
      if (proxyData) {
        ipUsed = await this.detectCurrentIp(page).catch(() => undefined);
      }

      // ── 13. Fetch behavior profile ───────────────────────
      const behaviorProfile = payload.behaviorProfileId
        ? await this.fetchBehaviorProfile(payload.behaviorProfileId)
        : this.defaultBehaviorProfile();

      // Inject custom click targets from payload
      if (payload.customClickTargets?.length) {
        behaviorProfile.customClickEnabled = true;
        behaviorProfile.customClickTargets = payload.customClickTargets;
      }

      // ── 14. Run human behavior ───────────────────────────
      this.logger.info("Starting human behavior simulation", {
        sessionId,
        duration,
      });
      await this.behavior.simulate(page, behaviorProfile, duration);

      // ── 15. Collect metrics ──────────────────────────────
      const pagesVisited = 1; // increment if internal links clicked
      const scrollDepth = await page
        .evaluate(() => {
          const h = document.body.scrollHeight - window.innerHeight;
          return h > 0 ? Math.round((window.scrollY / h) * 100) : 100;
        })
        .catch(() => 0);

      // ── 16. Store analytics event ─────────────────────────
      await prismaWorker.analyticsEvent.create({
        data: {
          campaignId: payload.campaignId,
          sessionId: sessionId,
          eventType: "pageview",
          country: geoTarget?.country ?? null,
          browser: this.parseBrowser(fpProfile.userAgent),
          os: fpProfile.platform,
          deviceType: payload.deviceType,
          screenSize: `${fpProfile.screenWidth}x${fpProfile.screenHeight}`,
          duration: Math.round(duration / 1000),
          bounce: scrollDepth < 20,
          ipHash: ipUsed ? this.hashIp(ipUsed) : null,
        },
      });

      // ── 17. Finalize session ─────────────────────────────
      const durationMs = Date.now() - startTime;

      await prismaWorker.$transaction([
        // Update session record
        prismaWorker.browserSession.update({
          where: { id: sessionId },
          data: {
            status: "completed",
            completedAt: new Date(),
            durationMs: BigInt(durationMs),
            pagesVisited,
            scrollDepth,
            ipUsed: ipUsed ?? null,
          },
        }),
        // Increment campaign counters
        prismaWorker.campaign.update({
          where: { id: payload.campaignId },
          data: {
            totalSessions: { increment: 1 },
            successCount: { increment: 1 },
            todayCount: { increment: 1 },
          },
        }),
        // Traffic log
        prismaWorker.trafficLog.create({
          data: {
            campaignId: payload.campaignId,
            sessionId: sessionId,
            ipHash: ipUsed ? this.hashIp(ipUsed) : null,
            country: geoTarget?.country ?? null,
            success: true,
            duration: Math.round(durationMs / 1000),
            creditsUsed: payload.creditsPerSession,
          },
        }),
        // Deduct credits
        prismaWorker.subscription.update({
          where: { userId: payload.userId },
          data: {
            creditBalance: { decrement: payload.creditsPerSession },
            creditUsed: { increment: payload.creditsPerSession },
          },
        }),
        prismaWorker.creditLog.create({
          data: {
            userId: payload.userId,
            amount: payload.creditsPerSession,
            type: "debit",
            source: "session",
            sourceId: sessionId,
            description: `Session campaign: ${payload.campaignId}`,
            balanceBefore: BigInt(0), // updated by trigger/service
            balanceAfter: BigInt(0),
          },
        }),
      ]);

      this.logger.info("Session completed successfully", {
        sessionId,
        durationMs,
        pagesVisited,
        scrollDepth,
      });

      return {
        sessionId,
        campaignId: payload.campaignId,
        success: true,
        durationMs,
        pagesVisited,
        creditsUsed: payload.creditsPerSession,
        ipUsed,
      };
    } catch (err: any) {
      const isSessionError = err instanceof SessionError;
      const errorType = isSessionError ? err.code : "UNKNOWN_ERROR";
      const errorMessage = isSessionError
        ? err.message
        : String(err.message ?? err);

      this.logger.error("Session failed", {
        sessionId,
        errorType,
        errorMessage,
      });

      // Update session as failed
      if (sessionId) {
        await prisma
          .$transaction([
            prismaWorker.browserSession.update({
              where: { id: sessionId },
              data: {
                status: "failed",
                completedAt: new Date(),
                durationMs: BigInt(Date.now() - startTime),
                errorType,
                errorMessage,
              },
            }),
            prismaWorker.campaign.update({
              where: { id: payload.campaignId },
              data: { failCount: { increment: 1 } },
            }),
          ])
          .catch(() => { });
      }

      // Rethrow so BullMQ can retry (unless it's a stop/limit signal)
      const noRetry = [
        "STOPPED",
        "PAUSED",
        "DAILY_LIMIT",
        "TOTAL_LIMIT",
        "CAMPAIGN_NOT_FOUND",
      ];
      if (!noRetry.includes(errorType)) {
        throw err;
      }

      return {
        sessionId,
        campaignId: payload.campaignId,
        success: false,
        durationMs: Date.now() - startTime,
        pagesVisited: 0,
        creditsUsed: 0,
        errorType,
        errorMessage,
      };
    } finally {
      // Always release context
      if (lease) {
        await this.pool.releaseContext(lease.leaseId).catch(() => { });
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  private pickGeoTarget(
    targets: CampaignJobPayload["geoTargets"],
  ): (typeof targets)[0] | null {
    if (!targets.length) return null;

    // Weighted random selection
    const totalWeight = targets.reduce((sum, t) => sum + t.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const target of targets) {
      rand -= target.weight;
      if (rand <= 0) return target;
    }

    return targets[0];
  }

  private async fetchProxy(proxyPoolId: string) {
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

  private async detectCurrentIp(page: any): Promise<string | undefined> {
    try {
      const res = await page.evaluate(() =>
        fetch("https://api.ipify.org?format=json").then((r) => r.json()),
      );
      return res?.ip;
    } catch {
      return undefined;
    }
  }

  private hashIp(ip: string): string {
    // Simple hash for privacy — use crypto in production
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
      hash = (hash << 5) - hash + ip.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }

  private parseBrowser(ua: string): string {
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

// ── Custom error ──────────────────────────────────────────────
class SessionError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "SessionError";
  }
}
