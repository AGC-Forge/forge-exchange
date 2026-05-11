import { type H3Event } from "h3";

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
