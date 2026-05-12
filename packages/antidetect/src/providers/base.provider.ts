import type {
  AntidetectProfile,
  AntidetectProfileConfig,
  HealthCheckResult,
  IAntidetectProvider,
  LaunchResult,
  ProviderCredentials,
  ProviderType,
} from "../types/index.js";

export abstract class BaseAntidetectProvider implements IAntidetectProvider {
  abstract readonly type: ProviderType
  protected credentials: ProviderCredentials

  constructor(credentials: ProviderCredentials) {
    this.credentials = credentials
  }

  // ── Abstract methods — must implement ─────────────────────
  abstract healthCheck(): Promise<HealthCheckResult>
  abstract createProfile(config: AntidetectProfileConfig): Promise<AntidetectProfile>
  abstract launchProfile(profileId: string): Promise<LaunchResult>
  abstract closeProfile(profileId: string): Promise<void>
  abstract deleteProfile(profileId: string): Promise<void>
  abstract listProfiles(page?: number, limit?: number): Promise<AntidetectProfile[]>
  abstract updateProxy(profileId: string, proxyUrl: string): Promise<void>

  // ── Shared utilities ─────────────────────────────────────
  /** Parse proxy URL menjadi object fields */
  protected parseProxyUrl(proxyUrl: string): {
    protocol: string
    host: string
    port: number
    username?: string
    password?: string
  } {
    try {
      const url = new URL(proxyUrl)
      return {
        protocol: url.protocol.replace(':', ''),
        host: url.hostname,
        port: parseInt(url.port),
        username: url.username || undefined,
        password: url.password || undefined,
      }
    } catch {
      // Fallback parse manual
      const match = proxyUrl.match(
        /^(https?|socks5?):\/\/(?:([^:@]+):([^@]*)@)?([^:]+):(\d+)$/i
      )
      if (!match) throw new Error(`Invalid proxy URL: ${proxyUrl}`)
      return {
        protocol: match[1] || '',
        username: match[2],
        password: match[3],
        host: match[4] || '',
        port: parseInt(match[5] || '0'),
      }
    }
  }

  /** Build User Agent string sesuai OS + browser + version */
  protected buildUserAgent(
    os: string,
    browser: string,
    browserVersion = '120'
  ): string {
    const ver = browserVersion

    const uaMap: Record<string, Record<string, string>> = {
      windows: {
        chrome: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}.0.0.0 Safari/537.36`,
        firefox: `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${ver}.0) Gecko/20100101 Firefox/${ver}.0`,
        edge: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}.0.0.0 Safari/537.36 Edg/${ver}.0.0.0`,
      },
      macos: {
        safari: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15`,
        chrome: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}.0.0.0 Safari/537.36`,
        firefox: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:${ver}.0) Gecko/20100101 Firefox/${ver}.0`,
      },
      android: {
        chrome: `Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}.0.0.0 Mobile Safari/537.36`,
        firefox: `Mozilla/5.0 (Android 13; Mobile; rv:${ver}.0) Gecko/${ver}.0 Firefox/${ver}.0`,
      },
      ios: {
        safari: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1`,
        chrome: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/${ver}.0.0.0 Mobile/15E148 Safari/604.1`,
      },
      linux: {
        chrome: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver}.0.0.0 Safari/537.36`,
        firefox: `Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:${ver}.0) Gecko/20100101 Firefox/${ver}.0`,
      },
    }

    return uaMap[os]?.[browser] ?? (uaMap.windows?.chrome || '')
  }

  /** Fetch dengan timeout dan error handling */
  protected async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs = 10_000
  ): Promise<any> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timer)

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
      }

      return res.json()
    } catch (err: any) {
      clearTimeout(timer)
      if (err.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`)
      }
      throw err
    }
  }

  /** Measure latency ke endpoint */
  protected async measureLatency(url: string): Promise<number> {
    const start = Date.now()
    try {
      await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
    } catch { /* ignore */ }
    return Date.now() - start
  }

  /** Validate credentials — harus ada minimal apiKey */
  protected requireApiKey(): string {
    if (!this.credentials.apiKey) {
      throw new Error(`${this.type}: API Key tidak ditemukan. Tambahkan di Integrations.`)
    }
    return this.credentials.apiKey
  }
}
