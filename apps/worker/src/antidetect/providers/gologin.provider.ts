import { BaseAntidetectProvider } from './base.provider.js'

export class GoLoginProvider extends BaseAntidetectProvider {
  readonly type = 'gologin' as const

  private glInstance: any = null
  private readonly API_URL = 'https://api.gologin.com'

  constructor(credentials: ProviderCredentials) {
    super(credentials)
  }

  // ── Lazy init SDK ─────────────────────────────────────────
  private async getSDK(): Promise<any> {
    if (this.glInstance) return this.glInstance

    const apiKey = this.requireApiKey()

    // Dynamic import — SDK diinstall di VPS worker
    const { GologinApi } = await import('gologin').catch(() => {
      throw new Error('GoLogin SDK tidak ditemukan. Jalankan: npm install gologin')
    })

    this.glInstance = GologinApi({
      token: apiKey,
      // executablePath is not a valid GologinApiParams property — pass it later via gl.setExecutablePath() if the SDK supports it
    })

    return this.glInstance
  }

  // ── Health check ──────────────────────────────────────────
  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now()
    try {
      const apiKey = this.requireApiKey()
      const res = await this.fetchWithTimeout(
        `${this.API_URL}/browser/v2`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
        8_000
      )

      return {
        healthy: true,
        provider: this.type,
        latencyMs: Date.now() - start,
        message: `Connected. Profiles: ${res.count ?? 'ok'}`,
      }
    } catch (err: any) {
      return {
        healthy: false,
        provider: this.type,
        message: err.message,
      }
    }
  }

  // ── Create profile ────────────────────────────────────────
  async createProfile(config: AntidetectProfileConfig): Promise<AntidetectProfile> {
    const apiKey = this.requireApiKey()

    // Map OS ke GoLogin format
    const osMap: Record<string, string> = {
      windows: 'win', macos: 'mac', linux: 'lin',
      android: 'android', ios: 'ios',
    }

    const browserMap: Record<string, string> = {
      chrome: 'chrome', firefox: 'firefox', safari: 'safari', edge: 'edge',
    }

    const body: Record<string, any> = {
      name: config.name,
      os: osMap[config.os] ?? 'win',
      browserType: browserMap[config.browser] ?? 'chrome',
      navigator: {
        language: config.language ?? 'en-US',
        userAgent: config.userAgent,
        resolution: config.resolution
          ? `${config.resolution.width}x${config.resolution.height}`
          : '1920x1080',
      },
    }

    // Inject proxy jika ada
    if (config.proxyUrl) {
      const proxy = this.parseProxyUrl(config.proxyUrl)
      body.proxy = {
        mode: 'gologin',
        host: proxy.host,
        port: proxy.port,
        username: proxy.username ?? '',
        password: proxy.password ?? '',
        type: proxy.protocol.includes('socks') ? 'socks5' : 'http',
      }
    }

    const res = await this.fetchWithTimeout(
      `${this.API_URL}/browser`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    return {
      id: res.id,
      name: config.name,
      provider: this.type,
      status: 'active',
      createdAt: new Date(),
      meta: res,
    }
  }

  // ── Launch profile → get CDP endpoint ─────────────────────
  async launchProfile(profileId: string): Promise<LaunchResult> {
    const gl = await this.getSDK()

    // Set profile ID
    gl.setProfileId(profileId)

    // Launch browser
    const { wsUrl } = await gl.start()

    if (!wsUrl) {
      throw new Error(`GoLogin: Gagal mendapatkan WebSocket URL untuk profile ${profileId}`)
    }

    return {
      profileId,
      cdpEndpoint: wsUrl,
      wsEndpoint: wsUrl,
    }
  }

  // ── Close profile ─────────────────────────────────────────
  async closeProfile(profileId: string): Promise<void> {
    try {
      const gl = await this.getSDK()
      gl.setProfileId(profileId)
      await gl.stop()
    } catch (err: any) {
      // Log tapi jangan throw — cleanup harus tetap jalan
      console.warn(`GoLogin closeProfile warning: ${err.message}`)
    }
  }

  // ── Delete profile ────────────────────────────────────────
  async deleteProfile(profileId: string): Promise<void> {
    const apiKey = this.requireApiKey()
    await this.fetchWithTimeout(
      `${this.API_URL}/browser/${profileId}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${apiKey}` },
      }
    )
  }

  // ── List profiles ─────────────────────────────────────────
  async listProfiles(page = 1, limit = 20): Promise<AntidetectProfile[]> {
    const apiKey = this.requireApiKey()
    const skip = (page - 1) * limit

    const res = await this.fetchWithTimeout(
      `${this.API_URL}/browser/v2?limit=${limit}&skip=${skip}`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    )

    return (res.profiles ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      provider: this.type,
      status: 'active' as const,
      createdAt: new Date(p.createdAt ?? Date.now()),
      meta: p,
    }))
  }

  // ── Update proxy ──────────────────────────────────────────
  async updateProxy(profileId: string, proxyUrl: string): Promise<void> {
    const apiKey = this.requireApiKey()
    const proxy = this.parseProxyUrl(proxyUrl)

    await this.fetchWithTimeout(
      `${this.API_URL}/browser/${profileId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proxy: {
            mode: 'gologin',
            host: proxy.host,
            port: proxy.port,
            username: proxy.username ?? '',
            password: proxy.password ?? '',
            type: proxy.protocol.includes('socks') ? 'socks5' : 'http',
          },
        }),
      }
    )
  }
}
