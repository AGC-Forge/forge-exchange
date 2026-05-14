export const OS_BROWSER_COMPAT: Record<string, string[]> = {
  windows: ['chrome', 'firefox', 'edge', 'opera'],
  macos: ['safari', 'chrome', 'firefox', 'edge'],
  linux: ['chrome', 'firefox'],
  android: ['chrome', 'firefox'],
  ios: ['safari', 'chrome'],
}

export const OS_VERSIONS: Record<string, { label: string; value: string }[]> = {
  windows: [
    { label: 'Windows 11', value: '11' },
    { label: 'Windows 10', value: '10' },
  ],
  macos: [
    { label: 'macOS Sonoma (14)', value: '14' },
    { label: 'macOS Ventura (13)', value: '13' },
    { label: 'macOS Monterey (12)', value: '12' },
  ],
  linux: [
    { label: 'Ubuntu 22.04', value: 'ubuntu22' },
    { label: 'Ubuntu 20.04', value: 'ubuntu20' },
    { label: 'Debian 12', value: 'debian12' },
  ],
  android: [
    { label: 'Android 14', value: '14' },
    { label: 'Android 13', value: '13' },
    { label: 'Android 12', value: '12' },
    { label: 'Android 11', value: '11' },
  ],
  ios: [
    { label: 'iOS 17', value: '17' },
    { label: 'iOS 16', value: '16' },
    { label: 'iOS 15', value: '15' },
  ],
}

export const BROWSER_VERSIONS: Record<string, { label: string; value: string }[]> = {
  chrome: [
    { label: 'Chrome 121', value: '121' },
    { label: 'Chrome 120', value: '120' },
    { label: 'Chrome 119', value: '119' },
  ],
  firefox: [
    { label: 'Firefox 122', value: '122' },
    { label: 'Firefox 121', value: '121' },
    { label: 'Firefox 120', value: '120' },
  ],
  safari: [
    { label: 'Safari 17', value: '17' },
    { label: 'Safari 16', value: '16' },
  ],
  edge: [
    { label: 'Edge 121', value: '121' },
    { label: 'Edge 120', value: '120' },
  ],
}
// Credit cost per session mode
export const SESSION_CREDIT_COST: Record<string, number> = {
  standard: 1,
  gologin: 4,
  adspower: 3,
  multilogin: 5,
  dolphin: 3,
  nstbrowser: 4,
}
