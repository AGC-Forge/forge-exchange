import { type H3Event } from "h3";

function getStartDate(period: string): Date {
  const now = new Date()
  const map: Record<string, number> = {
    '24h': 1, '7d': 7, '30d': 30, '90d': 90,
  }
  const days = map[period] ?? 7
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}
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
export const getByID = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session
    const id = getRouterParam(event, 'id')!
    const query = getQuery(event)

    const period = String(query.period ?? '7d')
    const startDate = getStartDate(period)

    // Verify ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true, userId: true, name: true, targetUrl: true,
        status: true, totalSessions: true, successCount: true,
        failCount: true, todayCount: true, dailyLimit: true,
        createdAt: true, startedAt: true,
      },
    })

    if (!campaign) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Campaign not found',
        data: {
          code: "NOT_FOUND",
          message: 'Campaign not found',
        }
      })
    }
    if (campaign!.userId !== user.id && !['admin', 'superadmin'].includes(user.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied',
        data: {
          code: "FORBIDDEN",
          message: 'Access denied',
        }
      })
    }

    const baseWhere = { campaignId: id, createdAt: { gte: startDate } }

    const [
      totalSessions,
      successSessions,
      failedSessions,
      avgDuration,
      bounceCount,
      geoStats,
      deviceStats,
      browserStats,
      hourlyStats,
      dailyStats,
    ] = await Promise.all([
      // Total sessions in period
      prisma.analyticsEvent.count({ where: baseWhere }),

      // Success
      prisma.browserSession.count({
        where: { campaignId: id, status: 'completed', createdAt: { gte: startDate } },
      }),

      // Failed
      prisma.browserSession.count({
        where: { campaignId: id, status: 'failed', createdAt: { gte: startDate } },
      }),

      // Avg duration
      prisma.analyticsEvent.aggregate({
        where: { ...baseWhere, duration: { not: null } },
        _avg: { duration: true },
      }),

      // Bounce count
      prisma.analyticsEvent.count({ where: { ...baseWhere, bounce: true } }),

      // GEO breakdown
      prisma.analyticsEvent.groupBy({
        by: ['country'],
        where: { ...baseWhere, country: { not: null } },
        _count: { country: true },
        orderBy: { _count: { country: 'desc' } },
        take: 15,
      }),

      // Device breakdown
      prisma.analyticsEvent.groupBy({
        by: ['deviceType'],
        where: { ...baseWhere, deviceType: { not: null } },
        _count: { deviceType: true },
        orderBy: { _count: { deviceType: 'desc' } },
      }),

      // Browser breakdown
      prisma.analyticsEvent.groupBy({
        by: ['browser'],
        where: { ...baseWhere, browser: { not: null } },
        _count: { browser: true },
        orderBy: { _count: { browser: 'desc' } },
        take: 8,
      }),

      // Hourly for last 24h
      prisma.$queryRaw<{ hour: number; count: bigint }[]>`
      SELECT
        EXTRACT(HOUR FROM created_at)::int AS hour,
        COUNT(*) AS count
      FROM analytics_events
      WHERE campaign_id = ${id}::uuid
        AND created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY hour
      ORDER BY hour
    `.catch(() => []),

      // Daily trend
      prisma.$queryRaw<{ day: string; count: bigint; success: bigint }[]>`
      SELECT
        DATE(ae.created_at)::text AS day,
        COUNT(*) AS count,
        COUNT(CASE WHEN bs.status = 'completed' THEN 1 END) AS success
      FROM analytics_events ae
      LEFT JOIN browser_sessions bs ON ae.session_id = bs.id
      WHERE ae.campaign_id = ${id}::uuid
        AND ae.created_at >= ${startDate}
      GROUP BY day
      ORDER BY day
    `.catch(() => []),
    ])

    const total = totalSessions || 1
    const bounceRate = Math.round((bounceCount / total) * 100)
    const successRate = Math.round((successSessions / Math.max(successSessions + failedSessions, 1)) * 100)
    const avgDurSec = Math.round(avgDuration._avg.duration ?? 0)

    // Normalize geo
    const totalGeo = geoStats.reduce((s, g) => s + g._count.country, 0)
    const geoNorm = geoStats
      .filter(g => g.country)
      .map(g => ({
        country: g.country!,
        count: g._count.country,
        pct: totalGeo > 0 ? Math.round((g._count.country / totalGeo) * 100) : 0,
      }))

    // Normalize devices
    const totalDev = deviceStats.reduce((s, d) => s + d._count.deviceType, 0)
    const devNorm = deviceStats
      .filter(d => d.deviceType)
      .map(d => ({
        device: d.deviceType!,
        count: d._count.deviceType,
        pct: totalDev > 0 ? Math.round((d._count.deviceType / totalDev) * 100) : 0,
      }))

    // Normalize browsers
    const totalBr = browserStats.reduce((s, b) => s + b._count.browser, 0)
    const brNorm = browserStats
      .filter(b => b.browser)
      .map(b => ({
        browser: b.browser!,
        count: b._count.browser,
        pct: totalBr > 0 ? Math.round((b._count.browser / totalBr) * 100) : 0,
      }))

    // Build 24h hourly array
    const hourMap = Object.fromEntries(hourlyStats.map(h => [h.hour, Number(h.count)]))
    const hourly = Array.from({ length: 24 }, (_, i) => ({
      label: `${String(i).padStart(2, '0')}:00`,
      value: hourMap[i] ?? 0,
    }))

    // Daily trend
    const daily = dailyStats.map(d => ({
      date: d.day,
      total: Number(d.count),
      success: Number(d.success),
    }))

    return {
      success: true,
      message: 'OK',
      data: {
        campaign,
        period,
        metrics: {
          totalSessions,
          successSessions,
          failedSessions,
          successRate,
          bounceRate,
          avgDuration: avgDurSec,
        },
        charts: { hourly, daily },
        breakdown: {
          geo: geoNorm,
          devices: devNorm,
          browsers: brNorm,
        },
      },
    }
  } catch (error) {
    throw handleRequestError(error)
  }
}
export const getGeo = async (event: H3Event) => {
  const session = await requireUserSession(event)
  const { user } = session
  const query = getQuery(event)
  const period = String(query.period ?? '7d')
  const startDate = getStartDate(period)

  const isAdmin = ['admin', 'superadmin'].includes(user.role)
  const userFilter = isAdmin ? {} : { userId: user.id }

  const [geoStats, cityStats, ispStats] = await Promise.all([
    // Country breakdown
    prisma.analyticsEvent.groupBy({
      by: ['country'],
      where: { ...userFilter, country: { not: null }, createdAt: { gte: startDate } },
      _count: { country: true },
      _avg: { duration: true },
      orderBy: { _count: { country: 'desc' } },
      take: 20,
    }),

    // City breakdown
    prisma.analyticsEvent.groupBy({
      by: ['city'],
      where: { ...userFilter, city: { not: null }, createdAt: { gte: startDate } },
      _count: { city: true },
      orderBy: { _count: { city: 'desc' } },
      take: 10,
    }),

    // ISP breakdown
    prisma.analyticsEvent.groupBy({
      by: ['isp'],
      where: { ...userFilter, isp: { not: null }, createdAt: { gte: startDate } },
      _count: { isp: true },
      orderBy: { _count: { isp: 'desc' } },
      take: 10,
    }),
  ])

  const totalGeo = geoStats.reduce((s, g) => s + g._count.country, 0)

  return {
    success: true,
    message: 'OK',
    data: {
      period,
      countries: geoStats
        .filter(g => g.country)
        .map(g => ({
          country: g.country!,
          count: g._count.country,
          pct: totalGeo > 0 ? Math.round((g._count.country / totalGeo) * 100) : 0,
          avgDuration: Math.round(g._avg.duration ?? 0),
        })),
      cities: cityStats
        .filter(c => c.city)
        .map(c => ({ city: c.city!, count: c._count.city })),
      isps: ispStats
        .filter(i => i.isp)
        .map(i => ({ isp: i.isp!, count: i._count.isp })),
    },
  }
}
