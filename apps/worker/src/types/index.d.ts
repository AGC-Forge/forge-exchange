declare global {
  interface Window {
    reporter: any;
  }
  interface AntidetectProfileConfig {
    // Identity
    name: string
    os: OSType
    osVersion?: string
    browser: BrowserType
    browserVersion?: string
    // Network
    proxyId?: string
    proxyUrl?: string   // format: protocol://user:pass@host:port
    // Fingerprint overrides (optional — provider generate sendiri)
    userAgent?: string
    language?: string
    timezone?: string
    resolution?: { width: number; height: number }
    // Extra config per provider
    extraConfig?: Record<string, any>
  }
  type OSType =
    | 'windows' | 'macos' | 'linux'
    | 'android' | 'ios'
  type BrowserType =
    | 'chrome' | 'firefox' | 'safari'
    | 'edge' | 'opera'
  interface AntidetectProfile {
    id: string          // ID profile di provider
    name: string
    provider: ProviderType
    status: 'active' | 'running' | 'closed'
    cdpEndpoint?: string          // ws://... untuk Playwright connect
    createdAt: Date
    meta: Record<string, any>  // raw data dari provider
  }
  interface LaunchResult {
    profileId: string
    cdpEndpoint: string           // wajib ada agar Playwright bisa connect
    wsEndpoint?: string
    port?: number
  }
  interface HealthCheckResult {
    healthy: boolean
    provider: ProviderType
    version?: string
    message?: string
    latencyMs?: number
  }
  type ProviderType =
    | 'gologin'
    | 'adspower'
    | 'multilogin'
    | 'dolphin'
    | 'nstbrowser'

  interface ProviderCredentials {
    // GoLogin
    apiKey?: string
    // AdsPower
    // (apiKey same field)
    apiUrl?: string   // default: http://local.adspower.net:50325
    // Multilogin
    email?: string
    password?: string
    // Dolphin{anty}
    // (apiKey same field, port configurable)
    apiPort?: number   // default: 3001
    // Nstbrowser
    // (apiKey same field)
  }
  // ── Abstract interface — semua provider implement ini ─────────
  interface IAntidetectProvider {
    readonly type: ProviderType
    /**
     * Check apakah provider bisa dihubungi dan credentials valid
     */
    healthCheck(): Promise<HealthCheckResult>
    /**
     * Buat profile baru dengan konfigurasi yang diberikan.
     * Returns profile ID dari provider.
     */
    createProfile(config: AntidetectProfileConfig): Promise<AntidetectProfile>
    /**
     * Launch profile yang sudah ada atau baru dibuat.
     * Returns CDP endpoint untuk Playwright.connectOverCDP()
     */
    launchProfile(profileId: string): Promise<LaunchResult>
    /**
     * Stop browser dari profile yang sedang running.
     */
    closeProfile(profileId: string): Promise<void>
    /**
     * Hapus profile dari provider (cleanup setelah session).
     */
    deleteProfile(profileId: string): Promise<void>
    /**
     * List profile yang ada (untuk management).
     */
    listProfiles(page?: number, limit?: number): Promise<AntidetectProfile[]>
    /**
     * Update proxy di profile yang sudah ada.
     */
    updateProxy(profileId: string, proxyUrl: string): Promise<void>
  }
  interface AntidetectSessionResult {
    profileId: string
    provider: ProviderType
    cdpEndpoint: string
    isReusable: boolean    // apakah profile bisa dipakai lagi di session berikutnya
  }
  const OS_BROWSER_MATRIX: Record<OSType, BrowserType[]> = {
    windows: ['chrome', 'firefox', 'edge', 'opera'],
    macos: ['safari', 'chrome', 'firefox', 'edge'],
    linux: ['chrome', 'firefox'],
    android: ['chrome', 'firefox'],
    ios: ['safari', 'chrome'],
  }
  const OS_VERSIONS: Record<OSType, string[]> = {
    windows: ['11', '10', '8.1'],
    macos: ['14 Sonoma', '13 Ventura', '12 Monterey', '11 Big Sur'],
    linux: ['Ubuntu 22.04', 'Ubuntu 20.04', 'Debian 12'],
    android: ['14', '13', '12', '11', '10'],
    ios: ['17', '16', '15'],
  }
  const CREDIT_COST = {
    standard: 1,
    premium: {
      gologin: 4,
      adspower: 3,
      multilogin: 5,
      dolphin: 3,
      nstbrowser: 4,
    },
  } as const

  interface PremiumSessionOpts {
    campaignId: string
    userId: string
    provider: ProviderType
    profileConfig: AntidetectProfileConfig
    // Kalau undefined → buat profile baru dan hapus setelah selesai
    // Kalau ada → reuse profile yang ada
    reuseProfileId?: string
  }

  type IntegrationType = 'residential_proxy' | 'mobile_proxy' | 'multilogin' | 'gologin' | 'adspower' | 'capmonster' | 'twocaptcha' | 'turnstile'
}
export { };
