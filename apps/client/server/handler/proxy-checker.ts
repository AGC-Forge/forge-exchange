import { type H3Event } from "h3";
import { IP2Proxy } from 'ip2proxy-nodejs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs'

interface ProxyParseResult {
  host: string;
  port: number;
  username?: string;
  password?: string;
  raw: string;
}

interface ProxyTestResult {
  index: number;
  raw: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  status: "valid" | "error" | "not_supported";
  responseTime?: number;
  error?: string;
  ip?: string;
  country?: string;
  proxyType?: string;
  proxyTypeName?: string;
  countryCode?: string;
  isResidential?: boolean;
  isMobile?: boolean;
  isISP?: boolean;
  isDatacenter?: boolean;
  fraudScore?: number;
}

const config = useRuntimeConfig();


const possibleProdPaths = [
  '/app/server/database/IP-COUNTRY-FULL-REGION-ADDRESS.BIN',
  '/app/.output/server/database/IP-COUNTRY-FULL-REGION-ADDRESS.BIN',
];

const possibleDevPaths = [
  './server/database/IP-COUNTRY-FULL-REGION-ADDRESS.BIN',
  './apps/client/server/database/IP-COUNTRY-FULL-REGION-ADDRESS.BIN',
];

let ip2proxy: any = null;
let isInitialized = false;

const getDatabasePaths = (): string[] => {
  const isDev = config.NODE_ENV === 'development';

  if (isDev) {
    return [
      './server/database/IP2PROXY-LITE-PX10.BIN',
      './apps/client/server/database/IP2PROXY-LITE-PX10.BIN',
      join(process.cwd(), 'server/database/IP2PROXY-LITE-PX10.BIN'),
      join(process.cwd(), 'apps/client/server/database/IP2PROXY-LITE-PX10.BIN'),
    ];
  }

  // Production paths (Docker)
  return [
    '/app/server/database/IP2PROXY-LITE-PX10.BIN',
    '/app/.output/server/database/IP2PROXY-LITE-PX10.BIN',
    join(process.cwd(), 'server/database/IP2PROXY-LITE-PX10.BIN'),
  ];
};
const findDatabasePath = (): string | null => {
  const paths = getDatabasePaths();

  for (const path of paths) {
    try {
      if (existsSync(path)) {
        console.log(`✅ Found IP2Proxy database at: ${path}`);
        return path;
      }
    } catch (err) {
      // Skip jika error
    }
  }

  console.warn('⚠️ IP2Proxy database not found in any expected locations');
  return null;
};

function initIP2Proxy() {
  if (isInitialized && ip2proxy) return ip2proxy;

  try {
    const dbPath = findDatabasePath();
    if (!dbPath) {
      console.warn('Database path not found, proxy classification will be disabled');
      return null;
    }

    ip2proxy = new IP2Proxy();
    ip2proxy.open(dbPath);
    isInitialized = true;
    console.log('IP2Proxy database loaded successfully');
    return ip2proxy;
  } catch (err) {
    console.error('Failed to load IP2Proxy database:', err);
    return null;
  }
}

function classifyProxyType(ip: string): Partial<ProxyTestResult> {
  if (!isInitialized || !ip2proxy) {
    return {
      proxyType: 'unknown',
      proxyTypeName: 'Unknown',
      isResidential: false,
      isMobile: false,
      isISP: false,
      isDatacenter: false
    };
  }

  try {
    const result = ip2proxy.get(ip);
    if (!result) {
      return {
        proxyType: 'unknown',
        proxyTypeName: 'Unable to classify',
        isResidential: false,
        isMobile: false,
        isISP: false,
        isDatacenter: false
      };
    }

    const proxyTypeMap: Record<string, string> = {
      'VPN': 'VPN',
      'TOR': 'Tor',
      'DCH': 'Datacenter',
      'PUB': 'Public',
      'WEB': 'Web',
      'RES': 'Residential',
      'MOB': 'Mobile',
      'ISP': 'ISP',
      'SES': 'Search Engine',
      'COM': 'Commercial',
      'SPI': 'Satellite Provider',
      'ORG': 'Organization'
    };

    const proxyTypeCode = result.proxyType || '';
    const proxyTypeName = proxyTypeMap[proxyTypeCode] || proxyTypeCode || 'Unknown';

    return {
      proxyType: proxyTypeCode,
      proxyTypeName: proxyTypeName,
      country: result.countryName,
      countryCode: result.countryCode,
      isResidential: proxyTypeCode === 'RES',
      isMobile: proxyTypeCode === 'MOB',
      isISP: proxyTypeCode === 'ISP' || proxyTypeCode === 'SES',
      isDatacenter: proxyTypeCode === 'DCH' || proxyTypeCode === 'COM',
      fraudScore: result.fraudScore
    };
  } catch (err) {
    console.error(`Failed to classify IP ${ip}:`, err);
    return {};
  }
}
function parseProxyLine(line: string, formatter: string): ProxyParseResult | null {
  try {
    let host = "";
    let port = 0;
    let username: string | undefined;
    let password: string | undefined;

    let cleanLine = line.replace(/^(socks5|socks4|http|https):\/\//, '');

    switch (formatter) {
      case "user:pass@host:port": {
        const atIdx = cleanLine.lastIndexOf("@");
        if (atIdx === -1) return null;
        const userPass = cleanLine.slice(0, atIdx);
        const hostPort = cleanLine.slice(atIdx + 1);
        const colonIdx = hostPort.lastIndexOf(":");
        if (colonIdx === -1) return null;
        const hp = userPass.split(":");
        if (hp.length < 2) return null;
        username = hp[0];
        password = hp.slice(1).join(":");
        host = hostPort.slice(0, colonIdx);
        port = parseInt(hostPort.slice(colonIdx + 1), 10);
        break;
      }
      case "user:pass:host:port": {
        const parts = cleanLine.split(":");
        if (parts.length < 4) return null;
        username = parts[0];
        password = parts[1];
        host = parts[2] || "";
        port = parseInt(parts[3] || "", 10);
        break;
      }
      case "host:port@user:pass": {
        const atIdx = line.lastIndexOf("@");
        if (atIdx === -1) return null;
        const hostPort = line.slice(0, atIdx);
        const userPass = line.slice(atIdx + 1);
        const colonIdx = hostPort.lastIndexOf(":");
        if (colonIdx === -1) return null;
        const hp = userPass.split(":");
        if (hp.length < 2) return null;
        host = hostPort.slice(0, colonIdx);
        port = parseInt(hostPort.slice(colonIdx + 1), 10);
        username = hp[0];
        password = hp.slice(1).join(":");
        break;
      }
      case "host:port:user:pass": {
        const parts = line.split(":");
        if (parts.length < 4) return null;
        host = parts[0] || "";
        port = parseInt(parts[1] || "", 10);
        username = parts[2];
        password = parts.slice(3).join(":");
        break;
      }
      case "host:port": {
        const colonIdx = cleanLine.lastIndexOf(":");
        if (colonIdx === -1) return null;
        host = cleanLine.slice(0, colonIdx);
        const afterHost = cleanLine.slice(colonIdx + 1);
        port = parseInt(afterHost.split(':')[0] || "", 10);
        break;
      }
      case "user:pass@host:port:country": {
        const atIdx = line.lastIndexOf("@");
        if (atIdx === -1) return null;
        const userPass = line.slice(0, atIdx);
        const hostPortCountry = line.slice(atIdx + 1);
        const parts = hostPortCountry.split(":");
        if (parts.length < 3) return null;
        const hp = userPass.split(":");
        if (hp.length < 2) return null;
        username = hp[0];
        password = hp.slice(1).join(":");
        host = parts[0] || "";
        port = parseInt(parts[1] || "", 10);
        break;
      }
      case "user:pass:host:port:country": {
        const parts = line.split(":");
        if (parts.length < 5) return null;
        username = parts[0];
        password = parts[1];
        host = parts[2] || "";
        port = parseInt(parts[3] || "", 10);
        break;
      }
      default:
        const colonIdx = cleanLine.lastIndexOf(":");
        if (colonIdx !== -1) {
          host = cleanLine.slice(0, colonIdx);
          port = parseInt(cleanLine.slice(colonIdx + 1), 10);
        }
        break;
    }

    if (!host || !port || isNaN(port) || port < 1 || port > 65535) return null;
    return { host, port, username, password, raw: line };
  } catch {
    return null;
  }
}
async function testProxyV1(parsed: ProxyParseResult, targetUrl: string, proxyType: string): Promise<ProxyTestResult> {
  const startTime = Date.now();
  const { host, port, username, password } = parsed;

  // Build proxy agent URL
  let proxyUrl = "";
  if (username && password) {
    proxyUrl = `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`;
  } else {
    proxyUrl = `http://${host}:${port}`;
  }

  const agent = proxyType === "socks5"
    ? `socks5://${username && password ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : ""}${host}:${port}`
    : proxyUrl;

  try {
    const response = await $fetch(targetUrl, {
      method: "GET",
      headers: { Accept: "*/*" },
      // @ts-ignore — H3/Nitro supports httpAgent per-request
      proxy: agent,
      timeout: 8000,
    } as any);

    const responseTime = Date.now() - startTime;

    // Try to extract IP from response
    let ip: string | undefined;
    let country: string | undefined;

    if (typeof response === "string") {
      ip = response.trim();
    } else if (response && typeof response === "object") {
      const r = response as any;
      ip = r.ip || r.origin || (typeof r.headers?.["x-real-ip"] === "string" ? r.headers["x-real-ip"] : undefined);
      country = r.country || r.loc?.split(",")[1]?.trim();
    }

    return {
      index: parsed.raw ? 0 : 0,
      raw: parsed.raw,
      host: parsed.host,
      port: parsed.port,
      username: parsed.username,
      password: parsed.password,
      status: "valid",
      responseTime,
      ip,
      country,
    };
  } catch (err: any) {
    const responseTime = Date.now() - startTime;
    const message = err?.message || "Connection failed";
    const status: "error" | "not_supported" =
      message.includes("ENOTFOUND") || message.includes("ECONNREFUSED") || message.includes("ETIMEDOUT") || message.includes("socket")
        ? "not_supported"
        : "error";

    return {
      index: 0,
      raw: parsed.raw,
      host: parsed.host,
      port: parsed.port,
      username: parsed.username,
      password: parsed.password,
      status,
      responseTime,
      error: message,
    };
  }
}
async function testProxyV2(parsed: ProxyParseResult, proxyType: string): Promise<ProxyTestResult> {
  const startTime = Date.now();
  const { host, port, username, password } = parsed;

  // Cek koneksi dasar tanpa perlu target URL
  // Gunakan simple TCP connection test
  const isReachable = await testTCPConnection(host, port);

  const responseTime = Date.now() - startTime;

  if (!isReachable) {
    return {
      index: 0,
      raw: parsed.raw,
      host: parsed.host,
      port: parsed.port,
      username: parsed.username,
      password: parsed.password,
      status: "not_supported",
      responseTime,
      error: "Connection failed or proxy unreachable",
    };
  }

  // Dapatkan klasifikasi proxy berdasarkan IP
  const classification = classifyProxyType(host);

  return {
    index: 0,
    raw: parsed.raw,
    host: parsed.host,
    port: parsed.port,
    username: parsed.username,
    password: parsed.password,
    status: "valid",
    responseTime,
    ...classification
  };
}
async function testTCPConnection(host: string, port: number): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    const net = await import('net');
    const socket = new net.Socket();

    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 5000);

    socket.connect(port, host, () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}
async function testProxyWithSimpleRequest(parsed: ProxyParseResult): Promise<boolean> {
  const { host, port, username, password } = parsed;

  const proxyUrl = username && password
    ? `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`
    : `http://${host}:${port}`;

  try {
    // Request ke localhost atau test simple
    await $fetch('http://httpbin.org/ip', {
      method: 'GET',
      proxy: proxyUrl,
      timeout: 8000,
    } as any);
    return true;
  } catch {
    return false;
  }
}
export const proxyCheckerHandler = async (event: H3Event) => {
  try {
    const body = await readBody(event);
    const parsed = bulkProxyCheckerSchema.safeParse(body);

    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: parsed.error.issues.map(i => i.message).join(", "),
      });
    }

    initIP2Proxy();

    const { proxyType, formatter, proxies } = parsed.data;

    const results: ProxyTestResult[] = [];

    const concurrency = 10;
    for (let i = 0; i < proxies.length; i += concurrency) {
      const batch = proxies.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(async (raw, idx) => {
          const actualIndex = i + idx;
          const parsedProxy = parseProxyLine(raw || "", formatter);

          if (!parsedProxy) {
            return {
              index: actualIndex + 1,
              raw: raw || "",
              host: "",
              port: 0,
              status: "error" as const,
              error: "Unrecognized proxy format",
            };
          }

          const result = await testProxyV2(parsedProxy, proxyType);
          result.index = actualIndex + 1;
          return result;
        })
      );
      results.push(...batchResults);
    }

    const valid = results.filter(r => r.status === "valid").length;
    const error = results.filter(r => r.status === "error").length;
    const notSupported = results.filter(r => r.status === "not_supported").length;

    const proxyTypeStats = {
      residential: results.filter(r => r.isResidential && r.status === "valid").length,
      mobile: results.filter(r => r.isMobile && r.status === "valid").length,
      isp: results.filter(r => r.isISP && r.status === "valid").length,
      datacenter: results.filter(r => r.isDatacenter && r.status === "valid").length,
      unknown: results.filter(r => !r.isResidential && !r.isMobile && !r.isISP && !r.isDatacenter && r.status === "valid").length,
    };


    return {
      success: true,
      message: `Check complete — ${valid} valid, ${error} error, ${notSupported} not supported`,
      data: {
        total: results.length,
        valid,
        error,
        notSupported,
        proxyTypeStats,
        results,
      },
    };
  } catch (err) {
    throw handleRequestError(err);
  }
}
