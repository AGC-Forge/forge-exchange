import { type H3Event } from "h3";
import { AntidetectProviderFactory } from "@forge-exchange/antidetect/server";
import type {
  ProviderCredentials,
  ProviderType,
} from "@forge-exchange/antidetect/server";

export const listIntegration = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session

    const raw = getQuery(event)
    const query = listIntegrationQuerySchema.parse(raw)

    const skip = (query.page - 1) * query.limit
    const where: Record<string, any> | undefined = {
      userId: user.id,
    }
    if (query.status) {
      where.status = query.status
    }
    if (query.type) {
      where.type = query.type
    }
    if (query.isHealthy) {
      where.isHealthy = query.isHealthy
    }
    if (query.lastTestedAt) {
      where.lastTestedAt = query.lastTestedAt
    }
    if (query.search) {
      where.name = {
        contains: query.search,
      }
    }

    const [integrations, total] = await prisma.$transaction(async (tx) => {
      const integrations = await tx.integration.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ createdAt: "desc" }],
      })
      const total = await tx.integration.count({
        where,
      })
      return [integrations, total]
    })
    return {
      success: true,
      message: 'OK',
      data: {
        integrations,
        stats: { active: integrations.length, total },
      },
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    }
  } catch (error) {
    throw handleRequestError(error);
  }
}
export const testProvider = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session
    const id = getRouterParam(event, 'id')!

    const integration = await prisma.integration.findUnique({
      where: { id },
      select: { id: true, userId: true, type: true, credentials: true, isActive: true },
    })

    if (!integration) {
      throw createError({
        statusCode: 404,
        message: 'Integration not found',
        data: {
          code: 'NOT_FOUND',
        }
      })
    }
    if (integration!.userId !== user.id) {
      throw createError({
        statusCode: 403,
        message: 'Access denied',
        data: {
          code: 'FORBIDDEN',
        }
      })
    }

    const providerType = integration!.type as ProviderType

    if (!AntidetectProviderFactory.isSupported(providerType)) {
      // Bukan antidetect provider — test dengan ping biasa
      return {
        success: true,
        message: 'Integration type does not require a connection test',
        data: { healthy: true },
      }
    }

    // Build credentials dari DB
    const creds = integration!.credentials as Record<string, any>
    const credentials: ProviderCredentials = {
      apiKey: creds.apiKey ?? creds.token ?? undefined,
      apiUrl: creds.apiUrl ?? undefined,
      email: creds.email ?? undefined,
      password: creds.password ?? undefined,
      apiPort: creds.apiPort ? Number(creds.apiPort) : undefined,
    }

    // Create provider dan health check
    const provider = AntidetectProviderFactory.create(providerType, credentials)
    const result = await provider.healthCheck()

    // Update health status di DB
    await prisma.integration.update({
      where: { id },
      data: {
        isHealthy: result.healthy,
        lastTestedAt: new Date(),
      },
    })

    return {
      success: true,
      message: result.healthy
        ? `Connection successful: ${result.message}`
        : `Connection failed: ${result.message}`,
      data: result,
    }
  } catch (error) {
    throw handleRequestError(error);
  }
}
