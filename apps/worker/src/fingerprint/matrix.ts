import type { OSType, BrowserType, GPUProfile } from "@forge-exchange/worker-kit"

export const OS_BROWSER_COMPAT: Record<OSType, BrowserType[]> = {
  windows: ['chrome', 'firefox', 'edge'],
  macos: ['safari', 'chrome', 'firefox', 'edge'],
  linux: ['chrome', 'firefox'],
  android: ['chrome', 'firefox'],
  ios: ['safari', 'chrome'],
}

export const PLATFORM_MAP: Record<OSType, string> = {
  windows: 'Win32',
  macos: 'MacIntel',
  linux: 'Linux x86_64',
  android: 'Linux armv8l',
  ios: 'iPhone',
}

export const CH_PLATFORM_MAP: Record<OSType, string> = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  android: 'Android',
  ios: 'iOS',
}

export const CH_PLATFORM_VERSION: Record<OSType, Record<string, string>> = {
  windows: { '11': '15.0.0', '10': '10.0.0' },
  macos: { '14': '14.0.0', '13': '13.0.0', '12': '12.0.0' },
  linux: { ubuntu22: '5.15.0', ubuntu20: '5.4.0', debian12: '6.1.0' },
  android: { '14': '14', '13': '13', '12': '12', '11': '11' },
  ios: { '17': '17.0', '16': '16.0', '15': '15.0' },
}

export function buildUserAgent(
  os: OSType,
  osVersion: string,
  browser: BrowserType,
  browserVersion: string,
): string {
  const v = browserVersion

  const templates: Record<OSType, Partial<Record<BrowserType, string>>> = {
    windows: {
      chrome: `Mozilla/5.0 (Windows NT ${osToNT(osVersion)}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36`,
      firefox: `Mozilla/5.0 (Windows NT ${osToNT(osVersion)}; Win64; x64; rv:${v}.0) Gecko/20100101 Firefox/${v}.0`,
      edge: `Mozilla/5.0 (Windows NT ${osToNT(osVersion)}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36 Edg/${v}.0.0.0`,
    },
    macos: {
      safari: `Mozilla/5.0 (Macintosh; Intel Mac OS X ${osToMac(osVersion)}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${v}.0 Safari/605.1.15`,
      chrome: `Mozilla/5.0 (Macintosh; Intel Mac OS X ${osToMac(osVersion)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36`,
      firefox: `Mozilla/5.0 (Macintosh; Intel Mac OS X ${osToMac(osVersion)}; rv:${v}.0) Gecko/20100101 Firefox/${v}.0`,
      edge: `Mozilla/5.0 (Macintosh; Intel Mac OS X ${osToMac(osVersion)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36 Edg/${v}.0.0.0`,
    },
    linux: {
      chrome: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36`,
      firefox: `Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:${v}.0) Gecko/20100101 Firefox/${v}.0`,
    },
    android: {
      chrome: `Mozilla/5.0 (Linux; Android ${osVersion}; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Mobile Safari/537.36`,
      firefox: `Mozilla/5.0 (Android ${osVersion}; Mobile; rv:${v}.0) Gecko/${v}.0 Firefox/${v}.0`,
    },
    ios: {
      safari: `Mozilla/5.0 (iPhone; CPU iPhone OS ${osVersion.replace('.', '_')} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${v} Mobile/15E148 Safari/604.1`,
      chrome: `Mozilla/5.0 (iPhone; CPU iPhone OS ${osVersion.replace('.', '_')} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/${v}.0.0.0 Mobile/15E148 Safari/604.1`,
    },
  }

  return templates[os]?.[browser]
    ?? templates.windows.chrome!
}

export const GPU_PROFILES: Record<OSType, GPUProfile[]> = {
  windows: [
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  ],
  macos: [
    { vendor: 'Apple Inc.', renderer: 'Apple M1' },
    { vendor: 'Apple Inc.', renderer: 'Apple M2' },
    { vendor: 'Intel Inc.', renderer: 'Intel Iris OpenGL Engine' },
    { vendor: 'Apple Inc.', renderer: 'Apple M1 Pro' },
  ],
  linux: [
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Ti/PCIe/SSE2, OpenGL 4.5.0)' },
    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Mesa Intel(R) UHD Graphics 620 (KBL GT2), OpenGL 4.6.0)' },
    { vendor: 'VMware, Inc.', renderer: 'SVGA3D; build: RELEASE; LLVM' },
  ],
  android: [
    { vendor: 'Qualcomm', renderer: 'Adreno (TM) 730' },
    { vendor: 'Qualcomm', renderer: 'Adreno (TM) 650' },
    { vendor: 'ARM', renderer: 'Mali-G78 MC22' },
    { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' },
  ],
  ios: [
    { vendor: 'Apple Inc.', renderer: 'Apple A15 GPU' },
    { vendor: 'Apple Inc.', renderer: 'Apple A16 GPU' },
    { vendor: 'Apple Inc.', renderer: 'Apple A14 GPU' },
  ],
}

export const SCREEN_PROFILES: Record<OSType, { width: number; height: number; dpr: number }[]> = {
  windows: [
    { width: 1920, height: 1080, dpr: 1 },
    { width: 2560, height: 1440, dpr: 1 },
    { width: 1366, height: 768, dpr: 1 },
    { width: 1536, height: 864, dpr: 1.25 },
    { width: 1280, height: 720, dpr: 1 },
  ],
  macos: [
    { width: 2560, height: 1600, dpr: 2 },
    { width: 1440, height: 900, dpr: 2 },
    { width: 2880, height: 1800, dpr: 2 },
    { width: 1920, height: 1200, dpr: 1 },
  ],
  linux: [
    { width: 1920, height: 1080, dpr: 1 },
    { width: 1280, height: 1024, dpr: 1 },
    { width: 1600, height: 900, dpr: 1 },
  ],
  android: [
    { width: 393, height: 851, dpr: 2.75 },
    { width: 360, height: 780, dpr: 3 },
    { width: 412, height: 915, dpr: 2.625 },
    { width: 384, height: 854, dpr: 2.5 },
  ],
  ios: [
    { width: 390, height: 844, dpr: 3 },
    { width: 375, height: 812, dpr: 3 },
    { width: 428, height: 926, dpr: 3 },
    { width: 414, height: 896, dpr: 2 },
  ],
}
// ── Touch support per OS ──────────────────────────────────────
export const MAX_TOUCH_POINTS: Record<OSType, number> = {
  windows: 0,    // desktop
  macos: 0,    // desktop
  linux: 0,    // desktop
  android: 5,    // mobile touch
  ios: 5,    // mobile touch
}

// ── Hardware concurrency per OS ───────────────────────────────
export const HARDWARE_CONCURRENCY: Record<OSType, number[]> = {
  windows: [4, 6, 8, 12, 16],
  macos: [8, 10, 12],          // Apple Silicon biasanya 8-12 core
  linux: [2, 4, 6, 8],
  android: [4, 6, 8],
  ios: [6],                  // A-series chip
}

// ── Device memory per OS ──────────────────────────────────────
export const DEVICE_MEMORY: Record<OSType, number[]> = {
  windows: [4, 8, 16],
  macos: [8, 16, 32],
  linux: [4, 8, 16],
  android: [4, 6, 8, 12],
  ios: [4, 6, 8],
}

// ── Battery API availability ──────────────────────────────────
export const HAS_BATTERY_API: Record<OSType, boolean> = {
  windows: false,   // Chrome di Windows expose API tapi returnnya false
  macos: false,
  linux: false,
  android: true,    // mobile devices punya battery
  ios: false,   // iOS tidak expose battery API
}

// ── Locale per country code ───────────────────────────────────
export const COUNTRY_LOCALE: Record<string, { language: string; languages: string[] }> = {
  US: { language: 'en-US', languages: ['en-US', 'en'] },
  GB: { language: 'en-GB', languages: ['en-GB', 'en'] },
  DE: { language: 'de-DE', languages: ['de-DE', 'de', 'en'] },
  FR: { language: 'fr-FR', languages: ['fr-FR', 'fr', 'en'] },
  JP: { language: 'ja-JP', languages: ['ja-JP', 'ja', 'en'] },
  ID: { language: 'id-ID', languages: ['id-ID', 'id', 'en'] },
  SG: { language: 'en-SG', languages: ['en-SG', 'en'] },
  AU: { language: 'en-AU', languages: ['en-AU', 'en'] },
  BR: { language: 'pt-BR', languages: ['pt-BR', 'pt', 'en'] },
  IN: { language: 'en-IN', languages: ['en-IN', 'hi', 'en'] },
  NL: { language: 'nl-NL', languages: ['nl-NL', 'nl', 'en'] },
  CA: { language: 'en-CA', languages: ['en-CA', 'fr-CA', 'en'] },
}

// ── Timezone per country ──────────────────────────────────────
export const COUNTRY_TIMEZONE: Record<string, string> = {
  US: 'America/New_York', GB: 'Europe/London',
  DE: 'Europe/Berlin', FR: 'Europe/Paris',
  JP: 'Asia/Tokyo', ID: 'Asia/Jakarta',
  SG: 'Asia/Singapore', AU: 'Australia/Sydney',
  BR: 'America/Sao_Paulo', IN: 'Asia/Kolkata',
  NL: 'Europe/Amsterdam', CA: 'America/Toronto',
}

// ── Helpers ───────────────────────────────────────────────────
function osToNT(version: string): string {
  return version === '11' ? '10.0' : '10.0'   // NT version sama untuk Win10/11
}

function osToMac(version: string): string {
  const map: Record<string, string> = {
    '14': '10_15_7', '13': '10_15_7', '12': '10_15_7',
  }
  return map[version] ?? '10_15_7'
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T
}
