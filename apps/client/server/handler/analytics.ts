import { type H3Event } from "h3";

export const overview = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session

    const isAdmin = ['admin', 'superadmin'].includes(user.role)
    const userFilter = isAdmin ? {} : { userId: user.id }
    const analyticsFilter = isAdmin
      ? { country: { not: null as null | string } }
      : { country: { not: null as null | string }, campaign: { userId: user.id } }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      totalSessions,
      todaySessions,
      activeCampaigns,
      successSessions,
      failSessions,
      activeProxies,
      geoStats,
      hourlyStats,
    ] = await Promise.all([
      // Total all-time sessions
      prisma.browserSession.count({ where: { ...userFilter } }),

      // Today sessions
      prisma.browserSession.count({
        where: { ...userFilter, createdAt: { gte: today } },
      }),

      // Active campaigns (running + queued)
      prisma.campaign.count({
        where: { ...userFilter, status: { in: ['running', 'queued'] }, deletedAt: null },
      }),

      // Success sessions (last 7 days)
      prisma.browserSession.count({
        where: {
          ...userFilter,
          status: 'completed',
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),

      // Failed sessions (last 7 days)
      prisma.browserSession.count({
        where: {
          ...userFilter,
          status: 'failed',
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),

      // Active proxies
      prisma.proxyPool.count({
        where: { ...userFilter, status: 'active', deletedAt: null },
      }),

      // GEO stats (top 10 countries)
      prisma.analyticsEvent.groupBy({
        by: ['country'],
        where: analyticsFilter,
        _count: { country: true },
        orderBy: { _count: { country: 'desc' } },
        take: 10,
      }),

      // Hourly stats (last 24h)
      prisma.$queryRaw<{ hour: number; count: bigint }[]>`
      SELECT
        EXTRACT(HOUR FROM created_at)::int AS hour,
        COUNT(*)                            AS count
      FROM browser_sessions
      WHERE
        created_at >= NOW() - INTERVAL '24 hours'
        ${isAdmin ? prisma.$queryRaw`AND 1=1` : prisma.$queryRaw`AND user_id = ${user.id}::uuid`}
      GROUP BY hour
      ORDER BY hour
    `.catch(() => []),
    ])

    const totalRecent = successSessions + failSessions
    const successRate = totalRecent > 0
      ? Math.round((successSessions / totalRecent) * 100)
      : 0

    // Normalize GEO data
    const totalGeo = geoStats.reduce((s, g) => s + g._count.country, 0)
    const geoNorm = geoStats
      .filter(g => g.country)
      .map(g => ({
        country: g.country!,
        count: g._count.country,
        pct: totalGeo > 0 ? Math.round((g._count.country / totalGeo) * 100) : 0,
      }))

    // Build 24h hourly array
    const hourMap = Object.fromEntries(
      hourlyStats.map(h => [h.hour, Number(h.count)])
    )
    const hourly = Array.from({ length: 24 }, (_, i) => ({
      label: `${i}:00`,
      value: hourMap[i] ?? 0,
    }))

    return {
      success: true,
      message: 'OK',
      data: {
        totalSessions,
        todaySessions,
        activeCampaigns,
        successRate,
        activeProxies,
        geoStats: geoNorm,
        hourly,
      },
    }
  } catch (error) {
    throw handleRequestError(error)
  }
}
