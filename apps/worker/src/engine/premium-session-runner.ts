import type { Redis as IORedis } from "ioredis";
import { chromium, type Browser, type BrowserContext } from "playwright";
import { prismaWorker } from "@forge-exchange/db";
import { HumanBehaviorEngine } from "../behavior/behavior-engine.js";
import { ProxyManager } from "../proxy/proxy-manager.js";
import type { WorkerLogger } from "../utils/logger.js";
import { AntidetectProviderFactory } from "@forge-exchange/antidetect/server";
import type {
  AntidetectProfileConfig,
  ProviderCredentials,
  ProviderType,
} from "@forge-exchange/antidetect/server";
import type { CampaignJobPayload } from "./session-runner.js";

export interface PremiumCampaignJobPayload extends CampaignJobPayload {
  mode: "premium";
  provider: ProviderType;
  os: AntidetectProfileConfig["os"];
  osVersion?: string;
  browserType: AntidetectProfileConfig["browser"];
  browserVersion?: string;
  reuseProfileId?: string;
}

function isPremiumCampaignJobPayload(
  payload: CampaignJobPayload | PremiumCampaignJobPayload,
): payload is PremiumCampaignJobPayload {
  return (payload as any)?.mode === "premium";
}

export class PremiumSessionRunner {
  private redis: IORedis;
  private logger: WorkerLogger;
  private behavior: HumanBehaviorEngine;
  private proxy: ProxyManager;

  constructor(deps: { redis: IORedis; logger: WorkerLogger }) {
    this.redis = deps.redis;
    this.logger = deps.logger;
    this.behavior = new HumanBehaviorEngine(deps.logger);
    this.proxy = new ProxyManager(deps.logger);
  }

  async run(payload: CampaignJobPayload | PremiumCampaignJobPayload) {
    if (!isPremiumCampaignJobPayload(payload)) {
      throw new Error("PremiumSessionRunner: payload.mode !== 'premium'");
    }

    const startTime = Date.now();
    let sessionId = "";
    let browser: Browser | null = null;
    let profileIdToDelete: string | null = null;

    try {
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

      if (!campaign) {
        throw new Error("Campaign tidak ditemukan");
      }
      if (campaign.status !== "queued" && campaign.status !== "running") {
        throw new Error("Campaign tidak aktif");
      }
      if (campaign.todayCount >= campaign.dailyLimit) {
        throw new Error("Daily limit tercapai");
      }
      if (campaign.totalLimit && campaign.totalSessions >= campaign.totalLimit) {
        throw new Error("Total limit tercapai");
      }

      const [stopped, paused] = await Promise.all([
        this.redis.get(`campaign:stop:${payload.campaignId}`),
        this.redis.get(`campaign:pause:${payload.campaignId}`),
      ]);
      if (stopped) throw new Error("Campaign dihentikan");
      if (paused) throw new Error("Campaign dijeda");

      const geoTarget = this.pickGeoTarget(payload.geoTargets);
      const proxyData = geoTarget?.proxyPoolId
        ? await prismaWorker.proxyPool.findUnique({
          where: { id: geoTarget.proxyPoolId, status: "active" },
          select: {
            id: true,
            type: true,
            host: true,
            port: true,
            username: true,
            password: true,
            country: true,
          },
        })
        : null;

      const proxyUrl = proxyData
        ? this.proxy.buildProxyUrl({
          id: proxyData.id,
          type: proxyData.type,
          host: proxyData.host,
          port: proxyData.port,
          username: proxyData.username ?? undefined,
          password: proxyData.password ?? undefined,
          country: proxyData.country ?? undefined,
        })
        : undefined;

      const session = await prismaWorker.browserSession.create({
        data: {
          campaignId: payload.campaignId,
          userId: payload.userId,
          proxyId: proxyData?.id ?? null,
          status: "running",
          mode: "multilogin",
          targetUrl: payload.targetUrl,
          country: geoTarget?.country ?? null,
          creditsUsed: payload.creditsPerSession,
          startedAt: new Date(),
        },
      });
      sessionId = session.id;

      await prismaWorker.campaign.update({
        where: { id: payload.campaignId },
        data: { status: "running" },
      });

      const behaviorProfile = payload.behaviorProfileId
        ? await this.fetchBehaviorProfile(payload.behaviorProfileId)
        : this.defaultBehaviorProfile();

      if (payload.customClickTargets?.length) {
        behaviorProfile.customClickEnabled = true;
        behaviorProfile.customClickTargets = payload.customClickTargets;
      }

      const credentials = await this.loadCredentials(payload.userId, payload.provider);
      const provider = AntidetectProviderFactory.create(payload.provider, credentials);

      const profileConfig: AntidetectProfileConfig = {
        name: `campaign-${payload.campaignId}-${Date.now()}`,
        os: payload.os,
        osVersion: payload.osVersion,
        browser: payload.browserType,
        browserVersion: payload.browserVersion,
        proxyUrl,
        language: this.getLocale(geoTarget?.country),
        timezone: this.getTimezone(geoTarget?.country),
      };

      const profileId = payload.reuseProfileId
        ? payload.reuseProfileId
        : (await provider.createProfile(profileConfig)).id;

      if (!payload.reuseProfileId) {
        profileIdToDelete = profileId;
      }

      const launchResult = await provider.launchProfile(profileId);

      browser = await chromium.connectOverCDP(launchResult.cdpEndpoint, {
        timeout: 30_000,
      });

      const contexts = browser.contexts();
      const context: BrowserContext =
        contexts[0] ?? (await browser.newContext());
      const page = context.pages()[0] ?? (await context.newPage());

      await context.setExtraHTTPHeaders({
        "Accept-Language": this.getLocale(geoTarget?.country),
      });

      const durationMs =
        this.randomBetween(payload.minDuration, payload.maxDuration) * 1000;

      this.logger.info(`[Premium] Navigating: ${payload.targetUrl}`, {
        sessionId,
        provider: payload.provider,
      });

      const response = await page.goto(payload.targetUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });

      if (!response || response.status() >= 500) {
        throw new Error(`Navigation failed: HTTP ${response?.status()}`);
      }

      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => { });

      this.logger.info(`[Premium] Starting human behavior (${durationMs}ms)`, {
        sessionId,
      });
      await this.behavior.simulate(page, behaviorProfile, durationMs);

      await browser.close().catch(() => { });
      browser = null;

      await provider.closeProfile(profileId).catch(() => { });

      const totalDurationMs = Date.now() - startTime;

      await prismaWorker.$transaction([
        prismaWorker.browserSession.update({
          where: { id: sessionId },
          data: {
            status: "completed",
            completedAt: new Date(),
            durationMs: BigInt(totalDurationMs),
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
            duration: Math.round(totalDurationMs / 1000),
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
      ]);

      await prismaWorker.analyticsEvent.create({
        data: {
          campaignId: payload.campaignId,
          sessionId,
          eventType: "pageview",
          country: geoTarget?.country ?? null,
          browser: payload.browserType,
          os: payload.os,
          deviceType: this.getDeviceType(payload.os),
          duration: Math.round(totalDurationMs / 1000),
        },
      });

      return {
        sessionId,
        success: true,
        durationMs: totalDurationMs,
        provider: payload.provider,
      };
    } catch (err: any) {
      const message = String(err?.message ?? err);

      this.logger.error("[Premium] Session failed", {
        sessionId,
        provider: (payload as any)?.provider,
        error: message,
      });

      if (browser) {
        await browser.close().catch(() => { });
      }

      if (sessionId) {
        await prismaWorker.browserSession
          .update({
            where: { id: sessionId },
            data: {
              status: "failed",
              completedAt: new Date(),
              durationMs: BigInt(Date.now() - startTime),
              errorMessage: message,
            },
          })
          .catch(() => { });

        await prismaWorker.campaign
          .update({
            where: { id: payload.campaignId },
            data: { failCount: { increment: 1 } },
          })
          .catch(() => { });
      }

      throw err;
    } finally {
      if (profileIdToDelete) {
        try {
          const credentials = await this.loadCredentials(
            (payload as PremiumCampaignJobPayload).userId,
            (payload as PremiumCampaignJobPayload).provider,
          );
          const provider = AntidetectProviderFactory.create(
            (payload as PremiumCampaignJobPayload).provider,
            credentials,
          );
          await provider.deleteProfile(profileIdToDelete);
        } catch { }
      }
    }
  }

  private async loadCredentials(
    userId: string,
    providerType: ProviderType,
  ): Promise<ProviderCredentials> {
    const integration = await prismaWorker.integration.findFirst({
      where: {
        userId,
        type: providerType as any,
        isActive: true,
      },
      select: { credentials: true },
    });

    if (!integration) {
      throw new Error(
        `Integration ${providerType} tidak ditemukan untuk user ${userId}. Tambahkan di Settings → Integrations.`,
      );
    }

    const creds = integration.credentials as Record<string, any>;
    return {
      apiKey: creds.apiKey ?? creds.token ?? undefined,
      apiUrl: creds.apiUrl ?? undefined,
      email: creds.email ?? undefined,
      password: creds.password ?? undefined,
      apiPort: creds.apiPort ? Number(creds.apiPort) : undefined,
    };
  }

  private pickGeoTarget(targets: Array<{ country: string; weight: number; proxyPoolId?: string }>) {
    if (!targets?.length) return null;
    const total = targets.reduce((s, t) => s + t.weight, 0);
    let rand = Math.random() * total;
    for (const t of targets) {
      rand -= t.weight;
      if (rand <= 0) return t;
    }
    return targets[0] ?? null;
  }

  private async fetchBehaviorProfile(id: string) {
    const p = await prismaWorker.behaviorProfile.findUnique({ where: { id } });
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

  private getLocale(country?: string): string {
    const map: Record<string, string> = {
      US: "en-US",
      GB: "en-GB",
      DE: "de-DE",
      FR: "fr-FR",
      JP: "ja-JP",
      ID: "id-ID",
      SG: "en-SG",
      AU: "en-AU",
    };
    return map[country ?? "US"] ?? "en-US";
  }

  private getTimezone(country?: string): string {
    const map: Record<string, string> = {
      US: "America/New_York",
      GB: "Europe/London",
      DE: "Europe/Berlin",
      FR: "Europe/Paris",
      JP: "Asia/Tokyo",
      ID: "Asia/Jakarta",
      SG: "Asia/Singapore",
      AU: "Australia/Sydney",
    };
    return map[country ?? "US"] ?? "America/New_York";
  }

  private getDeviceType(os: string): string {
    return ["android", "ios"].includes(os) ? "mobile" : "desktop";
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(min + Math.random() * (max - min));
  }
}

export function isPremiumJobPayload(
  payload: CampaignJobPayload | PremiumCampaignJobPayload,
): payload is PremiumCampaignJobPayload {
  return isPremiumCampaignJobPayload(payload);
}
