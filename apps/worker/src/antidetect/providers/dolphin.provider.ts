import { BaseAntidetectProvider } from './base.provider.js'

export class DolphinProvider extends BaseAntidetectProvider {
  readonly type = 'dolphin' as const

  private get localUrl(): string {
    const port = this.credentials.apiPort ?? 3001
    return `http://localhost:${port}`
  }

  private readonly CLOUD_URL = 'https://anty-api.com'
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  constructor(credentials: ProviderCredentials) {
    super(credentials)
  }

  // ── Auth: get token dari cloud ────────────────────────────
  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    const apiKey = this.requireApiKey()

    const res = await this.fetchWithTimeout(
      `${this.CLOUD_URL}/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: apiKey }),
      }
    )

    if (!res.token) {
      throw new Error(`Dolphin auth error: ${res.message ?? 'Invalid API key'}`)
    }

    this.accessToken = res.token
    this.tokenExpiry = Date.now() + 60 * 60 * 1000 // 1 jam
    return this.accessToken!
  }

  // ── Health check ──────────────────────────────────────────
  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now()
    try {
      // Check local agent
      const localRes = await this.fetchWithTimeout(
        `${this.localUrl}/v1.0/browser_profiles?limit=1`,
        {
          headers: { 'Authorization': `Bearer ${await this.getToken()}` },
        },
        5_000
      )

      if (localRes.status !== 'success') {
        throw new Error('Dolphin local agent tidak merespon')
      }

      return {
        healthy: true,
        provider: this.type,
        latencyMs: Date.now() - start,
        message: 'Dolphin{anty} local API connected',
      }
    } catch (err: any) {
      return {
        healthy: false,
        provider: this.type,
        message: err.message.includes('fetch')
          ? 'Dolphin{anty} app tidak berjalan. Pastikan sudah diinstall dan running di VPS.'
          : err.message,
      }
    }
  }

  // ── Create profile ────────────────────────────────────────
  async createProfile(config: AntidetectProfileConfig): Promise<AntidetectProfile> {
    const token = await this.getToken()

    // Platform mapping
    const platformMap: Record<string, string> = {
      windows: 'windows', macos: 'macos',
      linux: 'linux', android: 'android', ios: 'ios',
    }

    const body: Record<string, any> = {
      name: config.name,
      platform: platformMap[config.os] ?? 'windows',
      browserType: config.browser === 'firefox' ? 'antyfire' : 'anty',
      mainWebsite: 'none',
      useragent: {
        mode: 'manual',
        value: config.userAgent
          ?? this.buildUserAgent(config.os, config.browser),
      },
      webrtc: {
        mode: 'disabled',  // Disable WebRTC untuk privacy
      },
      canvas: {
        mode: 'noise',     // Canvas noise
      },
      audio: {
        mode: 'noise',     // Audio noise
      },
      webgl: {
        mode: 'noise',
      },
      timezone: {
        mode: config.timezone ? 'manual' : 'auto',
        value: config.timezone ?? '',
      },
      locale: {
        mode: 'manual',
        value: config.language ?? 'en-US',
      },
      geolocation: {
        mode: 'auto',
      },
      screen: {
        mode: 'manual',
        resolution: config.resolution
          ? `${config.resolution.width}x${config.resolution.height}`
          : '1920x1080',
      },
    }

    // Proxy
    if (config.proxyUrl) {
      const proxy = this.parseProxyUrl(config.proxyUrl)
      body.proxy = {
        type: proxy.protocol.includes('socks') ? 'socks5' : 'http',
        host: proxy.host,
        port: proxy.port,
        login: proxy.username ?? '',
        password: proxy.password ?? '',
      }
    }

    const res = await this.fetchWithTimeout(
      `${this.CLOUD_URL}/browser_profiles`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!res.browserProfileId) {
      throw new Error(`Dolphin createProfile error: ${res.message ?? JSON.stringify(res)}`)
    }

    return {
      id: String(res.browserProfileId),
      name: config.name,
      provider: this.type,
      status: 'active',
      createdAt: new Date(),
      meta: res,
    }
  }

  // ── Launch profile → CDP ──────────────────────────────────
  async launchProfile(profileId: string): Promise<LaunchResult> {
    const token = await this.getToken()

    const res = await this.fetchWithTimeout(
      `${this.localUrl}/v1.0/browser_profiles/${profileId}/start?automation=1`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      },
      30_000
    )

    if (res.status !== 'success') {
      throw new Error(`Dolphin launchProfile error: ${res.message}`)
    }

    const port = res.automation?.port
    if (!port) {
      throw new Error('Dolphin: CDP port tidak ditemukan di response')
    }

    const cdpEndpoint = `http://127.0.0.1:${port}`

    return { profileId, cdpEndpoint, port }
  }

  // ── Close profile ─────────────────────────────────────────
  async closeProfile(profileId: string): Promise<void> {
    const token = await this.getToken()
    try {
      await this.fetchWithTimeout(
        `${this.localUrl}/v1.0/browser_profiles/${profileId}/stop`,
        { headers: { 'Authorization': `Bearer ${token}` } },
        10_000
      )
    } catch (err: any) {
      console.warn(`Dolphin closeProfile warning: ${err.message}`)
    }
  }

  // ── Delete profile ────────────────────────────────────────
  async deleteProfile(profileId: string): Promise<void> {
    const token = await this.getToken()
    await this.fetchWithTimeout(
      `${this.CLOUD_URL}/browser_profiles`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: [parseInt(profileId)] }),
      }
    )
  }

  // ── List profiles ─────────────────────────────────────────
  async listProfiles(page = 1, limit = 20): Promise<AntidetectProfile[]> {
    const token = await this.getToken()
    const offset = (page - 1) * limit

    const res = await this.fetchWithTimeout(
      `${this.localUrl}/v1.0/browser_profiles?limit=${limit}&offset=${offset}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )

    return (res.data ?? []).map((p: any) => ({
      id: String(p.id),
      name: p.name,
      provider: this.type,
      status: 'active' as const,
      createdAt: new Date(p.createdAt ?? Date.now()),
      meta: p,
    }))
  }

  // ── Update proxy ──────────────────────────────────────────
  async updateProxy(profileId: string, proxyUrl: string): Promise<void> {
    const token = await this.getToken()
    const proxy = this.parseProxyUrl(proxyUrl)

    await this.fetchWithTimeout(
      `${this.CLOUD_URL}/browser_profiles/${profileId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proxy: {
            type: proxy.protocol.includes('socks') ? 'socks5' : 'http',
            host: proxy.host,
            port: proxy.port,
            login: proxy.username ?? '',
            password: proxy.password ?? '',
          },
        }),
      }
    )
  }
}

