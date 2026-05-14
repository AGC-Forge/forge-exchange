export default defineEventHandler(async (event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session

    const query = getQuery(event)
    const status = (query.status as string | undefined) ?? 'active'
    const country = (query.country as string | undefined)
    const limit = Math.min(parseInt(query.limit as string ?? '200', 10), 500)

    const where: any = {
      userId: user.id,
      deletedAt: null,
    }

    // Filter status (default active — untuk dropdown kita hanya tampil yang bisa dipakai)
    if (status !== 'all') where.status = status

    // Filter country opsional
    if (country) where.country = country.toUpperCase()

    const pools = await prisma.proxyPool.findMany({
      where,
      take: limit,
      orderBy: [
        { country: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        type: true,
        host: true,
        port: true,
        country: true,
        status: true,
        successRate: true,
        responseTimeMs: true,
      },
    })

    // Group by country untuk membantu UI filter
    const byCountry: Record<string, typeof pools> = {}
    for (const p of pools) {
      const cc = p.country ?? 'XX'
      if (!byCountry[cc]) byCountry[cc] = []
      byCountry[cc].push(p)
    }

    setResponseStatus(event, 200)
    setSecurityHeaders(event)
    return {
      status: 200,
      success: true,
      message: 'OK',
      data: {
        pools,
        byCountry,
        total: pools.length,
        countries: Object.keys(byCountry).sort(),
      },
    }
  } catch (error) {
    throw handleRequestError(error)
  }
})
