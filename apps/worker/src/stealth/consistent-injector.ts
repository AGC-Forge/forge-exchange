import type { BrowserContext, Page } from 'playwright'
import type { ConsistentProfile } from "@forge-exchange/worker-kit"
import type { WorkerLogger } from '../utils/logger.js'
import { ClientHintsEngine } from './client-hints-engine.js'
import { WebRTCSpoofer } from './webrtc-spoofer.js'
import { CanvasAudioWebGLSpoofer } from './canvas-audio-webgl-spoofer.js'

export class ConsistentStealthInjector {
  private logger: WorkerLogger
  private chEngine: ClientHintsEngine
  private webrtcSpoofer: WebRTCSpoofer
  private cawSpoofer: CanvasAudioWebGLSpoofer

  constructor(logger: WorkerLogger) {
    this.logger = logger
    this.chEngine = new ClientHintsEngine(logger)
    this.webrtcSpoofer = new WebRTCSpoofer(logger)
    this.cawSpoofer = new CanvasAudioWebGLSpoofer(logger)
  }

  async injectToContext(
    context: BrowserContext,
    profile: ConsistentProfile,
    opts?: { proxyIp?: string }
  ): Promise<void> {
    this.chEngine.init(profile)

    const validation = ClientHintsEngine.validate(profile)
    if (!validation.valid) {
      this.logger.warn('ClientHints validation warning', { errors: validation.errors })
    }

    await Promise.all([
      this.injectNavigator(context, profile),
      this.chEngine.applyToContext(context),
      this.injectScreen(context, profile),
      this.webrtcSpoofer.applyToContext(context, profile, {
        mode: "spoof",
        spoofedIp: opts?.proxyIp,
      }),
      this.cawSpoofer.applyToContext(context, profile),
      this.injectBattery(context, profile),
      this.injectChrome(context, profile),
      this.injectPlugins(context, profile),
      this.injectTimezone(context, profile),
      this.injectGeolocation(context, profile),
    ])

    this.logger.info('All stealth patches applied (Phase 3 complete)', {
      os: profile.os,
      browser: profile.browser,
      gpu: profile.gpu.renderer.slice(0, 40),
      screen: `${profile.screen.width}x${profile.screen.height}`,
      chValid: validation.valid,
      webrtcMode: 'spoof',
      proxyIp: opts?.proxyIp ? '***' : 'fake-generated',
    })
  }

  async injectToPage(page: Page, profile?: ConsistentProfile): Promise<void> {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true,
      })
      // @ts-ignore
      delete window.__playwright
      // @ts-ignore
      delete window.__pw_manual
    })

    // Re-inject userAgentData setiap navigasi baru
    if (profile) {
      await this.chEngine.applyToPage(page)
    }
  }

  private async injectNavigator(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
    await context.addInitScript(`
      (() => {
        Object.defineProperty(navigator, 'webdriver',           { get: () => undefined, configurable: true });
        Object.defineProperty(navigator, 'platform',            { get: () => '${profile.platform}', configurable: true });
        Object.defineProperty(navigator, 'language',            { get: () => '${profile.language}', configurable: true });
        Object.defineProperty(navigator, 'languages',           { get: () => ${JSON.stringify(profile.languages)}, configurable: true });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => ${profile.hardwareConcurrency}, configurable: true });
        Object.defineProperty(navigator, 'deviceMemory',        { get: () => ${profile.deviceMemory}, configurable: true });
        Object.defineProperty(navigator, 'maxTouchPoints',      { get: () => ${profile.maxTouchPoints}, configurable: true });
        Object.defineProperty(navigator, 'connection',          { get: () => ({
          rtt: 50, downlink: 10, effectiveType: '4g',
          saveData: false, onchange: null,
          addEventListener: () => {}, removeEventListener: () => {},
        }), configurable: true });
      })();
    `)
  }
  async injectClientHints(
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

  private async injectScreen(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
    const { width, height, colorDepth, pixelRatio } = profile.screen
    await context.addInitScript(`
      (() => {
        Object.defineProperty(screen, 'width',        { get: () => ${width},        configurable: true });
        Object.defineProperty(screen, 'height',       { get: () => ${height},       configurable: true });
        Object.defineProperty(screen, 'availWidth',   { get: () => ${width},        configurable: true });
        Object.defineProperty(screen, 'availHeight',  { get: () => ${height - 40},  configurable: true });
        Object.defineProperty(screen, 'availLeft',    { get: () => 0,               configurable: true });
        Object.defineProperty(screen, 'availTop',     { get: () => 0,               configurable: true });
        Object.defineProperty(screen, 'colorDepth',   { get: () => ${colorDepth},   configurable: true });
        Object.defineProperty(screen, 'pixelDepth',   { get: () => ${colorDepth},   configurable: true });
        Object.defineProperty(window, 'devicePixelRatio', { get: () => ${pixelRatio}, configurable: true });
        Object.defineProperty(screen, 'orientation',  { get: () => ({
          type: '${['android', 'ios'].includes(profile.os) ? 'portrait-primary' : 'landscape-primary'}',
          angle: ${['android', 'ios'].includes(profile.os) ? 0 : 0},
          onchange: null,
          addEventListener: () => {}, removeEventListener: () => {},
        }), configurable: true });
      })();
    `)
  }

  async injectWebGL(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
    const { vendor, renderer } = profile.gpu
    await context.addInitScript(`
      (() => {
        const getParam = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(param) {
          if (param === 37445) return '${vendor}';
          if (param === 37446) return '${renderer}';
          return getParam.call(this, param);
        };
        // WebGL2 juga
        if (window.WebGL2RenderingContext) {
          const getParam2 = WebGL2RenderingContext.prototype.getParameter;
          WebGL2RenderingContext.prototype.getParameter = function(param) {
            if (param === 37445) return '${vendor}';
            if (param === 37446) return '${renderer}';
            return getParam2.call(this, param);
          };
        }
      })();
    `)
  }

  async injectWebRTC(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
    await context.addInitScript(`
      (() => {
        const OrigRTC = window.RTCPeerConnection;
        if (!OrigRTC) return;

        function PatchedRTC(config) {
          if (config && config.iceServers) {
            config.iceServers = config.iceServers.filter(s => {
              const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
              return !urls.some(u => u && u.toString().startsWith('stun:'));
            });
          }
          return new OrigRTC(config);
        }
        PatchedRTC.prototype           = OrigRTC.prototype;
        PatchedRTC.generateCertificate = OrigRTC.generateCertificate?.bind(OrigRTC);
        window.RTCPeerConnection       = PatchedRTC;
        window.webkitRTCPeerConnection = PatchedRTC;
      })();
    `)
  }

  async injectCanvas(
    context: BrowserContext,
    _profile: ConsistentProfile,
  ): Promise<void> {
    const noiseSeed = Math.floor(Math.random() * 100)
    await context.addInitScript(`
      (() => {
        const seed = ${noiseSeed};
        const noise = (x) => ((Math.sin(x * seed) * 10000) % 1) * 0.1;

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

  async injectAudio(
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
  private async injectBattery(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
    if (!profile.hasBatteryAPI) {
      await context.addInitScript(`
        (() => { if (navigator.getBattery) navigator.getBattery = undefined; })();
      `)
      return
    }
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

  private async injectChrome(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
    if (!['chrome', 'edge'].includes(profile.browser)) return
    await context.addInitScript(`
      (() => {
        if (window.chrome) return;
        window.chrome = {
          app: { isInstalled: false, getDetails: () => null, getIsInstalled: () => false, installState: () => {}, runningState: () => {} },
          csi: () => {},
          loadTimes: () => ({
            commitLoadTime: Date.now()/1000 - Math.random()*2, connectionInfo: 'h2',
            finishDocumentLoadTime: Date.now()/1000, finishLoadTime: Date.now()/1000,
            firstPaintAfterLoadTime: 0, firstPaintTime: Date.now()/1000 - Math.random(),
            navigationType: 'Other', npnNegotiatedProtocol: 'h2',
            requestTime: Date.now()/1000 - Math.random()*3, startLoadTime: Date.now()/1000 - Math.random()*3,
            wasAlternateProtocolAvailable: false, wasFetchedViaSpdy: true, wasNpnNegotiated: true,
          }),
          runtime: {
            PlatformOs:        { MAC: 'mac', WIN: 'win', LINUX: 'linux', ANDROID: 'android', CROS: 'cros' },
            PlatformArch:      { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64' },
            OnInstalledReason: { INSTALL: 'install', UPDATE: 'update', CHROME_UPDATE: 'chrome_update' },
          },
        };
      })();
    `)
  }

  private async injectPlugins(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
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

  private async injectGeolocation(
    context: BrowserContext,
    profile: ConsistentProfile,
  ): Promise<void> {
    const { latitude, longitude, accuracy } = profile.geolocation
    await context.addInitScript(`
      (() => {
        if (!navigator.geolocation?.getCurrentPosition) return;
        navigator.geolocation.getCurrentPosition = (success) => {
          success({
            coords: {
              latitude: ${latitude}, longitude: ${longitude}, accuracy: ${accuracy},
              altitude: null, altitudeAccuracy: null, heading: null, speed: null,
            },
            timestamp: Date.now(),
          });
        };
        navigator.geolocation.watchPosition = (success) => {
          success({
            coords: {
              latitude: ${latitude}, longitude: ${longitude}, accuracy: ${accuracy},
              altitude: null, altitudeAccuracy: null, heading: null, speed: null,
            },
            timestamp: Date.now(),
          });
          return 1; // watch ID
        };
        navigator.geolocation.clearWatch = () => {};
      })();
    `)
  }

  getClientHintsEngine(): ClientHintsEngine {
    return this.chEngine
  }

  getWebRTCSpoofer(): WebRTCSpoofer {
    return this.webrtcSpoofer
  }
  getCanvasAudioWebGLSpoofer(): CanvasAudioWebGLSpoofer { return this.cawSpoofer }
}
