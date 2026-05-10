// ============================================================
// Fingerprint Engine — worker/fingerprint/fingerprint-engine.ts
// Generate & inject realistic browser fingerprints
// ============================================================

import { FingerprintGenerator } from "fingerprint-generator";
import { FingerprintInjector } from "fingerprint-injector";
import type { BrowserContext } from "playwright";
import type { WorkerLogger } from "../utils/logger.js";

export interface FingerprintProfile {
  userAgent: string;
  platform: string;
  language: string;
  languages: string[];
  timezone: string;
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  pixelRatio: number;
  hardwareConcurrency: number;
  deviceMemory: number;
  maxTouchPoints: number;
  webgl: Record<string, any>;
  canvas: Record<string, any>;
  fonts: string[];
  plugins: any[];
  audioContext: Record<string, any>;
  geoLat?: number;
  geoLng?: number;
  geoCountry?: string;
  raw: any; // raw fingerprint-generator output
}

export class FingerprintEngine {
  private generator: FingerprintGenerator;
  private injector: FingerprintInjector;
  private logger: WorkerLogger;

  constructor(logger: WorkerLogger) {
    this.generator = new FingerprintGenerator({
      browsers: [{ name: "chrome", minVersion: 110 }],
      devices: ["desktop"],
      operatingSystems: ["windows", "macos", "linux"],
    });
    this.injector = new FingerprintInjector();
    this.logger = logger;
  }

  // ── Generate fingerprint ──────────────────────────────────
  generate(
    opts: {
      deviceType?: "desktop" | "mobile" | "tablet";
      country?: string;
      os?: string[];
    } = {},
  ): FingerprintProfile {
    const deviceType = opts.deviceType ?? "desktop";

    const devices =
      deviceType === "mobile"
        ? ["mobile"]
        : deviceType === "tablet"
          ? ["tablet"]
          : ["desktop"];

    const fp = this.generator.getFingerprint({
      browsers: [{ name: "chrome", minVersion: 110 }],
      devices,
      operatingSystems: (opts.os as any[]) ?? ["windows", "macos"],
      locales: this.getLocalesForCountry(opts.country),
    });

    const { fingerprint } = fp;

    return {
      userAgent: fingerprint.navigator.userAgent,
      platform: fingerprint.navigator.platform,
      language: fingerprint.navigator.language,
      languages: fingerprint.navigator.languages,
      timezone:
        fingerprint.userAgentData?.platform === "macOS"
          ? "America/New_York"
          : this.getTimezoneForCountry(opts.country),
      screenWidth: fingerprint.screen.width,
      screenHeight: fingerprint.screen.height,
      colorDepth: fingerprint.screen.colorDepth,
      pixelRatio: fingerprint.screen.devicePixelRatio ?? 1,
      hardwareConcurrency: fingerprint.navigator.hardwareConcurrency ?? 4,
      deviceMemory: fingerprint.navigator.deviceMemory ?? 8,
      maxTouchPoints: deviceType === "mobile" ? 5 : 0,
      webgl: fingerprint.webGl ?? {},
      canvas: fingerprint.canvas ?? {},
      fonts: fingerprint.fonts ?? [],
      plugins: fingerprint.pluginsData?.plugins ?? [],
      audioContext: fingerprint.audioCodecs ?? {},
      geoCountry: opts.country,
      raw: fingerprint,
    };
  }

  // ── Inject into context ───────────────────────────────────
  async inject(
    context: BrowserContext,
    profile: FingerprintProfile,
  ): Promise<void> {
    try {
      // Use fingerprint-injector to inject all properties
      await this.injector.attachFingerprintToPlaywright(context, {
        fingerprint: profile.raw,
      } as any);

      // Additional manual overrides via addInitScript
      await context.addInitScript(`
        // Override navigator properties
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          get: () => ${profile.hardwareConcurrency}
        });
        Object.defineProperty(navigator, 'deviceMemory', {
          get: () => ${profile.deviceMemory}
        });
        Object.defineProperty(navigator, 'maxTouchPoints', {
          get: () => ${profile.maxTouchPoints}
        });
        Object.defineProperty(navigator, 'platform', {
          get: () => '${profile.platform}'
        });
        Object.defineProperty(navigator, 'languages', {
          get: () => ${JSON.stringify(profile.languages)}
        });

        // Override screen
        Object.defineProperty(screen, 'width',  { get: () => ${profile.screenWidth} });
        Object.defineProperty(screen, 'height', { get: () => ${profile.screenHeight} });
        Object.defineProperty(screen, 'colorDepth', { get: () => ${profile.colorDepth} });
        Object.defineProperty(window, 'devicePixelRatio', { get: () => ${profile.pixelRatio} });
      `);

      this.logger.info("Fingerprint injected", {
        ua: profile.userAgent.slice(0, 50),
        platform: profile.platform,
        screen: `${profile.screenWidth}x${profile.screenHeight}`,
      });
    } catch (err: any) {
      this.logger.warn("Fingerprint injection partial failure", {
        error: err.message,
      });
    }
  }

  // ── Locale helper ─────────────────────────────────────────
  private getLocalesForCountry(country?: string): string[] {
    const map: Record<string, string[]> = {
      US: ["en-US", "en"],
      GB: ["en-GB", "en"],
      DE: ["de-DE", "de"],
      FR: ["fr-FR", "fr"],
      JP: ["ja-JP", "ja"],
      ID: ["id-ID", "id", "en"],
      SG: ["en-SG", "en"],
      AU: ["en-AU", "en"],
      BR: ["pt-BR", "pt"],
      IN: ["en-IN", "hi", "en"],
      NL: ["nl-NL", "nl"],
      CA: ["en-CA", "fr-CA"],
    };
    return map[country ?? "US"] ?? ["en-US", "en"];
  }

  // ── Timezone helper ───────────────────────────────────────
  private getTimezoneForCountry(country?: string): string {
    const map: Record<string, string> = {
      US: "America/New_York",
      GB: "Europe/London",
      DE: "Europe/Berlin",
      FR: "Europe/Paris",
      JP: "Asia/Tokyo",
      ID: "Asia/Jakarta",
      SG: "Asia/Singapore",
      AU: "Australia/Sydney",
      BR: "America/Sao_Paulo",
      IN: "Asia/Kolkata",
      NL: "Europe/Amsterdam",
      CA: "America/Toronto",
    };
    return map[country ?? "US"] ?? "America/New_York";
  }
}
