import type {
  OSType,
  BrowserType,
  ConsistentProfile
} from "@forge-exchange/worker-kit"
import {
  buildUserAgent,
  PLATFORM_MAP,
  CH_PLATFORM_MAP,
  CH_PLATFORM_VERSION,
  GPU_PROFILES,
  SCREEN_PROFILES,
  MAX_TOUCH_POINTS,
  HARDWARE_CONCURRENCY,
  DEVICE_MEMORY,
  HAS_BATTERY_API,
  COUNTRY_LOCALE,
  COUNTRY_TIMEZONE,
  pickRandom,
} from './matrix.js'


export class ConsistentFingerprintGenerator {

  generate(opts: {
    os: OSType
    osVersion: string
    browser: BrowserType
    browserVersion: string
    country?: string
  }): ConsistentProfile {
    const { os, osVersion, browser, browserVersion, country = 'US' } = opts

    // ── 1. User Agent ──────────────────────────────────────
    const userAgent = buildUserAgent(os, osVersion, browser, browserVersion)

    // ── 2. Platform (navigator.platform) ──────────────────
    const platform = PLATFORM_MAP[os]

    // ── 3. Client Hints — fully sync dengan UA ─────────────
    const clientHints = this.buildClientHints(os, osVersion, browser, browserVersion)

    // ── 4. Screen — sesuai OS/device type ─────────────────
    const screenProfile = pickRandom(SCREEN_PROFILES[os])

    // ── 5. GPU — sesuai OS ─────────────────────────────────
    const gpu = pickRandom(GPU_PROFILES[os])

    // ── 6. Hardware — sesuai OS ───────────────────────────
    const hardwareConcurrency = pickRandom(HARDWARE_CONCURRENCY[os])
    const deviceMemory = pickRandom(DEVICE_MEMORY[os])
    const maxTouchPoints = MAX_TOUCH_POINTS[os]
    const hasBatteryAPI = HAS_BATTERY_API[os]
    const hasTouchScreen = ['android', 'ios'].includes(os)

    // ── 7. Locale + Timezone — sesuai country ─────────────
    const locale = COUNTRY_LOCALE[country] ?? COUNTRY_LOCALE.US
    const timezone = COUNTRY_TIMEZONE[country] ?? 'America/New_York'

    // ── 8. Geolocation hint ────────────────────────────────
    const geolocation = this.buildGeoHint(country)

    return {
      os, osVersion, browser, browserVersion,
      userAgent,
      platform,
      language: locale?.language ?? 'en-US',
      languages: locale?.languages ?? [],
      hardwareConcurrency,
      deviceMemory,
      maxTouchPoints,
      clientHints,
      screen: {
        width: screenProfile.width,
        height: screenProfile.height,
        colorDepth: 24,
        pixelRatio: screenProfile.dpr,
      },
      gpu,
      timezone,
      locale: locale as {
        language: string;
        languages: string[];
      },
      geolocation,
      hasBatteryAPI,
      hasTouchScreen,
    }
  }

  // ── Build Client Hints object ─────────────────────────────
  private buildClientHints(
    os: OSType,
    osVersion: string,
    browser: BrowserType,
    browserVersion: string,
  ) {
    const platform = CH_PLATFORM_MAP[os]
    const platformVersion = CH_PLATFORM_VERSION[os]?.[osVersion] ?? '10.0.0'
    const mobile = ['android', 'ios'].includes(os)
    const majorVersion = browserVersion.split('.')[0]

    // Sec-CH-UA brands — berbeda per browser
    let brands: { brand: string; version: string }[] = []

    if (browser === 'chrome' || browser === 'edge') {
      brands = [
        { brand: 'Not_A Brand', version: '8' },
        { brand: 'Chromium', version: majorVersion ?? '0' },
        { brand: browser === 'edge' ? 'Microsoft Edge' : 'Google Chrome', version: majorVersion ?? '0' },
      ]
    } else if (browser === 'firefox') {
      // Firefox tidak implement Client Hints — return empty
      brands = []
    } else if (browser === 'safari') {
      // Safari tidak implement Client Hints — return empty
      brands = []
    }

    return {
      brands,
      mobile,
      platform,
      platformVersion,
      architecture: ['android', 'ios'].includes(os) ? 'arm' : 'x86',
      model: ['android', 'ios'].includes(os) ? this.getMobileModel(os) : '',
      uaFullVersion: `${browserVersion}.0.0.0`,
    }
  }

  // ── Mobile model per OS ───────────────────────────────────
  private getMobileModel(os: OSType): string {
    const androidModels = ['Pixel 7', 'Pixel 6', 'SM-S908B', 'SM-A536B', 'Pixel 7 Pro']
    const iosModels = ['iPhone', 'iPhone']   // iOS tidak expose model di CH
    return os === 'android'
      ? pickRandom(androidModels)
      : pickRandom(iosModels)
  }

  // ── Geolocation hint ──────────────────────────────────────
  private buildGeoHint(country: string): {
    latitude: number; longitude: number; accuracy: number
  } {
    const coords: Record<string, [number, number]> = {
      US: [37.09, -95.71], GB: [55.37, -3.43],
      DE: [51.16, 10.45], FR: [46.22, 2.21],
      JP: [36.20, 138.25], ID: [-0.78, 113.92],
      SG: [1.35, 103.81], AU: [-25.27, 133.77],
      BR: [-14.23, -51.92], IN: [20.59, 78.96],
      NL: [52.13, 5.29], CA: [56.13, -106.34],
    }
    // @ts-ignore
    const [lat, lng] = coords[country] ?? coords.US
    return {
      latitude: lat + (Math.random() - 0.5) * 2,
      longitude: lng + (Math.random() - 0.5) * 2,
      accuracy: Math.floor(10 + Math.random() * 50),
    }
  }
}

// Export singleton
export const fingerprintGenerator = new ConsistentFingerprintGenerator()
