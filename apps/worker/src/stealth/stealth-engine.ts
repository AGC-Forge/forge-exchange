// ============================================================
// Stealth Engine — worker/stealth/stealth-engine.ts
// Apply playwright-stealth + custom patches ke browser context
// ============================================================

import { chromium, type BrowserContext, type Page } from "playwright";
import { addExtra } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { WorkerLogger } from "../utils/logger.js";

export class StealthEngine {
  private logger: WorkerLogger;

  constructor(logger: WorkerLogger) {
    this.logger = logger;
  }

  // ── Apply semua stealth patches ke context ────────────────
  async applyToContext(context: BrowserContext): Promise<void> {
    await Promise.all([
      this.removeWebdriver(context),
      this.spoofPermissions(context),
      this.maskWebRTC(context),
      this.spoofGPU(context),
      this.spoofBattery(context),
      this.spoofPlugins(context),
      this.spoofSpeechVoices(context),
      this.fixChrome(context),
    ]);
    this.logger.info("Stealth patches applied to context");
  }

  // ── Apply stealth to page (additional per-page patches) ───
  async applyToPage(page: Page): Promise<void> {
    await page.addInitScript(() => {
      // Remove automation indicators on every new page
      delete (window as any).__playwright;
      delete (window as any).__pw_manual;
      delete (window as any).__seleniumTestCapabilities;
      (window as any).__definedTestingFramework = undefined;
    });
  }

  // ── 1. Remove webdriver ───────────────────────────────────
  private async removeWebdriver(context: BrowserContext): Promise<void> {
    await context.addInitScript(() => {
      // navigator.webdriver → undefined
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
        configurable: true,
      });

      // Delete automation traces
      const newProto = navigator.__proto__;
      delete (newProto as any).webdriver;
      navigator.__proto__ = newProto;
    });
  }

  // ── 2. Spoof permissions ──────────────────────────────────
  private async spoofPermissions(context: BrowserContext): Promise<void> {
    await context.addInitScript(() => {
      const originalQuery = window.navigator.permissions.query.bind(
        navigator.permissions,
      );
      (navigator.permissions as any).query = (
        parameters: PermissionDescriptor,
      ) => {
        if (parameters.name === "notifications") {
          return Promise.resolve({
            state: "prompt",
            onchange: null,
          } as PermissionStatus);
        }
        return originalQuery(parameters);
      };
    });
  }

  // ── 3. Mask WebRTC ────────────────────────────────────────
  private async maskWebRTC(context: BrowserContext): Promise<void> {
    await context.addInitScript(() => {
      // Override RTCPeerConnection to prevent IP leak
      const OrigRTC = window.RTCPeerConnection;
      if (!OrigRTC) return;

      function patchedRTC(config?: RTCConfiguration) {
        if (config?.iceServers) {
          config.iceServers = config.iceServers.filter(
            (s) => !("urls" in s && String(s.urls).includes("stun:")),
          );
        }
        return new OrigRTC(config);
      }

      patchedRTC.prototype = OrigRTC.prototype;
      (window as any).RTCPeerConnection = patchedRTC;
      (window as any).webkitRTCPeerConnection = patchedRTC;
    });
  }

  // ── 4. Spoof GPU info ─────────────────────────────────────
  private async spoofGPU(context: BrowserContext): Promise<void> {
    await context.addInitScript(() => {
      const getParam = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (
        parameter: number,
      ) {
        // Spoof UNMASKED_VENDOR_WEBGL & UNMASKED_RENDERER_WEBGL
        if (parameter === 37445) return "Intel Inc.";
        if (parameter === 37446) return "Intel Iris OpenGL Engine";
        return getParam.call(this, parameter);
      };

      // WebGL2
      if (typeof WebGL2RenderingContext !== "undefined") {
        const getParam2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function (
          parameter: number,
        ) {
          if (parameter === 37445) return "Intel Inc.";
          if (parameter === 37446) return "Intel Iris OpenGL Engine";
          return getParam2.call(this, parameter);
        };
      }
    });
  }

  // ── 5. Spoof battery ─────────────────────────────────────
  private async spoofBattery(context: BrowserContext): Promise<void> {
    await context.addInitScript(() => {
      if (!("getBattery" in navigator)) return;
      (navigator as any).getBattery = () =>
        Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 0.87 + Math.random() * 0.1,
          addEventListener: () => {},
          removeEventListener: () => {},
        });
    });
  }

  // ── 6. Spoof plugins ──────────────────────────────────────
  private async spoofPlugins(context: BrowserContext): Promise<void> {
    await context.addInitScript(() => {
      const fakePlugins = [
        {
          name: "Chrome PDF Plugin",
          filename: "internal-pdf-viewer",
          description: "Portable Document Format",
        },
        {
          name: "Chrome PDF Viewer",
          filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
          description: "",
        },
        {
          name: "Native Client",
          filename: "internal-nacl-plugin",
          description: "",
        },
      ];

      Object.defineProperty(navigator, "plugins", {
        get: () => {
          const arr = fakePlugins as any;
          arr.item = (i: number) => fakePlugins[i];
          arr.namedItem = (name: string) =>
            fakePlugins.find((p) => p.name === name);
          arr.refresh = () => {};
          return arr;
        },
      });

      Object.defineProperty(navigator, "mimeTypes", {
        get: () => {
          const mt = [
            {
              type: "application/x-google-chrome-pdf",
              suffixes: "pdf",
              description: "Portable Document Format",
              enabledPlugin: {},
            },
          ] as any;
          mt.item = (i: number) => mt[i];
          mt.namedItem = (t: string) => mt.find((m: any) => m.type === t);
          return mt;
        },
      });
    });
  }

  // ── 7. Spoof speech synthesis voices ──────────────────────
  private async spoofSpeechVoices(context: BrowserContext): Promise<void> {
    await context.addInitScript(() => {
      if (!window.speechSynthesis) return;
      const origGetVoices = window.speechSynthesis.getVoices.bind(
        window.speechSynthesis,
      );
      window.speechSynthesis.getVoices = () => {
        const voices = origGetVoices();
        return voices.length > 0 ? voices : [];
      };
    });
  }

  // ── 8. Fix chrome object ──────────────────────────────────
  private async fixChrome(context: BrowserContext): Promise<void> {
    await context.addInitScript(() => {
      if (!(window as any).chrome) {
        (window as any).chrome = {
          app: {
            isInstalled: false,
            InstallState: {
              DISABLED: "disabled",
              INSTALLED: "installed",
              NOT_INSTALLED: "not_installed",
            },
            RunningState: {
              CANNOT_RUN: "cannot_run",
              READY_TO_RUN: "ready_to_run",
              RUNNING: "running",
            },
          },
          runtime: {
            PlatformOs: {
              MAC: "mac",
              WIN: "win",
              ANDROID: "android",
              CROS: "cros",
              LINUX: "linux",
              OPENBSD: "openbsd",
            },
            PlatformArch: { ARM: "arm", X86_32: "x86-32", X86_64: "x86-64" },
            PlatformNaclArch: {
              ARM: "arm",
              X86_32: "x86-32",
              X86_64: "x86-64",
            },
            RequestUpdateCheckStatus: {
              THROTTLED: "throttled",
              NO_UPDATE: "no_update",
              UPDATE_AVAILABLE: "update_available",
            },
            OnInstalledReason: {
              INSTALL: "install",
              UPDATE: "update",
              CHROME_UPDATE: "chrome_update",
              SHARED_MODULE_UPDATE: "shared_module_update",
            },
            OnRestartRequiredReason: {
              APP_UPDATE: "app_update",
              OS_UPDATE: "os_update",
              PERIODIC: "periodic",
            },
          },
        };
      }
    });
  }
}
