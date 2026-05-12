import { chromium, type Browser, type BrowserContext } from 'playwright'
import { AntidetectProviderFactory } from './providers/factory.js'
import type { WorkerLogger } from '../utils/logger.js'
import { prismaWorker } from '@forge-exchange/db'


export class AntidetectManager {
  private logger: WorkerLogger

  constructor(logger: WorkerLogger) {
    this.logger = logger
  }

  // ── Load credentials dari DB ──────────────────────────────
  private async loadCredentials(
    userId: string,
    providerType: ProviderType,
  ): Promise<ProviderCredentials> {
    const integration = await prismaWorker.integration.findFirst({
      where: {
        userId,
        type: providerType as IntegrationType,
        isActive: true,
      },
    })

    if (!integration) {
      throw new Error(
        `Integration ${providerType} tidak ditemukan untuk user ${userId}. ` +
        `Tambahkan di Settings → Integrations.`
      )
    }

    // credentials disimpan encrypted di DB, sudah di-decrypt oleh Prisma hook
    const creds = integration.credentials as Record<string, any>

    return {
      apiKey: creds.apiKey ?? creds.token ?? undefined,
      apiUrl: creds.apiUrl ?? undefined,
      email: creds.email ?? undefined,
      password: creds.password ?? undefined,
      apiPort: creds.apiPort ? Number(creds.apiPort) : undefined,
    }
  }

  // ── Get provider instance ─────────────────────────────────
  async getProvider(userId: string, providerType: ProviderType): Promise<IAntidetectProvider> {
    const credentials = await this.loadCredentials(userId, providerType)
    return AntidetectProviderFactory.create(providerType, credentials)
  }

  // ── Health check provider ─────────────────────────────────
  async checkProvider(userId: string, providerType: ProviderType) {
    const provider = await this.getProvider(userId, providerType)
    return provider.healthCheck()
  }

  // ── Run premium session ───────────────────────────────────
  async runPremiumSession(
    opts: PremiumSessionOpts,
    sessionCallback: (context: BrowserContext, page: import('playwright').Page) => Promise<void>
  ): Promise<AntidetectSessionResult> {
    const { campaignId, userId, provider: providerType, profileConfig, reuseProfileId } = opts

    this.logger.info(`Starting premium session via ${providerType}`, {
      campaignId,
      profileId: reuseProfileId ?? 'new',
    })

    const provider = await this.getProvider(userId, providerType)

    let profile: AntidetectProfile | null = null
    let browser: Browser | null = null
    const isNewProfile = !reuseProfileId

    try {
      // ── 1. Get or create profile ────────────────────────
      let profileId: string

      if (reuseProfileId) {
        profileId = reuseProfileId
        this.logger.info(`Reusing existing profile: ${profileId}`)
      } else {
        this.logger.info(`Creating new ${providerType} profile...`)
        profile = await provider.createProfile(profileConfig)
        profileId = profile.id
        this.logger.info(`Profile created: ${profileId}`)
      }

      // ── 2. Launch profile → get CDP endpoint ────────────
      this.logger.info(`Launching profile ${profileId}...`)
      const launchResult = await provider.launchProfile(profileId)

      this.logger.info(`Profile launched. CDP: ${launchResult.cdpEndpoint}`)

      // ── 3. Playwright connect via CDP ───────────────────
      // Semua antidetect browser expose CDP endpoint
      // Playwright tinggal connect tanpa perlu inject stealth sendiri
      // karena antidetect browser sudah handle fingerprint consistency
      browser = await chromium.connectOverCDP(launchResult.cdpEndpoint, {
        timeout: 30_000,
      })

      const contexts = browser.contexts()
      let context: BrowserContext

      if (contexts.length > 0) {
        context = contexts[0]!
      } else {
        context = await browser.newContext()
      }

      const page = context.pages()[0] ?? await context.newPage()

      // ── 4. Run session callback (navigate + behavior) ───
      await sessionCallback(context, page)

      // ── 5. Close browser connection ─────────────────────
      await browser.close().catch(() => { })
      browser = null

      // ── 6. Close profile di provider ────────────────────
      await provider.closeProfile(profileId).catch(err => {
        this.logger.warn(`Close profile warning: ${err.message}`)
      })

      return {
        profileId,
        provider: providerType,
        cdpEndpoint: launchResult.cdpEndpoint,
        isReusable: false,
      }

    } catch (err: any) {
      this.logger.error(`Premium session error via ${providerType}`, {
        error: err.message,
        campaignId,
      })

      // Cleanup browser jika masih terbuka
      if (browser) {
        await browser.close().catch(() => { })
      }

      throw err

    } finally {
      // ── 7. Delete profile kalau bukan reuse ─────────────
      if (isNewProfile && profile?.id) {
        try {
          await provider.deleteProfile(profile.id)
          this.logger.info(`Profile ${profile.id} deleted after session`)
        } catch (err: any) {
          this.logger.warn(`Delete profile warning: ${err.message}`)
        }
      }
    }
  }

  // ── List profiles untuk campaign/user ────────────────────
  async listProfiles(
    userId: string,
    providerType: ProviderType,
    page = 1,
    limit = 20,
  ): Promise<AntidetectProfile[]> {
    const provider = await this.getProvider(userId, providerType)
    return provider.listProfiles(page, limit)
  }

  // ── Update proxy di profile yang sudah ada ────────────────
  async updateProfileProxy(
    userId: string,
    providerType: ProviderType,
    profileId: string,
    proxyUrl: string,
  ): Promise<void> {
    const provider = await this.getProvider(userId, providerType)
    await provider.updateProxy(profileId, proxyUrl)
  }
}
