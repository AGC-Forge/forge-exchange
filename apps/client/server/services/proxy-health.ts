
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

    if (proxyUrl.startsWith('socks5://')) {
      const { ip } = await testSocks5Tunnel(proxyUrl, timeoutMs)
      return {
        success: true,
        responseTime: Date.now() - start,
        ipReturned: ip,
        isBlacklisted: false,
      }
    } else {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      const res = await fetch('https://api.ipify.org?format=json', {
        signal: controller.signal,
        // @ts-ignore — undici ProxyAgent
        dispatcher: new (await import('undici')).ProxyAgent(proxyUrl),
      })

      clearTimeout(timer)

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json() as { ip: string }
      return {
        success: true,
        responseTime: Date.now() - start,
        ipReturned: data.ip,
        isBlacklisted: false,
      }
    }
  } catch (err: any) {
    const code = err?.cause?.code || err?.code
    const base = err?.name === 'AbortError' ? 'Timeout' : (err?.message ?? 'fetch failed')
    const message = code ? `${base} (${code})` : base
    return {
      success: false,
      responseTime: Date.now() - start,
      error: message,
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
  if (
    (line.startsWith('`') && line.endsWith('`')) ||
    (line.startsWith('"') && line.endsWith('"')) ||
    (line.startsWith("'") && line.endsWith("'"))
  ) {
    line = line.slice(1, -1).trim()
  }
  if (!line || line.startsWith('#')) return null

  // Format 1: type://user:pass@host:port
  // Format 2: type://host:port
  const urlMatch = line.match(/^(https?|socks5h?|socks4):\/\/(?:([^:@]+):([^@]*)@)?([^:@]+):(\d+)(?::([A-Z]{2}))?$/i)
  if (urlMatch) {
    const rawType = (urlMatch?.[1] ?? defaultType).toLowerCase()
    const type =
      rawType === 'socks5h' ? 'socks5'
        : rawType === 'socks4' ? 'socks5'
          : rawType
    return {
      type,
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
  const raw = (proxy.type || '').toLowerCase()
  const scheme =
    raw === 'https' ? 'https'
      : raw === 'socks5' || raw === 'socks5h' || raw === 'socks4' ? 'socks5'
        : 'http'
  if (proxy.username && proxy.password) {
    return `${scheme}://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`
  }
  return `${scheme}://${proxy.host}:${proxy.port}`
}

async function testSocks5Tunnel(proxyUrl: string, timeoutMs: number): Promise<{ ip: string }> {
  const { hostname, port, username, password } = parseProxyUrl(proxyUrl)
  const targetHost = 'api.ipify.org'
  const targetPort = 443

  const net = await import('node:net')
  const tls = await import('node:tls')

  const socket = net.createConnection({ host: hostname, port })
  const timeout = setTimeout(() => socket.destroy(new Error('Timeout')), timeoutMs)

  try {
    await onceConnect(socket)

    const methods: number[] = [0x00]
    if (username && password) methods.unshift(0x02)
    socket.write(Buffer.from([0x05, methods.length, ...methods]))

    const choice = await readExact(socket, 2)
    if (choice[0] !== 0x05) throw new Error('Invalid SOCKS version')
    if (choice[1] === 0xff) throw new Error('SOCKS authentication not accepted')

    if (choice[1] === 0x02) {
      const u = Buffer.from(username ?? '', 'utf8')
      const p = Buffer.from(password ?? '', 'utf8')
      if (u.length > 255 || p.length > 255) throw new Error('SOCKS auth too long')
      socket.write(Buffer.concat([Buffer.from([0x01, u.length]), u, Buffer.from([p.length]), p]))
      const auth = await readExact(socket, 2)
      if (auth[1] !== 0x00) throw new Error('SOCKS authentication failed')
    }

    const hostBuf = Buffer.from(targetHost, 'utf8')
    socket.write(Buffer.concat([
      Buffer.from([0x05, 0x01, 0x00, 0x03, hostBuf.length]),
      hostBuf,
      Buffer.from([(targetPort >> 8) & 0xff, targetPort & 0xff]),
    ]))

    const head = await readExact(socket, 4)
    if (head[0] !== 0x05) throw new Error('Invalid SOCKS response')
    if (head[1] !== 0x00) throw new Error(`SOCKS connect failed (${head[1]})`)

    const atyp = head[3]
    if (atyp === 0x01) await readExact(socket, 4)
    else if (atyp === 0x03) {
      const len = (await readExact(socket, 1))[0]
      await readExact(socket, len ?? 0)
    } else if (atyp === 0x04) await readExact(socket, 16)
    await readExact(socket, 2)

    const tlsSocket = tls.connect({ socket, servername: targetHost })
    await onceConnect(tlsSocket)

    const req =
      `GET /?format=json HTTP/1.1\r\n` +
      `Host: ${targetHost}\r\n` +
      `User-Agent: trafficx-proxy-check\r\n` +
      `Connection: close\r\n` +
      `Accept: application/json\r\n` +
      `\r\n`
    tlsSocket.write(req)

    const rawResp = await readAll(tlsSocket, timeoutMs)
    const idx = rawResp.indexOf('\r\n\r\n')
    if (idx === -1) throw new Error('Invalid HTTP response')
    const header = rawResp.slice(0, idx)
    const body = rawResp.slice(idx + 4)
    const statusLine = header.split('\r\n')[0] ?? ''
    if (!statusLine.includes(' 200 ')) throw new Error(`Upstream ${statusLine}`.trim())

    const parsed = JSON.parse(body) as { ip?: string }
    if (!parsed?.ip) throw new Error('Missing ip in response')
    return { ip: parsed.ip }
  } finally {
    clearTimeout(timeout)
    socket.destroy()
  }
}

function parseProxyUrl(proxyUrl: string): {
  hostname: string
  port: number
  username?: string
  password?: string
} {
  const u = new URL(proxyUrl)
  return {
    hostname: u.hostname,
    port: Number(u.port),
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
  }
}

function onceConnect(socket: any): Promise<void> {
  if (socket.readyState === 'open' || socket.connecting === false) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const onError = (e: any) => {
      cleanup()
      reject(e)
    }
    const onConnect = () => {
      cleanup()
      resolve()
    }
    const cleanup = () => {
      socket.off('error', onError)
      socket.off('connect', onConnect)
      socket.off('secureConnect', onConnect)
    }
    socket.on('error', onError)
    socket.on('connect', onConnect)
    socket.on('secureConnect', onConnect)
  })
}

function readExact(socket: any, n: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    const onData = (buf: Buffer) => {
      chunks.push(buf)
      total += buf.length
      if (total >= n) {
        cleanup()
        const out = Buffer.concat(chunks, total)
        const head = out.subarray(0, n)
        const rest = out.subarray(n)
        if (rest.length) socket.unshift(rest)
        resolve(head)
      }
    }
    const onError = (e: any) => {
      cleanup()
      reject(e)
    }
    const onClose = () => {
      cleanup()
      reject(new Error('Socket closed'))
    }
    const cleanup = () => {
      socket.off('data', onData)
      socket.off('error', onError)
      socket.off('close', onClose)
      socket.off('end', onClose)
    }
    socket.on('data', onData)
    socket.on('error', onError)
    socket.on('close', onClose)
    socket.on('end', onClose)
  })
}

function readAll(socket: any, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error('Timeout'))
    }, timeoutMs)
    const onData = (buf: Buffer) => chunks.push(buf)
    const onError = (e: any) => {
      cleanup()
      reject(e)
    }
    const onEnd = () => {
      cleanup()
      resolve(Buffer.concat(chunks).toString('utf8'))
    }
    const cleanup = () => {
      clearTimeout(timeout)
      socket.off('data', onData)
      socket.off('error', onError)
      socket.off('end', onEnd)
      socket.off('close', onEnd)
    }
    socket.on('data', onData)
    socket.on('error', onError)
    socket.on('end', onEnd)
    socket.on('close', onEnd)
  })
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}
