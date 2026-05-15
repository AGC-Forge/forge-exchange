import { BaseAntidetectProvider } from './base.provider.js'
import type {
  ProviderCredentials,
  HealthCheckResult,
  AntidetectProfileConfig,
  AntidetectProfile,
  LaunchResult
} from '../types/index.js'

export class MultiloginProvider extends BaseAntidetectProvider {
  readonly type = 'multilogin' as const

  private readonly API_URL = 'https://api.multilogin.com'
  private readonly LOCAL_URL = 'http://127.0.0.1:35000' // Multilogin local agent
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  constructor(credentials: ProviderCredentials) {
    super(credentials)
  }

  // ── Get access token (auto-refresh) ──────────────────────
  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    if (!this.credentials.email || !this.credentials.password) {
      throw new Error('Multilogin: Email dan password wajib diisi di Integrations')
    }

    const res = await this.fetchWithTimeout(
      `${this.API_URL}/user/signin`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.credentials.email,
          password: this.credentials.password,
        }),
      }
    )

    if (!res.token) {
      throw new Error(`Multilogin auth error: ${res.message ?? 'Invalid credentials'}`)
    }

    this.accessToken = res.token
    this.tokenExpiry = Date.now() + 55 * 60 * 1000 // 55 menit (token expire 1 jam)
    return this.accessToken!
  }

  // ── Health check ──────────────────────────────────────────
  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now()
    try {
      // Check local agent dulu
      const localRes = await this.fetchWithTimeout(
        `${this.LOCAL_URL}/status`,
        {},
        5_000
      ).catch(() => null)

      if (!localRes) {
        return {
          healthy: false,
          provider: this.type,
          message: 'Multilogin local agent tidak berjalan. Pastikan Multilogin app sudah diinstall dan running.',
        }
      }

      // Check API credentials
      await this.getToken()

      return {
        healthy: true,
        provider: this.type,
        latencyMs: Date.now() - start,
        message: 'Multilogin connected',
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
    const token = await this.getToken()

    // Map OS ke Multilogin format
    const osMap: Record<string, any> = {
      windows: { type: 'windows', version: config.osVersion ?? '10' },
      macos: { type: 'macos', version: config.osVersion ?? '14' },
      linux: { type: 'linux', version: config.osVersion ?? 'ubuntu' },
      android: { type: 'android', version: config.osVersion ?? '13' },
      ios: { type: 'ios', version: config.osVersion ?? '17' },
    }

    const body: Record<string, any> = {
      name: config.name,
      browser_type: config.browser === 'firefox' ? 'firefox' : 'mimic', // Mimic = Chrome-based
      os_type: osMap[config.os]?.type ?? 'windows',
      core_version: '120',
      navigator: {
        language: config.language ?? 'en-US',
        user_agent: config.userAgent,
        resolution: config.resolution
          ? `${config.resolution.width}x${config.resolution.height}`
          : '1920x1080',
        platform: osMap[config.os]?.type ?? 'Win32',
      },
      storage: {
        local: true,
        extensions: true,
        bookmarks: true,
        history: true,
        passwords: true,
      },
      // WebRTC mode: disabled untuk privacy
      network: {
        mask_public_ip: true,
        fill_based_on_external_ip: config.proxyUrl ? true : false,
      },
      dns: [],
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
      `${this.API_URL}/profile/create`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!res.uuid) {
      throw new Error(`Multilogin createProfile error: ${res.message ?? JSON.stringify(res)}`)
    }

    return {
      id: res.uuid,
      name: config.name,
      provider: this.type,
      status: 'active',
      createdAt: new Date(),
      meta: res,
    }
  }

  // ── Launch profile → CDP via local agent ──────────────────
  async launchProfile(profileId: string): Promise<LaunchResult> {
    // Multilogin launch via local agent (bukan cloud API)
    const res = await this.fetchWithTimeout(
      `${this.LOCAL_URL}/v2/profile/start?automation=true`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getToken()}`,
        },
      },
      30_000
    )

    // Local agent returns CDP port
    if (!res.value) {
      // Try alternative: start dengan profile_id
      const startRes = await this.fetchWithTimeout(
        `${this.LOCAL_URL}/v2/profile/start/${profileId}?automation=true`,
        {
          headers: { 'Authorization': `Bearer ${await this.getToken()}` },
        },
        30_000
      )

      const port = startRes.port ?? startRes.value
      const cdpEndpoint = `http://127.0.0.1:${port}`

      return { profileId, cdpEndpoint, port, provider: this.type }
    }

    return {
      profileId,
      cdpEndpoint: `http://127.0.0.1:${res.value}`,
      port: parseInt(res.value),
      provider: this.type,
    }
  }

  // ── Close profile ─────────────────────────────────────────
  async closeProfile(profileId: string): Promise<void> {
    try {
      await this.fetchWithTimeout(
        `${this.LOCAL_URL}/v2/profile/stop/${profileId}`,
        { headers: { 'Authorization': `Bearer ${await this.getToken()}` } },
        10_000
      )
    } catch (err: any) {
      console.warn(`Multilogin closeProfile warning: ${err.message}`)
    }
  }

  // ── Delete profile ────────────────────────────────────────
  async deleteProfile(profileId: string): Promise<void> {
    const token = await this.getToken()
    await this.fetchWithTimeout(
      `${this.API_URL}/profile/remove`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile_ids: [profileId] }),
      }
    )
  }

  // ── List profiles ─────────────────────────────────────────
  async listProfiles(page = 1, limit = 20): Promise<AntidetectProfile[]> {
    const token = await this.getToken()
    const res = await this.fetchWithTimeout(
      `${this.API_URL}/profile/list?page=${page}&page_size=${limit}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )

    return (res.profiles ?? []).map((p: any) => ({
      id: p.uuid,
      name: p.name,
      provider: this.type,
      status: 'active' as const,
      createdAt: new Date(p.created_at ?? Date.now()),
      meta: p,
    }))
  }

  // ── Update proxy ──────────────────────────────────────────
  async updateProxy(profileId: string, proxyUrl: string): Promise<void> {
    const token = await this.getToken()
    const proxy = this.parseProxyUrl(proxyUrl)

    await this.fetchWithTimeout(
      `${this.API_URL}/profile/update`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uuid: profileId,
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
  }
}
