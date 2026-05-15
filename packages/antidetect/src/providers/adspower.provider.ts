import { BaseAntidetectProvider } from './base.provider.js'
import type {
  AntidetectProfile,
  AntidetectProfileConfig,
  HealthCheckResult,
  LaunchResult,
  ProviderCredentials,
} from '../types/index.js'

export class AdsPowerProvider extends BaseAntidetectProvider {
  readonly type = 'adspower' as const

  private get baseUrl(): string {
    return this.credentials.apiUrl?.replace(/\/$/, '')
      ?? 'http://local.adspower.net:20725'
  }

  constructor(credentials: ProviderCredentials) {
    super(credentials)
  }

  // ── Health check ──────────────────────────────────────────
  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now()
    try {
      const apiKey = this.requireApiKey()
      const res = await this.fetchWithTimeout(
        `${this.baseUrl}/api/v1/application/status?apiKey=${apiKey}`,
        {},
        5_000
      )

      if (res.code !== 0) {
        throw new Error(res.msg ?? 'AdsPower status check failed')
      }

      return {
        healthy: true,
        provider: this.type,
        latencyMs: Date.now() - start,
        message: 'AdsPower Local API connected',
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

    // OS platform mapping untuk AdsPower
    const platformMap: Record<string, string> = {
      windows: 'Windows', macos: 'MacIntel',
      linux: 'Linux x86_64', android: 'Linux armv8l', ios: 'iPhone',
    }

    const body: Record<string, any> = {
      name: config.name,
      group_id: '0',
      user_agent: {
        mode: 'custom',
        value: config.userAgent
          ?? this.buildUserAgent(config.os, config.browser),
      },
      fingerprint_config: {
        automatic_timezone: '1',
        language: [config.language ?? 'en-US'],
        flash: '0',
        scan_port_type: '1',
        allow_scan_ports: [],
        fonts: ['all'],
        screen: config.resolution
          ? `${config.resolution.width}_${config.resolution.height}`
          : '1920_1080',
        // WebRTC: disable untuk privacy maksimal
        webrtc: 'disabled',
        // Canvas: noise untuk anti-fingerprint
        canvas: '1',
        // WebGL
        webgl_image: '1',
        webgl: '3',
        // Audio
        audio: '1',
        // Client hints sync dengan OS
        client_hints: '1',
        platform: platformMap[config.os] ?? 'Win32',
      },
    }

    // Proxy config
    if (config.proxyUrl) {
      const proxy = this.parseProxyUrl(config.proxyUrl)
      body.user_proxy_config = {
        proxy_soft: 'other',
        proxy_type: proxy.protocol.includes('socks') ? 'socks5' : 'http',
        proxy_host: proxy.host,
        proxy_port: String(proxy.port),
        proxy_user: proxy.username ?? '',
        proxy_password: proxy.password ?? '',
      }
    }

    const res = await this.fetchWithTimeout(
      `${this.baseUrl}/api/v1/user/create?apiKey=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )

    if (res.code !== 0) {
      throw new Error(`AdsPower createProfile error: ${res.msg}`)
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

    const res = await this.fetchWithTimeout(
      `${this.baseUrl}/api/v1/browser/start?` +
      new URLSearchParams({
        apiKey: apiKey,
        user_id: profileId,
        open_tabs: '1',
        ip_tab: '0',     // jangan buka tab IP info
        headless: '1',     // headless mode
      }).toString(),
      {},
      30_000  // browser launch bisa agak lama
    )

    if (res.code !== 0) {
      throw new Error(`AdsPower launchProfile error: ${res.msg}`)
    }

    const { webdriver, ws } = res.data

    // AdsPower expose selenium webdriver port dan CDP ws
    // Playwright pakai CDP websocket endpoint
    const cdpEndpoint = ws.selenium
      ? `ws://127.0.0.1:${this.extractPort(ws.selenium)}/devtools/browser`
      : ws.puppeteer

    if (!cdpEndpoint) {
      throw new Error('AdsPower: Tidak bisa mendapatkan CDP endpoint')
    }

    return {
      profileId,
      cdpEndpoint,
      wsEndpoint: ws.puppeteer,
      port: this.extractPort(ws.selenium ?? ws.puppeteer),
      provider: this.type,
    }
  }

  // ── Close profile ─────────────────────────────────────────
  async closeProfile(profileId: string): Promise<void> {
    const apiKey = this.requireApiKey()
    try {
      await this.fetchWithTimeout(
        `${this.baseUrl}/api/v1/browser/stop?apiKey=${apiKey}&user_id=${profileId}`,
        {},
        10_000
      )
    } catch (err: any) {
      console.warn(`AdsPower closeProfile warning: ${err.message}`)
    }
  }

  // ── Delete profile ────────────────────────────────────────
  async deleteProfile(profileId: string): Promise<void> {
    const apiKey = this.requireApiKey()
    const res = await this.fetchWithTimeout(
      `${this.baseUrl}/api/v1/user/delete?apiKey=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: [profileId] }),
      }
    )
    if (res.code !== 0) {
      throw new Error(`AdsPower deleteProfile error: ${res.msg}`)
    }
  }

  // ── List profiles ─────────────────────────────────────────
  async listProfiles(page = 1, limit = 20): Promise<AntidetectProfile[]> {
    const apiKey = this.requireApiKey()
    const res = await this.fetchWithTimeout(
      `${this.baseUrl}/api/v1/user/list?` +
      new URLSearchParams({
        apiKey,
        page: String(page),
        page_size: String(limit),
      }).toString()
    )

    if (res.code !== 0) throw new Error(`AdsPower listProfiles error: ${res.msg}`)

    return (res.data?.list ?? []).map((p: any) => ({
      id: p.user_id,
      name: p.name,
      provider: this.type,
      status: 'active' as const,
      createdAt: new Date(p.created_time * 1000),
      meta: p,
    }))
  }

  // ── Update proxy ──────────────────────────────────────────
  async updateProxy(profileId: string, proxyUrl: string): Promise<void> {
    const apiKey = this.requireApiKey()
    const proxy = this.parseProxyUrl(proxyUrl)

    const res = await this.fetchWithTimeout(
      `${this.baseUrl}/api/v1/user/update?apiKey=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profileId,
          user_proxy_config: {
            proxy_soft: 'other',
            proxy_type: proxy.protocol.includes('socks') ? 'socks5' : 'http',
            proxy_host: proxy.host,
            proxy_port: String(proxy.port),
            proxy_user: proxy.username ?? '',
            proxy_password: proxy.password ?? '',
          },
        }),
      }
    )
    if (res.code !== 0) throw new Error(`AdsPower updateProxy error: ${res.msg}`)
  }

  // ── Helper ────────────────────────────────────────────────
  private extractPort(wsUrl?: string): number {
    if (!wsUrl) return 0
    const match = wsUrl.match(/:(\d+)/)
    return match ? parseInt(match[1] ?? '0') : 0
  }
}
