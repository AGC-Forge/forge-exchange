import { BaseAntidetectProvider } from './base.provider.js'

export class NstbrowserProvider extends BaseAntidetectProvider {
  readonly type = 'nstbrowser' as const

  private readonly API_URL = 'https://api.nstbrowser.io/api'
  private readonly LOCAL_URL = 'http://127.0.0.1:8848'  // Nstbrowser local agent port

  constructor(credentials: ProviderCredentials) {
    super(credentials)
  }

  // ── Health check ──────────────────────────────────────────
  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now()
    try {
      const apiKey = this.requireApiKey()

      // Check local agent
      const localOk = await this.fetchWithTimeout(
        `${this.LOCAL_URL}/status`,
        {},
        5_000
      ).then(() => true).catch(() => false)

      if (!localOk) {
        return {
          healthy: false,
          provider: this.type,
          message: 'Nstbrowser agent tidak berjalan. Pastikan sudah diinstall di VPS.',
        }
      }

      // Check API key valid
      const res = await this.fetchWithTimeout(
        `${this.API_URL}/v1/user/info`,
        {
          headers: { 'x-api-key': apiKey },
        },
        8_000
      )

      return {
        healthy: res.code === 0,
        provider: this.type,
        latencyMs: Date.now() - start,
        message: res.code === 0
          ? `Nstbrowser connected. User: ${res.data?.email ?? 'ok'}`
          : res.msg,
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

    // OS platform mapping
    const platformMap: Record<string, string> = {
      windows: 'Windows', macos: 'Mac OS X',
      linux: 'Linux', android: 'Android', ios: 'iOS',
    }

    const body: Record<string, any> = {
      name: config.name,
      platform: platformMap[config.os] ?? 'Windows',
      kernel: 'chromium',
      kernelMilestone: '120',
      hardwareConcurrency: 4,
      deviceMemory: 8,
      display: config.resolution
        ? `${config.resolution.width}x${config.resolution.height}`
        : '1920x1080',
      // Fingerprint config
      fingerprint: {
        userAgent: config.userAgent
          ?? this.buildUserAgent(config.os, config.browser),
        language: config.language ?? 'en-US',
        timezone: config.timezone ?? 'America/New_York',
      },
      // Privacy settings
      webRTC: 'Disabled',           // WebRTC disabled
      canvas: 'Noise',              // Canvas noise
      webGL: 'Noise',              // WebGL noise
      audioCtx: 'Noise',             // Audio fingerprint noise
      clientHints: true,              // Client Hints sync dengan UA
    }

    // Proxy
    if (config.proxyUrl) {
      const proxy = this.parseProxyUrl(config.proxyUrl)
      body.proxy = {
        type: proxy.protocol.includes('socks') ? 'socks5' : 'http',
        host: proxy.host,
        port: proxy.port,
        username: proxy.username ?? '',
        password: proxy.password ?? '',
      }
    }

    const res = await this.fetchWithTimeout(
      `${this.API_URL}/v1/profile/create`,
      {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (res.code !== 0 || !res.data?.id) {
      throw new Error(`Nstbrowser createProfile error: ${res.msg ?? JSON.stringify(res)}`)
    }

    return {
      id: res.data.id,
      name: config.name,
      provider: this.type,
      status: 'active',
      createdAt: new Date(),
      meta: res.data,
    }
  }

  // ── Launch profile → CDP endpoint ─────────────────────────
  async launchProfile(profileId: string): Promise<LaunchResult> {
    const apiKey = this.requireApiKey()

    // Nstbrowser launch via local agent dengan CDP mode
    const config = {
      once: true,          // ephemeral session
      headless: true,
      autoClose: false,
      remoteDebuggingPort: 0,       // auto-assign port
    }

    const res = await this.fetchWithTimeout(
      `${this.LOCAL_URL}/api/v1/profile/start`,
      {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileId,
          config,
        }),
      },
      30_000
    )

    if (res.code !== 0 || !res.data?.webSocketDebuggerUrl) {
      throw new Error(`Nstbrowser launchProfile error: ${res.msg}`)
    }

    const cdpEndpoint = res.data.webSocketDebuggerUrl
    const port = res.data.port

    return { profileId, cdpEndpoint, port }
  }

  // ── Close profile ─────────────────────────────────────────
  async closeProfile(profileId: string): Promise<void> {
    const apiKey = this.requireApiKey()
    try {
      await this.fetchWithTimeout(
        `${this.LOCAL_URL}/api/v1/profile/close`,
        {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ profileId }),
        },
        10_000
      )
    } catch (err: any) {
      console.warn(`Nstbrowser closeProfile warning: ${err.message}`)
    }
  }

  // ── Delete profile ────────────────────────────────────────
  async deleteProfile(profileId: string): Promise<void> {
    const apiKey = this.requireApiKey()
    const res = await this.fetchWithTimeout(
      `${this.API_URL}/v1/profile/delete`,
      {
        method: 'DELETE',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: [profileId] }),
      }
    )
    if (res.code !== 0) {
      throw new Error(`Nstbrowser deleteProfile error: ${res.msg}`)
    }
  }

  // ── List profiles ─────────────────────────────────────────
  async listProfiles(page = 1, limit = 20): Promise<AntidetectProfile[]> {
    const apiKey = this.requireApiKey()
    const res = await this.fetchWithTimeout(
      `${this.API_URL}/v1/profile/list?page=${page}&pageSize=${limit}`,
      { headers: { 'x-api-key': apiKey } }
    )

    return (res.data?.list ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      provider: this.type,
      status: 'active' as const,
      createdAt: new Date(p.createTime ?? Date.now()),
      meta: p,
    }))
  }

  // ── Update proxy ──────────────────────────────────────────
  async updateProxy(profileId: string, proxyUrl: string): Promise<void> {
    const apiKey = this.requireApiKey()
    const proxy = this.parseProxyUrl(proxyUrl)

    const res = await this.fetchWithTimeout(
      `${this.API_URL}/v1/profile/update`,
      {
        method: 'PUT',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: profileId,
          proxy: {
            type: proxy.protocol.includes('socks') ? 'socks5' : 'http',
            host: proxy.host,
            port: proxy.port,
            username: proxy.username ?? '',
            password: proxy.password ?? '',
          },
        }),
      }
    )

    if (res.code !== 0) {
      throw new Error(`Nstbrowser updateProxy error: ${res.msg}`)
    }
  }
}

