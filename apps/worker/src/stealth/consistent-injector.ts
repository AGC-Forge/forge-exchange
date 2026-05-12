import type { BrowserContext, Page } from 'playwright'
import type { ConsistentProfile } from "@forge-exchange/worker-kit"
import type { WorkerLogger } from '../utils/logger.js'

export class ConsistentStealthInjector {
  private logger: WorkerLogger

  constructor(logger: WorkerLogger) {
    this.logger = logger
  }

  // ── Main inject — apply to context ───────────────────────
  async injectToContext(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
    await Promise.all([
      this.injectNavigator(context, profile),
      this.injectClientHints(context, profile),
      this.injectScreen(context, profile),
      this.injectWebGL(context, profile),
      this.injectWebRTC(context, profile),
      this.injectCanvas(context, profile),
      this.injectAudio(context, profile),
      this.injectBattery(context, profile),
      this.injectChrome(context, profile),
      this.injectPlugins(context, profile),
      this.injectTimezone(context, profile),
      this.injectGeolocation(context, profile),
    ])

    this.logger.info('Consistent stealth patches applied', {
      os: profile.os,
      browser: profile.browser,
      gpu: profile.gpu.renderer.slice(0, 40),
    })
  }

  // ── Apply to page (per-page cleanup) ─────────────────────
  async injectToPage(page: Page): Promise<void> {
    await page.addInitScript(() => {
      // Remove automation markers setiap page load baru
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true,
      })
      // @ts-ignore
      delete window.__playwright
      // @ts-ignore
      delete window.__pw_manual
    })
  }

  // ── 1. Navigator properties ───────────────────────────────
  private async injectNavigator(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
    const {
      userAgent, platform, language, languages,
      hardwareConcurrency, deviceMemory, maxTouchPoints,
    } = profile

    await context.addInitScript(`
      (() => {
        // webdriver → undefined (critical)
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
          configurable: true,
        });

        // platform — sync dengan OS
        Object.defineProperty(navigator, 'platform', {
          get: () => '${platform}',
          configurable: true,
        });

        // language + languages — sync dengan country
        Object.defineProperty(navigator, 'language', {
          get: () => '${language}',
          configurable: true,
        });
        Object.defineProperty(navigator, 'languages', {
          get: () => ${JSON.stringify(languages)},
          configurable: true,
        });

        // hardwareConcurrency — sync dengan OS
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          get: () => ${hardwareConcurrency},
          configurable: true,
        });

        // deviceMemory — sync dengan OS (Chrome only)
        if ('deviceMemory' in navigator) {
          Object.defineProperty(navigator, 'deviceMemory', {
            get: () => ${deviceMemory},
            configurable: true,
          });
        }

        // maxTouchPoints — 0 untuk desktop, 5 untuk mobile
        Object.defineProperty(navigator, 'maxTouchPoints', {
          get: () => ${maxTouchPoints},
          configurable: true,
        });

        // Remove Playwright-specific properties
        const proto = navigator.__proto__;
        delete proto.webdriver;
        navigator.__proto__ = proto;
      })();
    `)
  }

  // ── 2. Client Hints ───────────────────────────────────────
  // KRITIS: ini yang paling sering tidak sync
  private async injectClientHints(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
    const { clientHints } = profile

    // Firefox dan Safari tidak implement UA-CH — skip
    if (['firefox', 'safari'].includes(profile.browser)) return
    if (clientHints.brands.length === 0) return

    await context.addInitScript(`
      (() => {
        const brands          = ${JSON.stringify(clientHints.brands)};
        const mobile          = ${clientHints.mobile};
        const platform        = '${clientHints.platform}';
        const platformVersion = '${clientHints.platformVersion}';
        const architecture    = '${clientHints.architecture}';
        const model           = '${clientHints.model}';
        const uaFullVersion   = '${clientHints.uaFullVersion}';

        // Override navigator.userAgentData (UA-CH API)
        if (navigator.userAgentData) {
          const uaData = {
            brands,
            mobile,
            platform,
            getHighEntropyValues: async (hints) => {
              const result = {};
              hints.forEach(hint => {
                if (hint === 'architecture')    result.architecture    = architecture;
                if (hint === 'model')           result.model           = model;
                if (hint === 'platform')        result.platform        = platform;
                if (hint === 'platformVersion') result.platformVersion = platformVersion;
                if (hint === 'uaFullVersion')   result.uaFullVersion   = uaFullVersion;
                if (hint === 'brands')          result.brands          = brands;
                if (hint === 'mobile')          result.mobile          = mobile;
                if (hint === 'fullVersionList') result.fullVersionList = brands;
              });
              return result;
            },
            toJSON: () => ({ brands, mobile, platform }),
          };

          Object.defineProperty(navigator, 'userAgentData', {
            get: () => uaData,
            configurable: true,
          });
        }
      })();
    `)

    // Set HTTP headers untuk Sec-CH-UA
    const secCHUA = clientHints.brands
      .map(b => `"${b.brand}";v="${b.version}"`)
      .join(', ')

    await context.setExtraHTTPHeaders({
      'Sec-CH-UA': secCHUA,
      'Sec-CH-UA-Mobile': clientHints.mobile ? '?1' : '?0',
      'Sec-CH-UA-Platform': `"${clientHints.platform}"`,
      'Sec-CH-UA-Platform-Version': `"${clientHints.platformVersion}"`,
      'Sec-CH-UA-Arch': `"${clientHints.architecture}"`,
      'Accept-Language': profile.locale.languages.join(','),
    })
  }

  // ── 3. Screen ─────────────────────────────────────────────
  private async injectScreen(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
    const { width, height, colorDepth, pixelRatio } = profile.screen

    await context.addInitScript(`
      (() => {
        const props = {
          width:             ${width},
          height:            ${height},
          availWidth:        ${width},
          availHeight:       ${height - 40},
          colorDepth:        ${colorDepth},
          pixelDepth:        ${colorDepth},
        };

        for (const [key, val] of Object.entries(props)) {
          Object.defineProperty(screen, key, {
            get: () => val,
            configurable: true,
          });
        }

        // window.devicePixelRatio — sync dengan screen dpr
        Object.defineProperty(window, 'devicePixelRatio', {
          get: () => ${pixelRatio},
          configurable: true,
        });

        // innerWidth/Height — viewport (sedikit lebih kecil dari screen)
        Object.defineProperty(window, 'outerWidth',  { get: () => ${width},  configurable: true });
        Object.defineProperty(window, 'outerHeight', { get: () => ${height}, configurable: true });
      })();
    `)
  }

  // ── 4. WebGL — GPU vendor/renderer sync dengan OS ─────────
  private async injectWebGL(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
    const { vendor, renderer } = profile.gpu
    const UNMASKED_VENDOR_WEBGL = 37445
    const UNMASKED_RENDERER_WEBGL = 37446

    await context.addInitScript(`
      (() => {
        const patchWebGL = (ctx) => {
          const origGetParam = ctx.prototype.getParameter.bind(ctx.prototype);
          ctx.prototype.getParameter = function(param) {
            if (param === ${UNMASKED_VENDOR_WEBGL})   return '${vendor}';
            if (param === ${UNMASKED_RENDERER_WEBGL}) return '${renderer}';
            return origGetParam.call(this, param);
          };
        };

        if (typeof WebGLRenderingContext  !== 'undefined') patchWebGL(WebGLRenderingContext);
        if (typeof WebGL2RenderingContext !== 'undefined') patchWebGL(WebGL2RenderingContext);
      })();
    `)
  }

  // ── 5. WebRTC — disable untuk privacy ────────────────────
  private async injectWebRTC(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
    await context.addInitScript(`
      (() => {
        // Override RTCPeerConnection — prevent IP leak
        const OrigRTC = window.RTCPeerConnection;
        if (!OrigRTC) return;

        function PatchedRTC(config) {
          // Strip STUN/TURN servers yang bisa expose real IP
          if (config && config.iceServers) {
            config.iceServers = config.iceServers.filter(s => {
              const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
              return !urls.some(u => u && u.toString().startsWith('stun:'));
            });
          }
          return new OrigRTC(config);
        }
        PatchedRTC.prototype              = OrigRTC.prototype;
        PatchedRTC.generateCertificate    = OrigRTC.generateCertificate?.bind(OrigRTC);
        window.RTCPeerConnection          = PatchedRTC;
        window.webkitRTCPeerConnection    = PatchedRTC;
      })();
    `)
  }

  // ── 6. Canvas — add subtle noise ─────────────────────────
  private async injectCanvas(
    context: BrowserContext,
    _profile: ConsistentProfile,
  ): Promise<void> {
    // Add deterministic noise based on profile seed
    const noiseSeed = Math.floor(Math.random() * 100)

    await context.addInitScript(`
      (() => {
        const seed = ${noiseSeed};

        // Noise function — deterministic per session
        const noise = (x) => ((Math.sin(x * seed) * 10000) % 1) * 0.1;

        // Patch toDataURL
        const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
          const ctx = this.getContext('2d');
          if (ctx) {
            const imgData = ctx.getImageData(0, 0, this.width, this.height);
            for (let i = 0; i < imgData.data.length; i += 4) {
              imgData.data[i]     = Math.min(255, imgData.data[i]     + noise(i));
              imgData.data[i + 1] = Math.min(255, imgData.data[i + 1] + noise(i + 1));
              imgData.data[i + 2] = Math.min(255, imgData.data[i + 2] + noise(i + 2));
            }
            ctx.putImageData(imgData, 0, 0);
          }
          return origToDataURL.call(this, type, quality);
        };

        // Patch getImageData
        const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
          const imgData = origGetImageData.call(this, sx, sy, sw, sh);
          for (let i = 0; i < imgData.data.length; i += 4) {
            imgData.data[i]     = Math.min(255, imgData.data[i]     + noise(i) * 2);
            imgData.data[i + 1] = Math.min(255, imgData.data[i + 1] + noise(i + 1) * 2);
          }
          return imgData;
        };
      })();
    `)
  }

  // ── 7. Audio fingerprint noise ────────────────────────────
  private async injectAudio(
    context: BrowserContext,
    _profile: ConsistentProfile,
  ): Promise<void> {
    const audioNoise = (Math.random() * 0.0001).toFixed(8)

    await context.addInitScript(`
      (() => {
        const origGetChannelData = AudioBuffer.prototype.getChannelData;
        AudioBuffer.prototype.getChannelData = function(channel) {
          const data  = origGetChannelData.call(this, channel);
          const noise = ${audioNoise};
          for (let i = 0; i < data.length; i += 100) {
            data[i] = data[i] + noise * (Math.random() - 0.5);
          }
          return data;
        };
      })();
    `)
  }

  // ── 8. Battery API ────────────────────────────────────────
  private async injectBattery(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
    if (!profile.hasBatteryAPI) {
      // Desktop — remove battery API
      await context.addInitScript(`
        (() => {
          if (navigator.getBattery) {
            navigator.getBattery = undefined;
          }
        })();
      `)
      return
    }

    // Mobile — spoof realistic battery
    const level = (0.75 + Math.random() * 0.2).toFixed(2)
    const charging = Math.random() > 0.5

    await context.addInitScript(`
      (() => {
        navigator.getBattery = () => Promise.resolve({
          charging:         ${charging},
          chargingTime:     ${charging ? Math.floor(Math.random() * 3600) : 'Infinity'},
          dischargingTime:  ${charging ? 'Infinity' : Math.floor(3600 + Math.random() * 7200)},
          level:            ${level},
          addEventListener:    () => {},
          removeEventListener: () => {},
          dispatchEvent:       () => false,
        });
      })();
    `)
  }

  // ── 9. Chrome object ──────────────────────────────────────
  private async injectChrome(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
    // Hanya Chrome-based browsers yang punya window.chrome
    if (!['chrome', 'edge'].includes(profile.browser)) return

    await context.addInitScript(`
      (() => {
        if (window.chrome) return; // sudah ada

        window.chrome = {
          app: {
            isInstalled: false,
            getDetails:  () => null,
            getIsInstalled: () => false,
            installState: () => {},
            runningState: () => {},
          },
          csi:     () => {},
          loadTimes: () => ({
            commitLoadTime:   Date.now() / 1000 - Math.random() * 2,
            connectionInfo:   'h2',
            finishDocumentLoadTime: Date.now() / 1000,
            finishLoadTime:   Date.now() / 1000,
            firstPaintAfterLoadTime: 0,
            firstPaintTime:   Date.now() / 1000 - Math.random(),
            navigationType:   'Other',
            npnNegotiatedProtocol: 'h2',
            requestTime:      Date.now() / 1000 - Math.random() * 3,
            startLoadTime:    Date.now() / 1000 - Math.random() * 3,
            wasAlternateProtocolAvailable: false,
            wasFetchedViaSpdy: true,
            wasNpnNegotiated: true,
          }),
          runtime: {
            PlatformOs: { MAC: 'mac', WIN: 'win', LINUX: 'linux', ANDROID: 'android', CROS: 'cros' },
            PlatformArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64' },
            OnInstalledReason: { INSTALL: 'install', UPDATE: 'update', CHROME_UPDATE: 'chrome_update' },
          },
        };
      })();
    `)
  }

  // ── 10. Plugins (Chrome) ──────────────────────────────────
  private async injectPlugins(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
    // Firefox dan Safari punya plugin list berbeda
    if (profile.browser === 'safari') return

    const plugins = profile.browser === 'firefox'
      ? '[]'
      : JSON.stringify([
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
      ])

    await context.addInitScript(`
      (() => {
        const fakePlugins = ${plugins};
        Object.defineProperty(navigator, 'plugins', {
          get: () => {
            const arr = [...fakePlugins];
            arr.item      = (i) => fakePlugins[i];
            arr.namedItem = (n) => fakePlugins.find(p => p.name === n);
            arr.refresh   = () => {};
            return arr;
          },
          configurable: true,
        });
      })();
    `)
  }

  // ── 11. Timezone ─────────────────────────────────────────
  private async injectTimezone(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
    // Set timezone via context options lebih reliable dari JS inject
    // Tapi tetap patch Intl untuk konsistensi
    await context.addInitScript(`
      (() => {
        const tz = '${profile.timezone}';

        // Patch Date.prototype untuk timezone consistency
        const origDateToString = Date.prototype.toString;
        Date.prototype.toString = function() {
          return origDateToString.call(this);
        };

        // Patch Intl.DateTimeFormat default timezone
        const origDTF = Intl.DateTimeFormat;
        Intl.DateTimeFormat = function(locale, opts = {}) {
          if (!opts.timeZone) opts.timeZone = tz;
          return new origDTF(locale, opts);
        };
        Intl.DateTimeFormat.prototype = origDTF.prototype;
        Intl.DateTimeFormat.supportedLocalesOf = origDTF.supportedLocalesOf;
      })();
    `)
  }

  // ── 12. Geolocation ──────────────────────────────────────
  private async injectGeolocation(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
    const { latitude, longitude, accuracy } = profile.geolocation

    await context.addInitScript(`
      (() => {
        const fakePos = {
          coords: {
            latitude:         ${latitude},
            longitude:        ${longitude},
            accuracy:         ${accuracy},
            altitude:         null,
            altitudeAccuracy: null,
            heading:          null,
            speed:            null,
          },
          timestamp: Date.now(),
        };

        const origGetCurrentPosition = navigator.geolocation?.getCurrentPosition?.bind(navigator.geolocation);
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition = (success, error, opts) => {
            setTimeout(() => success(fakePos), 100 + Math.random() * 200);
          };
          navigator.geolocation.watchPosition = (success) => {
            setTimeout(() => success(fakePos), 100);
            return Math.floor(Math.random() * 1000);
          };
        }
      })();
    `)
  }
}
