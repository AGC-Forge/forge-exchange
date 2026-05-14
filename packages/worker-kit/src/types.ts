import type { Browser, BrowserContext } from 'playwright'



export type SessionMode = 'standard' | 'premium'
export type ProviderType = 'gologin' | 'adspower' | 'multilogin' | 'dolphin' | 'nstbrowser'
export type OSType = 'windows' | 'macos' | 'linux' | 'android' | 'ios'
export type BrowserType = 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera'
export type ProxySource = 'pool' | 'integration' | 'none'

export interface GeoTarget {
  country: string
  proxyPoolId?: string
  weight: number
  proxySource: ProxySource
  integrationId?: string
}
export interface CustomClickTarget {
  selector: string
  selectorType: "css" | "id" | "xpath" | "text" | "attribute";
  clickRate: number
  waitBefore: number
  waitAfter: number
  description?: string
}
export interface CampaignJobPayload {
  campaignId: string
  userId: string
  targetUrl: string
  deviceType: string
  speedMode: string
  minDuration: number
  maxDuration: number
  creditsPerSession: number
  geoTargets: GeoTarget[]
  behaviorProfileId?: string
  customClickTargets?: CustomClickTarget[]
  sessionMode: SessionMode
  provider?: ProviderType
  os?: OSType
  osVersion?: string
  browserType?: BrowserType
  browserVersion?: string
  reuseProfileId?: string
}
export interface PremiumJobPayload extends CampaignJobPayload {
  sessionMode: 'premium'
  provider: ProviderType
  os: OSType
  browser: BrowserType
  mode: 'premium'
}
// ===========================================
// Behavior Profile
// ===========================================
export interface BehaviorProfile {
  mouseMovement: boolean
  mouseSpeed: 'slow' | 'normal' | 'fast'
  scrollEnabled: boolean
  scrollDepth: number
  internalLinkClick: boolean
  linkClickRate: number
  idlePauseEnabled: boolean
  tabSwitching: boolean
  keyboardTyping: boolean
  customClickEnabled: boolean
  customClickTargets: CustomClickTarget[]
  customClickOrder: 'sequential' | 'random'
  customClickMaxPerSession: number
  readingSpeed: 'slow' | 'normal' | 'fast'
  attentionSpan: number
}
export interface BezierPoint {
  x: number;
  y: number;
}
// ===========================================
// Browser Pool
// ===========================================
export interface BrowserInstance {
  id: string
  browser: Browser
  engine: 'chromium' | 'firefox'
  createdAt: Date
  lastUsedAt: Date
  sessionCount: number
  isHealthy: boolean
}
export interface ContextLease {
  context: BrowserContext
  browserId: string
  leaseId: string
  createdAt: Date
}
export interface PoolStats {
  activeBrowsers: number;
  totalContexts: number;
  maxBrowsers: number;
  totalBrowsers: number
  idleBrowsers: number
}
// ===========================================
// Fingerprint Engine
// ===========================================
export interface FingerprintProfile {
  userAgent: string;
  platform: string;
  language: string;
  languages: string[];
  timezone: string;
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  pixelRatio: number;
  hardwareConcurrency: number;
  deviceMemory: number;
  maxTouchPoints: number;
  webgl: Record<string, any>;
  canvas: Record<string, any>;
  fonts: string[];
  plugins: any[];
  audioContext: Record<string, any>;
  geoLat?: number;
  geoLng?: number;
  geoCountry?: string;
  raw: any; // raw fingerprint-generator output
}
export interface GPUProfile {
  vendor: string
  renderer: string
}
export interface ConsistentProfile {
  // Identity
  os: OSType
  osVersion: string
  browser: BrowserType
  browserVersion: string
  // Navigator
  userAgent: string
  platform: string
  language: string
  languages: string[]
  hardwareConcurrency: number
  deviceMemory: number
  maxTouchPoints: number
  // Client Hints (Sec-CH-UA-*)
  clientHints: {
    brands: { brand: string; version: string }[]
    mobile: boolean
    platform: string
    platformVersion: string
    architecture: string
    model: string
    uaFullVersion: string
  }
  // Screen
  screen: {
    width: number
    height: number
    colorDepth: number
    pixelRatio: number
  }
  // GPU (WebGL)
  gpu: GPUProfile
  // Timezone & Locale
  timezone: string
  locale: { language: string; languages: string[] }
  // Geo (fake — sesuai country)
  geolocation: { latitude: number; longitude: number; accuracy: number }
  // Features
  hasBatteryAPI: boolean
  hasTouchScreen: boolean
}
// ===========================================
// Proxy Manager
// ===========================================
export interface ProxyConfig {
  id: string;
  type: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  country?: string;
}
export interface ResolvedProxy {
  id?: string
  source: ProxySource
  type: string
  host: string
  port: number
  username?: string
  password?: string
  country?: string
  rotateUrl?: string
}
// ===========================================
// Client Hints Engine
// ===========================================
export interface ClientHintsHeaders {
  'Sec-CH-UA': string
  'Sec-CH-UA-Mobile': string
  'Sec-CH-UA-Platform': string
  'Sec-CH-UA-Platform-Version': string
  'Sec-CH-UA-Arch': string
  'Sec-CH-UA-Model': string
  'Sec-CH-UA-Full-Version-List': string
  'Accept-Language': string
}
// ===========================================
// WEBRTC Proper Spoofer
// ===========================================
export type WebRTCMode = 'block' | 'spoof' | 'restrict'
export interface WebRTCSpoofOptions {
  mode: WebRTCMode
  // IP yang akan dipakai untuk spoof (biasanya IP proxy)
  spoofedIp?: string
  // Fake public IP (jika tidak ada proxy)
  fakePublicIp?: string
}
