import { chromium, firefox } from 'playwright'
import type { BrowserInstance, ContextLease, PoolStats } from "@forge-exchange/worker-kit"
import { WorkerLogger } from '../utils/logger.js'


export class BrowserPoolManager {
  private browsers = new Map<string, BrowserInstance>()
  private contexts = new Map<string, ContextLease>()
  private maxBrowsers: number
  private logger: WorkerLogger

  constructor(opts: { maxBrowsers?: number } = {}) {
    this.maxBrowsers = opts.maxBrowsers ?? 5
    this.logger = new WorkerLogger()
  }

  // ── Launch browser ────────────────────────────────────────
  async launchBrowser(engine: 'chromium' | 'firefox' = 'chromium'): Promise<BrowserInstance> {
    if (this.browsers.size >= this.maxBrowsers) {
      // Recycle least recently used idle browser
      await this.recycleOldestBrowser()
    }

    const id = `browser-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    this.logger.info(`Launching ${engine} browser: ${id}`)

    const launchOpts = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
      ],
    }

    const browser = engine === 'firefox'
      ? await firefox.launch(launchOpts)
      : await chromium.launch(launchOpts)

    const instance: BrowserInstance = {
      id,
      browser,
      engine,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      sessionCount: 0,
      isHealthy: true,
    }

    this.browsers.set(id, instance)
    this.logger.info(`Browser ${id} launched (total: ${this.browsers.size}/${this.maxBrowsers})`)

    return instance
  }

  // ── Acquire context ───────────────────────────────────────
  async acquireContext(opts: {
    engine?: 'chromium' | 'firefox'
    proxyUrl?: string
    userAgent?: string
    viewport?: { width: number; height: number }
    locale?: string
    timezone?: string
    geolocation?: { latitude: number; longitude: number; accuracy: number }
    extraHttpHeaders?: Record<string, string>
  } = {}): Promise<ContextLease> {
    // Get or launch browser
    let instance = this.getHealthyBrowser()
    if (!instance) {
      instance = await this.launchBrowser(opts.engine ?? 'chromium')
    }

    instance.lastUsedAt = new Date()
    instance.sessionCount++

    const contextOpts: any = {
      userAgent: opts.userAgent,
      viewport: opts.viewport ?? { width: 1366, height: 768 },
      locale: opts.locale ?? 'en-US',
      timezoneId: opts.timezone ?? 'America/New_York',
      permissions: ['geolocation'],
      ignoreHTTPSErrors: true,
    }

    if (opts.proxyUrl) {
      contextOpts.proxy = { server: opts.proxyUrl }
    }

    if (opts.geolocation) {
      contextOpts.geolocation = opts.geolocation
    }

    if (opts.extraHttpHeaders) {
      contextOpts.extraHTTPHeaders = opts.extraHttpHeaders
    }

    const context = await instance.browser.newContext(contextOpts)

    const leaseId = `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const lease: ContextLease = {
      context,
      browserId: instance.id,
      leaseId,
      createdAt: new Date(),
    }

    this.contexts.set(leaseId, lease)
    return lease
  }

  // ── Release context ───────────────────────────────────────
  async releaseContext(leaseId: string, persist = false): Promise<void> {
    const lease = this.contexts.get(leaseId)
    if (!lease) return

    if (!persist) {
      try {
        await lease.context.close()
      } catch { /* already closed */ }
    }

    this.contexts.delete(leaseId)
  }

  // ── Get healthy browser ───────────────────────────────────
  private getHealthyBrowser(): BrowserInstance | null {
    for (const [, instance] of this.browsers) {
      if (instance.isHealthy && instance.browser.isConnected()) {
        return instance
      }
    }
    return null
  }

  // ── Recycle oldest browser ────────────────────────────────
  private async recycleOldestBrowser(): Promise<void> {
    let oldest: BrowserInstance | null = null
    for (const [, instance] of this.browsers) {
      if (!oldest || instance.lastUsedAt < oldest.lastUsedAt) {
        oldest = instance
      }
    }
    if (oldest) {
      this.logger.info(`Recycling browser: ${oldest.id}`)
      await this.closeBrowser(oldest.id)
    }
  }

  // ── Close browser ─────────────────────────────────────────
  async closeBrowser(browserId: string): Promise<void> {
    const instance = this.browsers.get(browserId)
    if (!instance) return

    // Close all contexts belonging to this browser
    for (const [leaseId, lease] of this.contexts) {
      if (lease.browserId === browserId) {
        try { await lease.context.close() } catch { /* ignore */ }
        this.contexts.delete(leaseId)
      }
    }

    try { await instance.browser.close() } catch { /* ignore */ }
    this.browsers.delete(browserId)
    this.logger.info(`Browser ${browserId} closed`)
  }

  // ── Close all ─────────────────────────────────────────────
  async closeAll(): Promise<void> {
    this.logger.info('Closing all browsers...')
    for (const [id] of this.browsers) {
      await this.closeBrowser(id)
    }
  }

  // ── Stats ─────────────────────────────────────────────────
  getStats(): PoolStats {
    const total = this.browsers.size
    const active = [...this.browsers.values()].filter(b => b.sessionCount > 0).length
    return {
      totalBrowsers: total,
      activeBrowsers: active,
      idleBrowsers: total - active,
      totalContexts: this.contexts.size,
      maxBrowsers: this.maxBrowsers,
    }
  }
}
