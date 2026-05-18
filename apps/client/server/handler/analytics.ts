import { type H3Event } from "h3";

function getStartDate(period: string): Date {
  const now = new Date()
  const map: Record<string, number> = {
    '24h': 1, '7d': 7, '30d': 30, '90d': 90,
  }
  const days = map[period] ?? 7
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}

function normalizeExecutionSource(value: unknown): 'none' | 'pool' | 'integration' | undefined {
  const source = String(value ?? '').trim().toLowerCase()
  if (source === 'none' || source === 'pool' || source === 'integration') {
    return source
  }
  return undefined
}

async function getBrowserSessionColumns(): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'browser_sessions'
  `.catch(() => [])

  return new Set(rows.map((row) => row.column_name))
}
export const overview = async (event: H3Event) => {
  try {
    const session = await requireUserSession(event)
    const { user } = session
    const query = getQuery(event)
    const period = String(query.period ?? '7d')
    const executionSource = normalizeExecutionSource(query.executionSource)
    const startDate = getStartDate(period)
    const browserSessionColumns = await getBrowserSessionColumns()
    const hasTargetCountry = browserSessionColumns.has('target_country')
    const hasObservedCountry = browserSessionColumns.has('observed_country')
    const hasExecutionSource = browserSessionColumns.has('execution_source')

    const isAdmin = ['admin', 'superadmin'].includes(user.role.name)
    const userFilter = isAdmin ? {} : { userId: user.id }
    const analyticsFilter: any = {
      country: { not: null as null | string },
      createdAt: { gte: startDate },
      ...(isAdmin ? {} : { campaign: { userId: user.id } }),
      ...(executionSource && hasExecutionSource ? { session: { executionSource } } : {}),
    }
    const sessionPeriodFilter = {
      ...userFilter,
      createdAt: { gte: startDate },
      ...(executionSource && hasExecutionSource ? { executionSource } : {}),
    }

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
      targetGeoStats,
      executionSourceStats,
      geoQualityAgg,
      mismatchCountriesRaw,
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

      // Observed GEO stats
      prisma.analyticsEvent.groupBy({
        by: ['country'],
        where: analyticsFilter,
        _count: { country: true },
        orderBy: { _count: { country: 'desc' } },
        take: 10,
      }),

      // Target GEO stats
      hasTargetCountry
        ? prisma.browserSession.groupBy({
          by: ['targetCountry'],
          where: { ...sessionPeriodFilter, targetCountry: { not: null } },
          _count: { targetCountry: true },
          orderBy: { _count: { targetCountry: 'desc' } },
          take: 10,
        })
        : Promise.resolve([]),

      // Execution source stats
      hasExecutionSource
        ? prisma.browserSession.groupBy({
          by: ['executionSource'],
          where: sessionPeriodFilter,
          _count: { executionSource: true },
          orderBy: { _count: { executionSource: 'desc' } },
        })
        : Promise.resolve([]),

      // GEO quality aggregate
      hasTargetCountry && hasObservedCountry
        ? prisma.browserSession.aggregate({
          where: {
            ...sessionPeriodFilter,
            targetCountry: { not: null },
            observedCountry: { not: null },
          },
          _count: { id: true },
        })
        : Promise.resolve({ _count: { id: 0 } }),

      hasTargetCountry && hasObservedCountry
        ? prisma.$queryRaw<{ target_country: string | null; observed_country: string | null; count: bigint }[]>`
        SELECT
          target_country,
          observed_country,
          COUNT(*) AS count
        FROM browser_sessions
        WHERE created_at >= ${startDate}
          AND target_country IS NOT NULL
          AND observed_country IS NOT NULL
          AND target_country <> observed_country
          ${isAdmin ? prisma.$queryRaw`AND 1=1` : prisma.$queryRaw`AND user_id = ${user.id}::uuid`}
          ${executionSource ? prisma.$queryRaw`AND execution_source = ${executionSource}` : prisma.$queryRaw``}
        GROUP BY target_country, observed_country
        ORDER BY count DESC
        LIMIT 8
      `.catch(() => [])
        : Promise.resolve([]),

      // Hourly stats (last 24h)
      prisma.$queryRaw<{ hour: number; count: bigint }[]>`
      SELECT
        EXTRACT(HOUR FROM created_at)::int AS hour,
        COUNT(*)                            AS count
      FROM browser_sessions
      WHERE
        created_at >= NOW() - INTERVAL '24 hours'
        ${isAdmin ? prisma.$queryRaw`AND 1=1` : prisma.$queryRaw`AND user_id = ${user.id}::uuid`}
        ${executionSource ? prisma.$queryRaw`AND execution_source = ${executionSource}` : prisma.$queryRaw``}
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

    const totalTargetGeo = targetGeoStats.reduce((s, g) => s + g._count.targetCountry, 0)
    const targetGeoNorm = targetGeoStats
      .filter(g => g.targetCountry)
      .map(g => ({
        country: g.targetCountry!,
        count: g._count.targetCountry,
        pct: totalTargetGeo > 0 ? Math.round((g._count.targetCountry / totalTargetGeo) * 100) : 0,
      }))

    const totalExecution = executionSourceStats.reduce(
      (s, item) => s + item._count.executionSource,
      0,
    )
    const executionSourceNorm = executionSourceStats.map((item) => ({
      source: item.executionSource,
      count: item._count.executionSource,
      pct: totalExecution > 0
        ? Math.round((item._count.executionSource / totalExecution) * 100)
        : 0,
    }))

    const [{ matched, mismatched }, noProxySessions] = await Promise.all([
      hasTargetCountry && hasObservedCountry
        ? prisma.$queryRaw<{ matched: bigint; mismatched: bigint }[]>`
        SELECT
          COUNT(*) FILTER (WHERE target_country = observed_country) AS matched,
          COUNT(*) FILTER (WHERE target_country IS NOT NULL
            AND observed_country IS NOT NULL
            AND target_country <> observed_country) AS mismatched
        FROM browser_sessions
        WHERE created_at >= ${startDate}
          ${isAdmin ? prisma.$queryRaw`AND 1=1` : prisma.$queryRaw`AND user_id = ${user.id}::uuid`}
          ${executionSource && hasExecutionSource ? prisma.$queryRaw`AND execution_source = ${executionSource}` : prisma.$queryRaw``}
      `.then((rows) => rows[0] ?? { matched: BigInt(0), mismatched: BigInt(0) })
        : Promise.resolve({ matched: BigInt(0), mismatched: BigInt(0) }),
      hasExecutionSource
        ? prisma.browserSession.count({
          where: { ...sessionPeriodFilter, executionSource: 'none' },
        })
        : Promise.resolve(0),
    ])

    const matchedCount = Number(matched ?? 0)
    const mismatchedCount = Number(mismatched ?? 0)
    const comparableGeoSessions = matchedCount + mismatchedCount
    const mismatchRate = comparableGeoSessions > 0
      ? Math.round((mismatchedCount / comparableGeoSessions) * 100)
      : 0
    const noProxyRatio = totalExecution > 0
      ? Math.round((noProxySessions / totalExecution) * 100)
      : 0

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
        period,
        totalSessions,
        todaySessions,
        activeCampaigns,
        successRate,
        activeProxies,
        geoStats: geoNorm,
        targetGeoStats: targetGeoNorm,
        executionSources: executionSourceNorm,
        geoQuality: {
          comparableSessions: comparableGeoSessions,
          mismatchRate,
          noProxySessions,
          noProxyRatio,
          observedSessions: geoQualityAgg._count.id,
        },
        mismatchCountries: mismatchCountriesRaw.map((row) => ({
          targetCountry: row.target_country ?? '—',
          observedCountry: row.observed_country ?? '—',
          count: Number(row.count),
        })),
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
    const executionSource = normalizeExecutionSource(query.executionSource)
    const startDate = getStartDate(period)
    const browserSessionColumns = await getBrowserSessionColumns()
    const hasTargetCountry = browserSessionColumns.has('target_country')
    const hasObservedCountry = browserSessionColumns.has('observed_country')
    const hasExecutionSource = browserSessionColumns.has('execution_source')

    // Verify ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        userId: true,
        name: true,
        targetUrl: true,
        status: true,
        totalSessions: true,
        successCount: true,
        failCount: true,
        todayCount: true,
        dailyLimit: true,
        createdAt: true,
        startedAt: true,
        geoTargets: true
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
    if (campaign!.userId !== user.id && !['admin', 'superadmin'].includes(user.role.name)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied',
        data: {
          code: "FORBIDDEN",
          message: 'Access denied',
        }
      })
    }

    const baseWhere: any = {
      campaignId: id,
      createdAt: { gte: startDate },
      ...(executionSource && hasExecutionSource ? { session: { executionSource } } : {}),
    }
    const sessionWhere = {
      campaignId: id,
      createdAt: { gte: startDate },
      ...(executionSource && hasExecutionSource ? { executionSource } : {}),
    }

    const [
      totalSessions,
      successSessions,
      failedSessions,
      avgDuration,
      bounceCount,
      geoStats,
      targetGeoStats,
      executionSourceStats,
      deviceStats,
      browserStats,
      mismatchCountriesRaw,
      hourlyStats,
      dailyStats,
    ] = await Promise.all([
      // Total sessions in period
      prisma.analyticsEvent.count({ where: baseWhere }),

      // Success
      prisma.browserSession.count({
        where: { ...sessionWhere, status: 'completed' },
      }),

      // Failed
      prisma.browserSession.count({
        where: { ...sessionWhere, status: 'failed' },
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

      hasTargetCountry
        ? prisma.browserSession.groupBy({
          by: ['targetCountry'],
          where: { ...sessionWhere, targetCountry: { not: null } },
          _count: { targetCountry: true },
          orderBy: { _count: { targetCountry: 'desc' } },
          take: 15,
        })
        : Promise.resolve([]),

      hasExecutionSource
        ? prisma.browserSession.groupBy({
          by: ['executionSource'],
          where: sessionWhere,
          _count: { executionSource: true },
          orderBy: { _count: { executionSource: 'desc' } },
        })
        : Promise.resolve([]),

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

      hasTargetCountry && hasObservedCountry
        ? prisma.$queryRaw<{ target_country: string | null; observed_country: string | null; count: bigint }[]>`
        SELECT
          target_country,
          observed_country,
          COUNT(*) AS count
        FROM browser_sessions
        WHERE campaign_id = ${id}::uuid
          AND created_at >= ${startDate}
          AND target_country IS NOT NULL
          AND observed_country IS NOT NULL
          AND target_country <> observed_country
          ${executionSource && hasExecutionSource ? prisma.$queryRaw`AND execution_source = ${executionSource}` : prisma.$queryRaw``}
        GROUP BY target_country, observed_country
        ORDER BY count DESC
        LIMIT 8
      `.catch(() => [])
        : Promise.resolve([]),

      // Hourly for last 24h
      prisma.$queryRaw<{ hour: number; count: bigint }[]>`
      SELECT
        EXTRACT(HOUR FROM created_at)::int AS hour,
        COUNT(*) AS count
      FROM analytics_events ae
      LEFT JOIN browser_sessions bs ON ae.session_id = bs.id
      WHERE ae.campaign_id = ${id}::uuid
        AND ae.created_at >= NOW() - INTERVAL '24 hours'
        ${executionSource && hasExecutionSource ? prisma.$queryRaw`AND bs.execution_source = ${executionSource}` : prisma.$queryRaw``}
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
        ${executionSource && hasExecutionSource ? prisma.$queryRaw`AND bs.execution_source = ${executionSource}` : prisma.$queryRaw``}
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

    const totalTargetGeo = targetGeoStats.reduce((s, g) => s + g._count.targetCountry, 0)
    const targetGeoNorm = targetGeoStats
      .filter(g => g.targetCountry)
      .map(g => ({
        country: g.targetCountry!,
        count: g._count.targetCountry,
        pct: totalTargetGeo > 0 ? Math.round((g._count.targetCountry / totalTargetGeo) * 100) : 0,
      }))

    const totalExecution = executionSourceStats.reduce(
      (s, item) => s + item._count.executionSource,
      0,
    )
    const executionSourceNorm = executionSourceStats.map((item) => ({
      source: item.executionSource,
      count: item._count.executionSource,
      pct: totalExecution > 0
        ? Math.round((item._count.executionSource / totalExecution) * 100)
        : 0,
    }))

    const [{ matched, mismatched }, noProxySessions] = await Promise.all([
      hasTargetCountry && hasObservedCountry
        ? prisma.$queryRaw<{ matched: bigint; mismatched: bigint }[]>`
        SELECT
          COUNT(*) FILTER (WHERE target_country = observed_country) AS matched,
          COUNT(*) FILTER (WHERE target_country IS NOT NULL
            AND observed_country IS NOT NULL
            AND target_country <> observed_country) AS mismatched
        FROM browser_sessions
        WHERE campaign_id = ${id}::uuid
          AND created_at >= ${startDate}
          ${executionSource && hasExecutionSource ? prisma.$queryRaw`AND execution_source = ${executionSource}` : prisma.$queryRaw``}
      `.then((rows) => rows[0] ?? { matched: BigInt(0), mismatched: BigInt(0) })
        : Promise.resolve({ matched: BigInt(0), mismatched: BigInt(0) }),
      hasExecutionSource
        ? prisma.browserSession.count({
          where: { ...sessionWhere, executionSource: 'none' },
        })
        : Promise.resolve(0),
    ])

    const matchedCount = Number(matched ?? 0)
    const mismatchedCount = Number(mismatched ?? 0)
    const comparableGeoSessions = matchedCount + mismatchedCount
    const mismatchRate = comparableGeoSessions > 0
      ? Math.round((mismatchedCount / comparableGeoSessions) * 100)
      : 0
    const noProxyRatio = totalExecution > 0
      ? Math.round((noProxySessions / totalExecution) * 100)
      : 0

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
        executionSource: executionSource ?? null,
        metrics: {
          totalSessions,
          successSessions,
          failedSessions,
          successRate,
          bounceRate,
          avgDuration: avgDurSec,
          mismatchRate,
          noProxySessions,
          noProxyRatio,
          comparableGeoSessions,
        },
        charts: { hourly, daily },
        breakdown: {
          geo: geoNorm,
          targetGeo: targetGeoNorm,
          executionSources: executionSourceNorm,
          devices: devNorm,
          browsers: brNorm,
          geoQuality: {
            matchedSessions: matchedCount,
            mismatchedSessions: mismatchedCount,
            comparableSessions: comparableGeoSessions,
          },
          mismatchCountries: mismatchCountriesRaw.map((row) => ({
            targetCountry: row.target_country ?? '—',
            observedCountry: row.observed_country ?? '—',
            count: Number(row.count),
          })),
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

  const isAdmin = ['admin', 'superadmin'].includes(user.role.name)
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
