// ============================================================
// Proxy Manager — worker/proxy/proxy-manager.ts
// Build proxy URL, select proxy, validate connection
// ============================================================

import type { WorkerLogger } from "../utils/logger.js";

export interface ProxyConfig {
  id: string;
  type: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  country?: string;
}

export class ProxyManager {
  private logger: WorkerLogger;

  constructor(logger: WorkerLogger) {
    this.logger = logger;
  }

  // ── Build playwright proxy URL ────────────────────────────
  buildProxyUrl(proxy: ProxyConfig): string {
    const scheme = proxy.type === "socks5" ? "socks5" : "http";

    if (proxy.username && proxy.password) {
      return `${scheme}://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
    }

    return `${scheme}://${proxy.host}:${proxy.port}`;
  }

  // ── Build playwright proxy object ─────────────────────────
  buildProxyObject(proxy: ProxyConfig): {
    server: string;
    username?: string;
    password?: string;
  } {
    const server = `${proxy.type === "socks5" ? "socks5" : "http"}://${proxy.host}:${proxy.port}`;
    return {
      server,
      ...(proxy.username && { username: proxy.username }),
      ...(proxy.password && { password: proxy.password }),
    };
  }

  // ── Select best proxy from pool for a GEO target ─────────
  selectProxy(proxies: ProxyConfig[], country?: string): ProxyConfig | null {
    if (!proxies.length) return null;

    // Filter by country jika ada target
    const filtered = country
      ? proxies.filter((p) => p.country === country)
      : proxies;

    if (!filtered.length)
      return proxies[Math.floor(Math.random() * proxies.length)];

    // Random dari yang sesuai country
    return filtered[Math.floor(Math.random() * filtered.length)];
  }

  // ── Validate proxy is reachable (lightweight check) ───────
  async validateProxy(
    proxy: ProxyConfig,
    timeoutMs = 5000,
  ): Promise<{
    success: boolean;
    responseTime: number;
    ipReturned?: string;
  }> {
    const start = Date.now();

    try {
      const proxyUrl = this.buildProxyUrl(proxy);

      // Use native fetch dengan proxy via undici (Nuxt/Node 18+)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch("https://api.ipify.org?format=json", {
        signal: controller.signal,
        // @ts-ignore — undici proxy support
        dispatcher: new (await import("undici")).ProxyAgent(proxyUrl),
      });

      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = (await res.json()) as { ip: string };

      return {
        success: true,
        responseTime: Date.now() - start,
        ipReturned: data.ip,
      };
    } catch (err: any) {
      this.logger.warn(`Proxy validation failed: ${proxy.host}:${proxy.port}`, {
        error: err.message,
      });
      return {
        success: false,
        responseTime: Date.now() - start,
      };
    }
  }

  // ── Get geolocation hint from proxy country ───────────────
  getGeoHint(country?: string): {
    latitude: number;
    longitude: number;
    accuracy: number;
  } {
    const geoMap: Record<string, [number, number]> = {
      US: [37.0902, -95.7129],
      GB: [55.3781, -3.436],
      DE: [51.1657, 10.4515],
      FR: [46.2276, 2.2137],
      JP: [36.2048, 138.2529],
      ID: [-0.7893, 113.9213],
      SG: [1.3521, 103.8198],
      AU: [-25.2744, 133.7751],
      BR: [-14.235, -51.9253],
      IN: [20.5937, 78.9629],
      NL: [52.1326, 5.2913],
      CA: [56.1304, -106.3468],
    };

    const [lat, lng] = geoMap[country ?? "US"] ?? [37.0902, -95.7129];

    // Add small random offset to avoid exact same coordinates
    return {
      latitude: lat + (Math.random() - 0.5) * 2,
      longitude: lng + (Math.random() - 0.5) * 2,
      accuracy: Math.floor(10 + Math.random() * 50),
    };
  }
}
