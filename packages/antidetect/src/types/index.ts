export type OSType = "windows" | "macos" | "linux" | "android" | "ios";

export type BrowserType =
  | "chrome"
  | "firefox"
  | "safari"
  | "edge"
  | "opera";

export type ProviderType =
  | "gologin"
  | "adspower"
  | "multilogin"
  | "dolphin"
  | "nstbrowser";

export interface AntidetectProfileConfig {
  name: string;
  os: OSType;
  osVersion?: string;
  browser: BrowserType;
  browserVersion?: string;
  proxyId?: string;
  proxyUrl?: string;
  userAgent?: string;
  language?: string;
  timezone?: string;
  resolution?: { width: number; height: number };
  extraConfig?: Record<string, any>;
}

export interface AntidetectProfile {
  id: string;
  name: string;
  provider: ProviderType;
  status: "active" | "running" | "closed";
  cdpEndpoint?: string;
  createdAt: Date;
  meta: Record<string, any>;
}

export interface LaunchResult {
  profileId: string;
  cdpEndpoint: string;
  wsEndpoint?: string;
  port?: number;
  provider: ProviderType;
}

export interface HealthCheckResult {
  healthy: boolean;
  provider: ProviderType;
  version?: string;
  message?: string;
  latencyMs?: number;
}

export interface ProviderCredentials {
  apiKey?: string;
  apiUrl?: string;
  email?: string;
  password?: string;
  apiPort?: number;
}

export interface IAntidetectProvider {
  readonly type: ProviderType;
  healthCheck(): Promise<HealthCheckResult>;
  createProfile(config: AntidetectProfileConfig): Promise<AntidetectProfile>;
  launchProfile(profileId: string): Promise<LaunchResult>;
  closeProfile(profileId: string): Promise<void>;
  deleteProfile(profileId: string): Promise<void>;
  listProfiles(page?: number, limit?: number): Promise<AntidetectProfile[]>;
  updateProxy(profileId: string, proxyUrl: string): Promise<void>;
}

export interface AntidetectSessionResult {
  profileId: string;
  provider: ProviderType;
  cdpEndpoint: string;
  isReusable: boolean;
}

export interface PremiumSessionOpts {
  campaignId: string;
  userId: string;
  provider: ProviderType;
  profileConfig: AntidetectProfileConfig;
  reuseProfileId?: string;
}

export type IntegrationType =
  // Proxy
  | 'residential_proxy'
  | 'mobile_proxy'
  | 'socks5_proxy'
  | 'rotating_proxy'
  | 'brightdata'
  | 'oxylabs'
  | 'iproyal'
  | 'smartproxy'
  // Antidetect
  | 'gologin'
  | 'adspower'
  | 'multilogin'
  | 'dolphin'
  | 'nstbrowser'
  // CAPTCHA
  | 'capmonster'
  | 'twocaptcha'
  | 'anticaptcha'
  | 'turnstile'
