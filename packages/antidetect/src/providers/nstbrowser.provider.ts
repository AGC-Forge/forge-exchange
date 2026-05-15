import { execSync, spawn } from 'node:child_process'
import { BaseAntidetectProvider } from './base.provider.js'
import type {
  ProviderCredentials, HealthCheckResult,
  AntidetectProfileConfig, AntidetectProfile, LaunchResult,
} from '../types/index.js'

export class NstbrowserProvider extends BaseAntidetectProvider {
  /**
   * Update proxy configuration for an existing profile
   * Implements the abstract method from BaseAntidetectProvider
   */
  async updateProxy(profileId: string, proxyUrl: string | null): Promise<void> {
    const token = this.credentials.apiKey ?? process.env.TOKEN ?? '';

    // Build proxy flag - if proxyUrl is null, use --remove-proxy to clear existing proxy
    const proxyFlag = proxyUrl ? `--proxy "${proxyUrl}"` : '--remove-proxy';

    try {
      execSync(`TOKEN=${token} nstcli update ${profileId} ${proxyFlag}`, {
        timeout: 10000,
        encoding: 'utf8',
      });
    } catch (err: any) {
      throw new Error(`Failed to update proxy for profile ${profileId}: ${err.message}`);
    }
  }
  readonly type = 'nstbrowser' as const

  // Port agent (default 8848) — untuk manage, bukan REST API
  private get agentPort(): number {
    return this.credentials.apiPort ?? 8848
  }

  constructor(credentials: ProviderCredentials) {
    super(credentials)
  }

  // ── Health check via nstcli info ──────────────────────────
  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now()
    try {
      const token = this.credentials.apiKey ?? process.env.TOKEN ?? ''
      const out = execSync(`TOKEN=${token} nstcli info 2>&1`, {
        timeout: 8000,
        encoding: 'utf8',
      })

      // nstcli info return JSON
      const info = JSON.parse(out.trim())
      const agentVersion = info?.agent?.version ?? 'unknown'
      const profileCount = info?.profile?.profiles ?? 0

      return {
        healthy: true,
        provider: this.type,
        latencyMs: Date.now() - start,
        message: `nst-agent ${agentVersion} running. Profiles: ${profileCount}`,
      }
    } catch (err: any) {
      const msg = err?.message ?? String(err)
      const isNotRunning = msg.includes('not running') || msg.includes('connection refused')

      return {
        healthy: false,
        provider: this.type,
        message: isNotRunning
          ? `nst-agent tidak berjalan di port ${this.agentPort}. Jalankan: systemctl start nstbrowser`
          : `nstcli error: ${msg.slice(0, 100)}`,
      }
    }
  }

  // ── Create profile via nstcli create ─────────────────────
  async createProfile(config: AntidetectProfileConfig): Promise<AntidetectProfile> {
    const token = this.credentials.apiKey ?? process.env.TOKEN ?? ''

    const platformMap: Record<string, string> = {
      windows: 'Windows',
      macos: 'macOS',
      linux: 'Linux',
    }
    const platform = platformMap[config.os] ?? 'Windows'

    // Build proxy flag
    let proxyFlag = ''
    if (config.proxyUrl) {
      proxyFlag = `--proxy "${config.proxyUrl}"`
    }

    const cmd = [
      `TOKEN=${token}`,
      'nstcli create',
      `"${config.name}"`,
      `--platform ${platform}`,
      proxyFlag,
    ].filter(Boolean).join(' ')

    const out = execSync(cmd, { timeout: 15000, encoding: 'utf8' }).trim()

    // nstcli create output: profile ID (UUID)
    const profileId = out.trim()
    if (!profileId || profileId.length < 30) {
      throw new Error(`nstcli create gagal: ${out}`)
    }

    return {
      id: profileId,
      name: config.name,
      provider: this.type,
      status: 'active',
      createdAt: new Date(),
      meta: { platform, profileId },
    }
  }

  // ── Launch profile via nstcli run + connect CDP ───────────
  async launchProfile(profileId: string): Promise<LaunchResult> {
    const token = this.credentials.apiKey ?? process.env.TOKEN ?? ''

    // 1. Launch profile via nstcli run (non-blocking)
    const child = spawn('sh', ['-c', `TOKEN=${token} nstcli run ${profileId}`], {
      detached: true,
      stdio: 'ignore',
    })
    child.unref()

    // 2. Poll CDP port sampai browser siap (max 30s)
    // CDP port ada di 127.0.0.1:XXXXX/json/version — port dinamis
    const cdpEndpoint = await this.waitForCDP(profileId, token, 30000)

    if (!cdpEndpoint) {
      throw new Error(
        `Nstbrowser: CDP endpoint tidak ditemukan setelah 30s untuk profile ${profileId}`
      )
    }

    return {
      profileId,
      cdpEndpoint,
      port: Number(cdpEndpoint.split(':')[2]),
      provider: this.type,
    }
  }

  // ── Poll CDP port yang dibuka oleh nstchrome ──────────────
  private async waitForCDP(
    profileId: string,
    token: string,
    timeoutMs: number,
  ): Promise<string | null> {
    const deadline = Date.now() + timeoutMs
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

    while (Date.now() < deadline) {
      await sleep(1500)

      try {
        // Cek semua port yang didengarkan nstchrome
        const portsOut = execSync(
          "ss -tlnp 2>/dev/null | grep nstchrome | awk '{print $4}' | sed 's/.*://'",
          { timeout: 3000, encoding: 'utf8' }
        ).trim()

        const ports = portsOut.split('\n').filter(p => p && Number(p) > 0)

        for (const port of ports) {
          try {
            const res = await this.fetchWithTimeout(
              `http://127.0.0.1:${port}/json/version`,
              {},
              2000,
            )
            if (res?.webSocketDebuggerUrl) {
              return res.webSocketDebuggerUrl  // ws://127.0.0.1:PORT/devtools/browser/UUID
            }
          } catch { /* port belum ready */ }
        }
      } catch { /* ss command error */ }
    }

    return null
  }

  // ── Close profile via nstcli stop ─────────────────────────
  async closeProfile(profileId: string): Promise<void> {
    const token = this.credentials.apiKey ?? process.env.TOKEN ?? ''
    try {
      execSync(`TOKEN=${token} nstcli stop ${profileId} 2>&1`, {
        timeout: 10000,
        encoding: 'utf8',
      })
    } catch (err: any) {
      // Abaikan jika profile sudah stop
      if (!err.message?.includes('not running')) throw err
    }
  }

  // ── Delete profile via nstcli rm ──────────────────────────
  async deleteProfile(profileId: string): Promise<void> {
    const token = this.credentials.apiKey ?? process.env.TOKEN ?? ''
    execSync(`TOKEN=${token} nstcli rm ${profileId} 2>&1`, {
      timeout: 10000,
      encoding: 'utf8',
    })
  }

  // ── List profiles via nstcli ps ───────────────────────────
  async listProfiles(): Promise<AntidetectProfile[]> {
    const token = this.credentials.apiKey ?? process.env.TOKEN ?? ''
    try {
      // nstcli ps --json jika ada, atau parse text output
      const out = execSync(`TOKEN=${token} nstcli ps 2>&1`, {
        timeout: 8000,
        encoding: 'utf8',
      })

      // Parse text table output dari nstcli ps
      const lines = out.trim().split('\n').slice(1) // skip header
      return lines
        .filter(l => l.trim())
        .map(l => {
          const parts = l.trim().split(/\s{2,}/)
          return {
            id: parts[1] ?? '',
            name: parts[0] ?? '',
            provider: this.type,
            status: (parts[4] ?? 'Stop').toLowerCase() === 'running' ? 'active' : 'inactive',
            createdAt: new Date(),
          } as AntidetectProfile
        })
    } catch {
      return []
    }
  }
}

