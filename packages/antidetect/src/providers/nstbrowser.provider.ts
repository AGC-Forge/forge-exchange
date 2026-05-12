import { BaseAntidetectProvider } from './base.provider.js'
import type {
  ProviderCredentials,
  HealthCheckResult,
  AntidetectProfileConfig,
  AntidetectProfile,
  LaunchResult
} from '../types/index.js'

export class NstbrowserProvider extends BaseAntidetectProvider {
  readonly type = 'nstbrowser' as const
  private get localUrl(): string {
    const port = this.credentials.apiPort ?? 8848
    return `http://127.0.0.1:${port}`
  }

  constructor(credentials: ProviderCredentials) {
    super(credentials)
  }

  private get headers(): HeadersInit {
    return {
      'x-api-key': this.requireApiKey(),
      'Content-Type': 'application/json',
    }
  }
  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now()
    try {
      // API v2: check local app status
      const res = await this.fetchWithTimeout(
        `${this.localUrl}/api/v2/browser/list?page=1&pageSize=1`,
        { headers: this.headers },
        5_000
      )

      if (res.code !== 0) {
        throw new Error(res.msg ?? 'Nstbrowser API error')
      }

      return {
        healthy: true,
        provider: this.type,
        latencyMs: Date.now() - start,
        message: `Nstbrowser connected. Total profiles: ${res.data?.total ?? 'ok'}`,
      }
    } catch (err: any) {
      const isConnRefused =
        err.message.includes('ECONNREFUSED') ||
        err.message.includes('fetch') ||
        err.message.includes('timeout')

      return {
        healthy: false,
        provider: this.type,
        message: isConnRefused
          ? `Nstbrowser app not running on port ${this.localUrl.split(':')[2]}. ` +
          `Pastikan Nstbrowser is installed and running on VPS.`
          : err.message,
      }
    }
  }
  async createProfile(config: AntidetectProfileConfig): Promise<AntidetectProfile> {
    // Platform mapping sesuai Nstbrowser API v2
    const platformMap: Record<string, string> = {
      windows: 'Windows',
      macos: 'Mac OS X',
      linux: 'Linux',
      android: 'Android',
      ios: 'iOS',
    }

    // Kernel version sesuai browser
    const kernelMap: Record<string, string> = {
      chrome: '120',
      firefox: '120',
      edge: '120',
      safari: '17',
    }

    const body: Record<string, any> = {
      name: config.name,
      platform: platformMap[config.os] ?? 'Windows',
      kernel: 'chromium',
      kernelMilestone: kernelMap[config.browser] ?? '120',
      hardwareConcurrency: 4,
      deviceMemory: 8,

      // Screen resolution
      display: config.resolution
        ? `${config.resolution.width}x${config.resolution.height}`
        : '1920x1080',

      // Fingerprint config
      userAgent: config.userAgent
        ?? this.buildUserAgent(config.os, config.browser),
      language: config.language ?? 'en-US',
      timezone: config.timezone ?? 'America/New_York',

      // Privacy — WebRTC disabled, Canvas & Audio noise
      webRTC: 'Disabled',
      canvas: 'Noise',
      webGL: 'Noise',
      audioCtx: 'Noise',
      clientHints: 1,        // Sync Client Hints dengan UA otomatis

      // Extra — biarkan Nstbrowser generate sisanya
      enableLandscape: 0,
      flags: {
        disable_web_security: 0,
      },
    }

    // Proxy config
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

    // API v2: POST /api/v2/browser/create
    const res = await this.fetchWithTimeout(
      `${this.localUrl}/api/v2/browser/create`,
      {
        method: 'POST',
        headers: this.headers,
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
  async launchProfile(profileId: string): Promise<LaunchResult> {
    // API v2: POST /api/v2/browser/start
    // Returns webSocketDebuggerUrl untuk Playwright.connectOverCDP()
    const res = await this.fetchWithTimeout(
      `${this.localUrl}/api/v2/browser/start`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          id: profileId,
          // headless: true untuk server/VPS tanpa display
          config: {
            headless: true,
            autoClose: false,
            remoteDebugging: true,   // wajib agar CDP endpoint tersedia
          },
        }),
      },
      30_000  // browser launch butuh waktu
    )

    if (res.code !== 0) {
      throw new Error(`Nstbrowser launchProfile error: ${res.msg}`)
    }

    const cdpEndpoint = res.data?.webSocketDebuggerUrl
    const port = res.data?.port ?? 0

    if (!cdpEndpoint) {
      throw new Error(
        'Nstbrowser: webSocketDebuggerUrl not found in response. ' +
        'Pastikan remoteDebugging: true in config.'
      )
    }

    return {
      profileId,
      cdpEndpoint,
      port,
    }
  }
  async closeProfile(profileId: string): Promise<void> {
    try {
      // API v2: POST /api/v2/browser/close
      await this.fetchWithTimeout(
        `${this.localUrl}/api/v2/browser/close`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({ id: profileId }),
        },
        10_000
      )
    } catch (err: any) {
      console.warn(`Nstbrowser closeProfile warning: ${err.message}`)
    }
  }
  async deleteProfile(profileId: string): Promise<void> {
    const res = await this.fetchWithTimeout(
      `${this.localUrl}/api/v2/browser/delete`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ ids: [profileId] }),
      }
    )
    if (res.code !== 0) {
      throw new Error(`Nstbrowser deleteProfile error: ${res.msg}`)
    }
  }
  async listProfiles(page = 1, limit = 20): Promise<AntidetectProfile[]> {
    const res = await this.fetchWithTimeout(
      `${this.localUrl}/api/v2/browser/list?page=${page}&pageSize=${limit}`,
      { headers: this.headers }
    )

    if (res.code !== 0) {
      throw new Error(`Nstbrowser listProfiles error: ${res.msg}`)
    }

    return (res.data?.list ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      provider: this.type,
      status: 'active' as const,
      createdAt: new Date(p.createTime ?? Date.now()),
      meta: p,
    }))
  }
  async updateProxy(profileId: string, proxyUrl: string): Promise<void> {
    const proxy = this.parseProxyUrl(proxyUrl)

    // API v2: POST /api/v2/browser/update
    const res = await this.fetchWithTimeout(
      `${this.localUrl}/api/v2/browser/update`,
      {
        method: 'POST',
        headers: this.headers,
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

