import { type H3Event } from "h3";
import { listProxyQuerySchema, addProxySchema, bulkImportSchema } from "~~/server/utils/validate";
import { testProxy, testAndUpdateProxy, parseProxyLine } from "~~/server/services/proxy-health";

export const listProxie = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session

    const raw = getQuery(event)
    const query = listProxyQuerySchema.parse(raw)
    const skip = (query.page - 1) * query.limit

    const where: any = {
      userId: user.id,
      deletedAt: null,
    }

    if (query.status) where.status = query.status
    if (query.type) where.type = query.type
    if (query.country) where.country = query.country.toUpperCase()
    if (query.search) where.OR = [
      { host: { contains: query.search, mode: 'insensitive' } },
      { name: { contains: query.search, mode: 'insensitive' } },
    ]

    const [proxies, total] = await Promise.all([
      prisma.proxyPool.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          type: true,
          host: true,
          port: true,
          username: true,
          country: true,
          isShared: true,
          status: true,
          lastTestedAt: true,
          responseTimeMs: true,
          successRate: true,
          uptime: true,
          blockRate: true,
          isBlacklisted: true,
          rotationInterval: true,
          createdAt: true,
        },
      }),
      prisma.proxyPool.count({ where }),
    ])

    // Summary stats
    const [activeCount, totalCount] = await Promise.all([
      prisma.proxyPool.count({ where: { userId: user.id, status: 'active', deletedAt: null } }),
      prisma.proxyPool.count({ where: { userId: user.id, deletedAt: null } }),
    ])

    return {
      success: true,
      message: 'OK',
      data: {
        proxies,
        stats: { active: activeCount, total: totalCount },
      },
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    }
  } catch (error) {
    throw handleRequestError(error)
  }
}
export const createProxy = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session

    const body = await readBody(event)
    const parsed = addProxySchema.safeParse(body)
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        message: parsed.error.issues.map((issue) => issue.message).join(', ') ?? 'Invalid input',
        data: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues.map((issue) => issue.message).join(', ') ?? 'Invalid input',
        }
      })
    }
    const data = parsed.data!

    // Check duplikat host:port per user
    const existing = await prisma.proxyPool.findFirst({
      where: {
        userId: user.id,
        host: data.host,
        port: data.port,
        deletedAt: null,
      },
    })
    if (existing) throw createError({
      statusCode: 409,
      message: `Proxy ${data.host}:${data.port} already exists`,
      data: {
        code: "DUPLICATE_PROXY",
        message: `Proxy ${data.host}:${data.port} already exists`,
      }
    })

    // Test proxy sebelum disimpan (opsional — test dulu)
    const testResult = await testProxy({
      type: data.type,
      host: data.host,
      port: data.port,
      username: data.username,
      password: data.password,
    }, 8_000)

    const proxy = await prisma.proxyPool.create({
      data: {
        userId: user.id,
        name: data.name ?? null,
        type: data.type,
        host: data.host,
        port: data.port,
        username: data.username ?? null,
        password: data.password ?? null,
        country: data.country ?? null,
        isShared: data.isShared,
        status: testResult.success ? 'active' : 'error',
        rotationInterval: data.rotationInterval ?? null,
        lastTestedAt: new Date(),
        responseTimeMs: testResult.responseTime,
        isBlacklisted: testResult.isBlacklisted ?? false,
      },
      select: {
        id: true, name: true, type: true, host: true, port: true,
        country: true, status: true, responseTimeMs: true,
      },
    })

    // Log test result
    await prisma.proxyLog.create({
      data: {
        proxyId: proxy.id,
        success: testResult.success,
        responseTime: testResult.responseTime,
        errorMessage: testResult.error ?? null,
        ipReturned: testResult.ipReturned ?? null,
      },
    })

    return {
      success: true,
      message: testResult.success
        ? `Proxy created and active (${testResult.responseTime}ms)`
        : 'Proxy created but failed to test. Test configuration.',
      data: { proxy, testResult },
    }
  } catch (error) {
    throw handleRequestError(error)
  }
}
export const deleteProxy = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session
    const id = getRouterParam(event, 'id')!

    const proxy = await prisma.proxyPool.findUnique({
      where: { id, deletedAt: null },
      select: { userId: true },
    })

    if (!proxy) {
      throw createError({
        statusCode: 404,
        message: 'Proxy not found',
        data: {
          code: "NOT_FOUND",
          message: 'Proxy not found',
        }
      })
    }
    if (proxy!.userId !== user.id) throw createError({
      statusCode: 403,
      message: 'Forbidden access',
      data: {
        code: "FORBIDDEN",
        message: 'Forbidden access',
      }
    })

    await prisma.proxyPool.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'inactive' },
    })

    return { success: true, message: 'Proxy deleted', data: null }
  } catch (error) {
    throw handleRequestError(error)
  }
}
export const testOrUpdateProxy = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event)
    const body = await readBody(event)

    // Test by ID (proxy yang sudah tersimpan)
    if (body?.id) {
      const result = await testAndUpdateProxy(body.id).catch(err => {
        throw createError({
          statusCode: 400,
          message: err.message,
          data: {
            code: "TEST_FAILED",
            message: err.message,
          }
        })
      })
      return {
        success: true,
        message: result!.success
          ? `Proxy active — IP: ${result!.ipReturned} (${result!.responseTime}ms)`
          : `Proxy inactive: ${result!.error}`,
        data: result,
      }
    }

    // Test proxy baru (belum disimpan)
    if (body?.host && body?.port) {
      const result = await testProxy({
        type: body.type ?? 'http',
        host: body.host,
        port: Number(body.port),
        username: body.username,
        password: body.password,
      })
      return {
        success: true,
        message: result.success
          ? `Proxy can be used — IP: ${result.ipReturned} (${result.responseTime}ms)`
          : `Proxy inactive: ${result.error}`,
        data: result,
      }
    }

    throw createError({
      statusCode: 400,
      message: 'Provide id or host+port to test',
      data: {
        code: "VALIDATION_ERROR",
        message: 'Provide id or host+port to test',
      }
    })
  } catch (error) {
    throw handleRequestError(error)
  }
}
export const bulkImportProxy = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session

    const body = await readBody(event)
    const parsed = bulkImportSchema.safeParse(body)
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        message: parsed.error.issues.map(i => i.message).join('\n'),
        data: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues.map(i => i.message).join('\n'),
        }
      })
    }
    const { raw, type } = parsed.data!

    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)

    if (lines.length > 500) {
      throw createError({
        statusCode: 400,
        message: 'Only up to 500 proxies per import',
        data: {
          code: "TOO_MANY",
          message: 'Only up to 500 proxies per import',
        }
      })
    }

    const results = {
      total: lines.length,
      imported: 0,
      skipped: 0,
      invalid: 0,
      duplicates: 0,
      errors: [] as string[],
    }

    const toCreate: any[] = []
    const seen = new Set<string>()

    for (const line of lines) {
      const parsed = parseProxyLine(line, type)
      if (!parsed) {
        results.invalid++
        results.errors.push(`Invalid proxy format: ${line.slice(0, 50)}`)
        continue
      }

      const key = `${parsed.host}:${parsed.port}`
      if (seen.has(key)) {
        results.duplicates++
        continue
      }
      seen.add(key)

      // Check existing di DB
      const existing = await prisma.proxyPool.findFirst({
        where: { userId: user.id, host: parsed.host, port: parsed.port, deletedAt: null },
        select: { id: true },
      })
      if (existing) {
        results.duplicates++
        continue
      }

      toCreate.push({
        userId: user.id,
        type: parsed.type,
        host: parsed.host,
        port: parsed.port,
        username: parsed.username ?? null,
        password: parsed.password ?? null,
        country: parsed.country ?? null,
        status: 'testing', // akan di-test oleh health checker
        isShared: false,
      })
    }

    // Batch insert
    if (toCreate.length > 0) {
      await prisma.proxyPool.createMany({
        data: toCreate,
        skipDuplicates: true,
      })
      results.imported = toCreate.length
    }

    results.skipped = results.duplicates + results.invalid

    return {
      success: true,
      message: `Import completed: ${results.imported} proxies successfully added`,
      data: results,
    }
  } catch (error) {
    throw handleRequestError(error)
  }
}
