
export async function testProxy(proxy: {
  id?: string
  type: string
  host: string
  port: number
  username?: string | null
  password?: string | null
}, timeoutMs = 10_000): Promise<ProxyTestResult> {
  const start = Date.now()

  try {
    const proxyUrl = buildProxyUrl(proxy)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    // Test via ipify untuk dapat IP yang digunakan proxy
    const res = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
      // @ts-ignore — undici ProxyAgent
      dispatcher: new (await import('undici')).ProxyAgent(proxyUrl),
    })

    clearTimeout(timer)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json() as { ip: string }
    const responseTime = Date.now() - start

    // Check blacklist (basic — cek apakah IP sama dengan host, artinya proxy transparan)
    const isTransparent = data.ip === proxy.host

    return {
      success: true,
      responseTime,
      ipReturned: data.ip,
      isBlacklisted: isTransparent,
    }
  } catch (err: any) {
    return {
      success: false,
      responseTime: Date.now() - start,
      error: err.name === 'AbortError' ? 'Timeout' : err.message,
    }
  }
}

// ── Test & update proxy DB record ─────────────────────────────
export async function testAndUpdateProxy(proxyId: string): Promise<ProxyTestResult> {
  const proxy = await prisma.proxyPool.findUnique({
    where: { id: proxyId },
    select: {
      id: true, type: true, host: true, port: true,
      username: true, password: true,
    },
  })

  if (!proxy) throw new Error('Proxy tidak ditemukan')

  // Mark as testing
  await prisma.proxyPool.update({
    where: { id: proxyId },
    data: { status: 'testing' },
  })

  const result = await testProxy(proxy)

  // Update DB dengan hasil test
  await prisma.proxyPool.update({
    where: { id: proxyId },
    data: {
      status: result.success ? 'active' : 'error',
      lastTestedAt: new Date(),
      responseTimeMs: result.responseTime,
      isBlacklisted: result.isBlacklisted ?? false,
      blacklistCheckedAt: new Date(),
    },
  })

  // Log result
  await prisma.proxyLog.create({
    data: {
      proxyId,
      success: result.success,
      responseTime: result.responseTime,
      errorMessage: result.error ?? null,
      ipReturned: result.ipReturned ?? null,
    },
  })

  return result
}

// ── Bulk health check (background) ───────────────────────────
export async function runBulkHealthCheck(userId: string): Promise<{
  total: number
  passed: number
  failed: number
}> {
  const proxies = await prisma.proxyPool.findMany({
    where: { userId, deletedAt: null, status: { not: 'banned' } },
    select: { id: true, type: true, host: true, port: true, username: true, password: true },
    take: 50, // max 50 per run
  })

  let passed = 0
  let failed = 0

  // Test max 5 concurrent
  const chunks = chunkArray(proxies, 5)
  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async (proxy) => {
        const result = await testProxy(proxy)
        result.success ? passed++ : failed++

        await prisma.proxyPool.update({
          where: { id: proxy.id },
          data: {
            status: result.success ? 'active' : 'error',
            lastTestedAt: new Date(),
            responseTimeMs: result.responseTime,
          },
        })

        await prisma.proxyLog.create({
          data: {
            proxyId: proxy.id,
            success: result.success,
            responseTime: result.responseTime,
            errorMessage: result.error ?? null,
            ipReturned: result.ipReturned ?? null,
          },
        })
      })
    )
  }

  return { total: proxies.length, passed, failed }
}

// ── Parse proxy line (bulk import) ───────────────────────────
export function parseProxyLine(line: string, defaultType: string): {
  host: string
  port: number
  username?: string
  password?: string
  type: string
  country?: string
} | null {
  line = line.trim()
  if (!line || line.startsWith('#')) return null

  // Format 1: type://user:pass@host:port
  // Format 2: type://host:port
  const urlMatch = line.match(/^(https?|socks5?):\/\/(?:([^:@]+):([^@]*)@)?([^:@]+):(\d+)(?::([A-Z]{2}))?$/i)
  if (urlMatch) {
    return {
      type: urlMatch?.[1]?.toLowerCase().replace('socks5', 'socks5') || defaultType,
      username: urlMatch?.[2] || undefined,
      password: urlMatch?.[3] || undefined,
      host: urlMatch?.[4] || '',
      port: parseInt(urlMatch?.[5] || '0'),
      country: urlMatch?.[6]?.toUpperCase() || undefined,
    }
  }

  // Format 3: host:port:user:pass:type:country
  // Format 4: host:port:user:pass
  // Format 5: host:port
  const parts = line.split(':')
  if (parts.length >= 2) {
    const host = parts[0] || ''
    const port = parseInt(parts[1] || '0')
    const username = parts[2] || undefined
    const password = parts[3] || undefined
    const type = parts[4]?.toLowerCase() || defaultType
    const country = parts[5]?.toUpperCase() || undefined

    if (!host || isNaN(port)) return null

    return { host, port, username, password, type, country }
  }

  return null
}

// ── Helpers ───────────────────────────────────────────────────
function buildProxyUrl(proxy: {
  type: string; host: string; port: number
  username?: string | null; password?: string | null
}): string {
  const scheme = proxy.type === 'socks5' ? 'socks5' : 'http'
  if (proxy.username && proxy.password) {
    return `${scheme}://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`
  }
  return `${scheme}://${proxy.host}:${proxy.port}`
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}
