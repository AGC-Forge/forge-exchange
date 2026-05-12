import { BaseAntidetectProvider } from './base.provider.js'

import type {
  AntidetectProfile,
  AntidetectProfileConfig,
  HealthCheckResult,
  LaunchResult,
  ProviderCredentials,
} from '../types/index.js'

export class GoLoginProvider extends BaseAntidetectProvider {
  readonly type = 'gologin' as const

  private glInstance: any = null
  private readonly API_URL = 'https://api.gologin.com'

  constructor(credentials: ProviderCredentials) {
    super(credentials)
  }
  private async getSDK(profileId?: string): Promise<any> {
    if (this.glInstance) return this.glInstance

    const apiKey = this.requireApiKey()

    // Dynamic import — SDK diinstall di VPS worker
    const { GologinApi } = await import('gologin').catch(() => {
      throw new Error('GoLogin SDK not found. Please run: npm install gologin')
    })

    this.glInstance = GologinApi({
      token: apiKey,
      // executablePath is not a valid GologinApiParams property — pass it later via gl.setExecutablePath() if the SDK supports it
    })

    return this.glInstance
  }
  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now()
    try {
      const apiKey = this.requireApiKey()

      // Gunakan REST API untuk health check (lebih ringan dari init SDK)
      const res = await this.fetchWithTimeout(
        `${this.API_URL}/browser/v2?limit=1`,
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
        message: `GoLogin connected. Total profiles: ${res.count ?? 'ok'}`,
      }
    } catch (err: any) {
      return {
        healthy: false,
        provider: this.type,
        message: err.message,
      }
    }
  }
  async createProfile(config: AntidetectProfileConfig): Promise<AntidetectProfile> {
    const apiKey = this.requireApiKey()

    // OS mapping ke GoLogin format
    const osMap: Record<string, string> = {
      windows: 'win',
      macos: 'mac',
      linux: 'lin',
      android: 'android',
      ios: 'ios',
    }

    const browserMap: Record<string, string> = {
      chrome: 'chrome',
      firefox: 'firefox',
      safari: 'safari',
      edge: 'edge',
    }

    const body: Record<string, any> = {
      name: config.name,
      os: osMap[config.os] ?? 'win',
      browserType: browserMap[config.browser] ?? 'chrome',
      navigator: {
        language: config.language ?? 'en-US',
        userAgent: config.userAgent ?? undefined,
        resolution: config.resolution
          ? `${config.resolution.width}x${config.resolution.height}`
          : '1920x1080',
      },
    }

    // Inject proxy
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

    if (!res.id) {
      throw new Error(`GoLogin createProfile error: ${JSON.stringify(res)}`)
    }

    return {
      id: res.id,
      name: config.name,
      provider: this.type,
      status: 'active',
      createdAt: new Date(),
      meta: res,
    }
  }
  async launchProfile(profileId: string): Promise<LaunchResult> {
    // GoLogin SDK (package: gologin) — startRemote() untuk headless
    const gl = await this.getSDK(profileId)

    // startRemote() launch browser dan return wsUrl
    // Ref: https://gologin.com/docs/api-reference/introduction/quickstart
    const { wsUrl } = await gl.startRemote()

    if (!wsUrl) {
      throw new Error(
        `GoLogin: Failed to get WebSocket URL for profile ${profileId}`
      )
    }

    return {
      profileId,
      cdpEndpoint: wsUrl,
      wsEndpoint: wsUrl,
    }
  }
  async closeProfile(profileId: string): Promise<void> {
    try {
      const gl = await this.getSDK(profileId)
      await gl.stopRemote()
    } catch (err: any) {
      console.warn(`GoLogin closeProfile warning: ${err.message}`)
    }
  }
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
