import type { ClientHintsHeaders, ConsistentProfile } from "@forge-exchange/worker-kit"
import type { BrowserContext, Page, Route } from 'playwright'
import type { WorkerLogger } from '../utils/logger.js'

const HIGH_ENTROPY_HINTS = [
  'Sec-CH-UA-Platform-Version',
  'Sec-CH-UA-Arch',
  'Sec-CH-UA-Model',
  'Sec-CH-UA-Full-Version-List',
] as const

export class ClientHintsEngine {
  private logger: WorkerLogger
  private profile: ConsistentProfile | null = null
  private headers: ClientHintsHeaders | null = null

  // Domains yang sudah kirim Accept-CH → kita track & honor
  private acceptCHCache = new Map<string, Set<string>>()

  constructor(logger: WorkerLogger) {
    this.logger = logger
  }

  // ── Initialize dengan profile ─────────────────────────────
  init(profile: ConsistentProfile): void {
    this.profile = profile
    this.headers = this.buildHeaders(profile)
  }

  // ── Apply ke context: intercept semua request ─────────────
  async applyToContext(context: BrowserContext): Promise<void> {
    if (!this.profile || !this.headers) {
      this.logger.warn('ClientHintsEngine: init() belum dipanggil')
      return
    }

    // Firefox & Safari tidak implement UA-CH — skip
    if (['firefox', 'safari'].includes(this.profile.browser)) {
      this.logger.debug('ClientHintsEngine: skip (Firefox/Safari tidak pakai UA-CH)')
      return
    }

    // ── 1. Intercept semua request → inject CH headers ──────
    await context.route('**/*', async (route: Route) => {
      await this.handleRoute(route)
    })

    // ── 2. Intercept response → parse Accept-CH header ──────
    context.on('response', (response) => {
      this.handleResponse(response)
    })

    this.logger.info('ClientHintsEngine: request interceptor aktif', {
      browser: this.profile!.browser,
      platform: this.profile!.clientHints.platform,
    })
  }

  // ── Apply ke page: re-inject JS API setiap navigasi ──────
  async applyToPage(page: Page): Promise<void> {
    if (!this.profile || !this.headers) return
    if (['firefox', 'safari'].includes(this.profile.browser)) return

    await page.addInitScript(this.buildUADataScript(this.profile))
  }

  // ── Handle setiap route request ───────────────────────────
  private async handleRoute(route: Route): Promise<void> {
    const request = route.request()
    const url = new URL(request.url()).hostname
    const resourceType = request.resourceType()

    // Hanya inject ke dokumen & XHR/fetch — skip image, media, dll
    const shouldInject = ['document', 'xhr', 'fetch', 'script'].includes(resourceType)

    if (!shouldInject || !this.headers) {
      await route.continue()
      return
    }

    // Ambil hints spesifik yang diminta domain ini (dari Accept-CH cache)
    const requestedHints = this.acceptCHCache.get(url) ?? new Set()
    const extraHeaders = this.buildRequestHeaders(requestedHints)

    try {
      await route.continue({
        headers: {
          ...request.headers(),
          ...extraHeaders,
        },
      })
    } catch {
      // Route mungkin sudah ter-abort, abaikan
      try { await route.continue() } catch { /* noop */ }
    }
  }

  // ── Parse Accept-CH dari response server ──────────────────
  private handleResponse(response: any): void {
    try {
      const headers = response.headers() as Record<string, string>
      const acceptCH = headers['accept-ch'] ?? headers['Accept-CH']
      if (!acceptCH) return

      const url = new URL(response.url()).hostname
      const requestedHints = new Set(
        acceptCH.split(',').map((h: string) => h.trim())
      )

      this.acceptCHCache.set(url, requestedHints)

      this.logger.debug('ClientHintsEngine: server minta hints', {
        domain: url,
        hints: [...requestedHints],
      })
    } catch {
      // URL tidak valid, abaikan
    }
  }

  // ── Build headers set lengkap ─────────────────────────────
  private buildHeaders(profile: ConsistentProfile): ClientHintsHeaders {
    const { clientHints, locale } = profile

    // Sec-CH-UA brands string: "Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"
    const secCHUA = clientHints.brands
      .map(b => `"${b.brand}";v="${b.version}"`)
      .join(', ')

    // Full version list sama dengan brands (untuk Sec-CH-UA-Full-Version-List)
    const fullVersionList = clientHints.brands
      .map(b => `"${b.brand}";v="${b.version}.0.0.0"`)
      .join(', ')

    return {
      'Sec-CH-UA': secCHUA,
      'Sec-CH-UA-Mobile': clientHints.mobile ? '?1' : '?0',
      'Sec-CH-UA-Platform': `"${clientHints.platform}"`,
      'Sec-CH-UA-Platform-Version': `"${clientHints.platformVersion}"`,
      'Sec-CH-UA-Arch': `"${clientHints.architecture}"`,
      'Sec-CH-UA-Model': `"${clientHints.model}"`,
      'Sec-CH-UA-Full-Version-List': fullVersionList,
      'Accept-Language': locale.languages.join(','),
    }
  }

  // ── Build headers berdasarkan apa yang diminta server ─────
  // Low-entropy hints selalu dikirim, high-entropy hanya jika diminta
  private buildRequestHeaders(requestedHints: Set<string>): Record<string, string> {
    if (!this.headers) return {}

    // Low-entropy: selalu kirim
    const result: Record<string, string> = {
      'Sec-CH-UA': this.headers['Sec-CH-UA'],
      'Sec-CH-UA-Mobile': this.headers['Sec-CH-UA-Mobile'],
      'Sec-CH-UA-Platform': this.headers['Sec-CH-UA-Platform'],
      'Accept-Language': this.headers['Accept-Language'],
    }

    // High-entropy: hanya kirim jika server sudah request via Accept-CH
    for (const hint of HIGH_ENTROPY_HINTS) {
      if (requestedHints.has(hint)) {
        result[hint] = this.headers[hint as keyof ClientHintsHeaders]
      }
    }

    return result
  }

  // ── Build JS script untuk override navigator.userAgentData ─
  private buildUADataScript(profile: ConsistentProfile): string {
    const { clientHints } = profile
    const { brands, mobile, platform, platformVersion, architecture, model, uaFullVersion } = clientHints

    return `
      (() => {
        const brands          = ${JSON.stringify(brands)};
        const mobile          = ${mobile};
        const platform        = ${JSON.stringify(platform)};
        const platformVersion = ${JSON.stringify(platformVersion)};
        const architecture    = ${JSON.stringify(architecture)};
        const model           = ${JSON.stringify(model)};
        const uaFullVersion   = ${JSON.stringify(uaFullVersion)};

        const fullVersionList = brands.map(b => ({
          brand:   b.brand,
          version: b.version + '.0.0.0',
        }));

        const uaData = {
          brands,
          mobile,
          platform,

          // getHighEntropyValues — versi lengkap seperti real Chrome
          getHighEntropyValues: (hints) => {
            const result = { brands, mobile, platform };
            const hintSet = new Set(hints);

            if (hintSet.has('architecture'))    result.architecture    = architecture;
            if (hintSet.has('model'))           result.model           = model;
            if (hintSet.has('platformVersion')) result.platformVersion = platformVersion;
            if (hintSet.has('uaFullVersion'))   result.uaFullVersion   = uaFullVersion;
            if (hintSet.has('fullVersionList')) result.fullVersionList = fullVersionList;
            if (hintSet.has('wow64'))           result.wow64           = false;
            if (hintSet.has('bitness'))         result.bitness         = '64';

            return Promise.resolve(result);
          },

          toJSON: () => ({ brands, mobile, platform }),
        };

        // Freeze agar tidak bisa di-overwrite deteksi bot
        Object.freeze(uaData);

        Object.defineProperty(navigator, 'userAgentData', {
          get: () => uaData,
          configurable: false, // block override
        });
      })();
    `
  }

  // ── Validate konsistensi headers vs UA ────────────────────
  static validate(profile: ConsistentProfile): ValidationResult {
    const errors: string[] = []
    const { clientHints, userAgent, browser, os } = profile

    // 1. Firefox/Safari tidak boleh punya brands
    if (['firefox', 'safari'].includes(browser) && clientHints.brands.length > 0) {
      errors.push(`Browser ${browser} tidak seharusnya punya UA-CH brands`)
    }

    // 2. Chrome/Edge harus punya brands
    if (['chrome', 'edge'].includes(browser) && clientHints.brands.length === 0) {
      errors.push(`Browser ${browser} harus punya UA-CH brands`)
    }

    // 3. Mobile flag harus sesuai OS
    const shouldBeMobile = ['android', 'ios'].includes(os)
    if (clientHints.mobile !== shouldBeMobile) {
      errors.push(`mobile flag tidak sesuai OS: expected ${shouldBeMobile}, got ${clientHints.mobile}`)
    }

    // 4. Platform harus match OS
    const platformMap: Record<string, string> = {
      windows: 'Windows', macos: 'macOS', linux: 'Linux',
      android: 'Android', ios: 'iOS',
    }
    const expectedPlatform = platformMap[os]
    if (clientHints.platform !== expectedPlatform) {
      errors.push(`platform tidak match OS: expected "${expectedPlatform}", got "${clientHints.platform}"`)
    }

    // 5. UA string harus contain browser name
    const uaBrowserMap: Record<string, string[]> = {
      chrome: ['Chrome', 'CriOS'],
      edge: ['Edg'],
      firefox: ['Firefox'],
      safari: ['Safari', 'Version'],
    }
    const uaSignatures = uaBrowserMap[browser] ?? []
    const uaMatch = uaSignatures.some(sig => userAgent.includes(sig))
    if (!uaMatch) {
      errors.push(`UA string tidak cocok dengan browser ${browser}: "${userAgent.slice(0, 80)}"`)
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  // ── Getter untuk debug ────────────────────────────────────
  getHeaders(): ClientHintsHeaders | null {
    return this.headers
  }

  getAcceptCHCache(): Map<string, Set<string>> {
    return this.acceptCHCache
  }

  clearCache(): void {
    this.acceptCHCache.clear()
  }
}

// ── Tipe hasil validasi ───────────────────────────────────────
export interface ValidationResult {
  valid: boolean
  errors: string[]
}
