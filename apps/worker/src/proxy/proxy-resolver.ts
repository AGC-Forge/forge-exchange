// Opsi B Hybrid Proxy — resolve proxy dari pool ATAU integration
// Dipanggil oleh session-runner & premium-session-runner sebelum launch browser

import { prismaWorker } from '@forge-exchange/db'
import type { GeoTarget, ResolvedProxy } from '@forge-exchange/worker-kit'
import type { WorkerLogger } from '../utils/logger.js'

const INTEGRATION_PROXY_TYPES: Record<string, string> = {
  brightdata: 'residential',
  oxylabs: 'residential',
  iproyal: 'residential',
  smartproxy: 'residential',
  mobile_proxy: 'mobile',
  socks5_proxy: 'socks5',
  rotating_proxy: 'rotating',
  residential_proxy: 'residential',
}

export class ProxyResolver {
  private logger: WorkerLogger

  constructor(logger: WorkerLogger) {
    this.logger = logger
  }

  async resolve(geoTarget: GeoTarget | null): Promise<ResolvedProxy | null> {
    if (!geoTarget) return null

    const { proxySource, proxyPoolId, integrationId } = geoTarget

    if (proxySource === 'pool' && proxyPoolId) {
      return this.resolveFromPool(proxyPoolId)
    }

    if (proxySource === 'integration' && integrationId) {
      return this.resolveFromIntegration(integrationId, geoTarget.country)
    }

    return null
  }

  private async resolveFromPool(proxyPoolId: string): Promise<ResolvedProxy | null> {
    const proxy = await prismaWorker.proxyPool.findUnique({
      where: { id: proxyPoolId, status: 'active' },
      select: {
        id: true, type: true, host: true, port: true,
        username: true, password: true, country: true,
      },
    })

    if (!proxy) {
      this.logger.warn('ProxyResolver: proxyPool not found or inactive', { proxyPoolId })
      return null
    }

    return {
      id: proxy.id,
      source: 'pool',
      type: proxy.type,
      host: proxy.host,
      port: proxy.port,
      username: proxy.username ?? undefined,
      password: proxy.password ?? undefined,
      country: proxy.country ?? undefined,
    }
  }

  private async resolveFromIntegration(
    integrationId: string,
    country: string,
  ): Promise<ResolvedProxy | null> {
    const integration = await prismaWorker.integration.findUnique({
      where: { id: integrationId, isActive: true },
      select: {
        id: true, type: true, isHealthy: true,
        credentials: true, name: true,
      },
    })

    if (!integration) {
      this.logger.warn('ProxyResolver: integration not found or inactive', { integrationId })
      return null
    }

    if (integration.isHealthy === false) {
      this.logger.warn('ProxyResolver: integration marked unhealthy, using anyway', {
        integrationId, type: integration.type,
      })
    }

    const creds = integration.credentials as Record<string, string>
    const proxyType = INTEGRATION_PROXY_TYPES[integration.type] ?? 'http'

    // Setiap provider punya format credentials yang berbeda
    return this.buildFromCredentials(integration.type, proxyType, creds, country)
  }

  private buildFromCredentials(
    integrationType: string,
    proxyType: string,
    creds: Record<string, string>,
    country: string,
  ): ResolvedProxy | null {

    switch (integrationType) {

      // ── Bright Data ───────────────────────────────────────
      // Format: username = brd-customer-XXX-zone-YYY-country-ZZ
      case 'brightdata': {
        const host = creds.host ?? 'brd.superproxy.io'
        const port = parseInt(creds.port ?? '22225', 10)
        if (!creds.username || !creds.password) return null
        // Inject country ke username: append -country-{CC} jika belum ada
        const username = creds.username.includes('-country-')
          ? creds.username
          : `${creds.username}-country-${country.toLowerCase()}`
        return {
          source: 'integration', type: proxyType,
          host, port, username, password: creds.password, country,
        }
      }

      // ── Oxylabs ───────────────────────────────────────────
      // Format: username = customer_user-cc-{country}
      case 'oxylabs': {
        const host = creds.host ?? 'pr.oxylabs.io'
        const port = parseInt(creds.port ?? '7777', 10)
        if (!creds.username || !creds.password) return null
        const username = `${creds.username}-cc-${country.toLowerCase()}`
        return {
          source: 'integration', type: proxyType,
          host, port, username, password: creds.password, country,
        }
      }

      // ── IPRoyal ───────────────────────────────────────────
      case 'iproyal': {
        const host = creds.host ?? 'geo.iproyal.com'
        const port = parseInt(creds.port ?? '32325', 10)
        if (!creds.username || !creds.password) return null
        const username = `${creds.username}_country-${country.toLowerCase()}`
        return {
          source: 'integration', type: proxyType,
          host, port, username, password: creds.password, country,
        }
      }

      // ── Smartproxy ────────────────────────────────────────
      case 'smartproxy': {
        const host = creds.host ?? 'gate.smartproxy.com'
        const port = parseInt(creds.port ?? '7000', 10)
        if (!creds.username || !creds.password) return null
        const username = `${creds.username}-country-${country.toLowerCase()}`
        return {
          source: 'integration', type: proxyType,
          host, port, username, password: creds.password, country,
        }
      }

      // ── Mobile Proxy / SOCKS5 / Rotating — custom endpoint ──
      case 'mobile_proxy':
      case 'socks5_proxy':
      case 'rotating_proxy':
      case 'residential_proxy': {
        const host = creds.host
        const port = parseInt(creds.port ?? '8080', 10)
        if (!host) return null
        return {
          source: 'integration',
          type: INTEGRATION_PROXY_TYPES[integrationType] ?? proxyType,
          host, port,
          username: creds.username || undefined,
          password: creds.password || undefined,
          country,
          rotateUrl: creds.rotateUrl || undefined,
        }
      }

      default: {
        // Fallback generic: pakai host/port dari credentials
        const host = creds.host
        const port = parseInt(creds.port ?? '8080', 10)
        if (!host) {
          this.logger.warn('ProxyResolver: cannot build proxy URL for integration type', {
            integrationType,
          })
          return null
        }
        return {
          source: 'integration', type: proxyType,
          host, port,
          username: creds.username || undefined,
          password: creds.password || undefined,
          country,
        }
      }
    }
  }

  async rotateIfSupported(proxy: ResolvedProxy): Promise<boolean> {
    if (!proxy.rotateUrl) return false
    try {
      const res = await fetch(proxy.rotateUrl, {
        signal: AbortSignal.timeout(5000),
      })
      this.logger.info('ProxyResolver: IP rotated', {
        rotateUrl: proxy.rotateUrl, status: res.status,
      })
      return res.ok
    } catch (err: any) {
      this.logger.warn('ProxyResolver: rotate failed', { error: err.message })
      return false
    }
  }
}
