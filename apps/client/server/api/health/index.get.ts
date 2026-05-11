import { getRedis } from '~~/server/services/queue'

export default defineEventHandler(async (event) => {
  const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; error?: string }> = {}
  let overallOk = true

  // ── PostgreSQL check ────────────────────────────────────────
  const pgStart = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.postgres = { status: 'ok', latencyMs: Date.now() - pgStart }
  } catch (err: any) {
    checks.postgres = { status: 'error', error: err.message }
    overallOk = false
  }

  // ── Redis check ─────────────────────────────────────────────
  const redisStart = Date.now()
  try {
    const redis = getRedis()
    await redis.ping()
    checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart }
  } catch (err: any) {
    checks.redis = { status: 'error', error: err.message }
    overallOk = false
  }

  // Set HTTP status
  setResponseStatus(event, overallOk ? 200 : 503)

  return {
    status: overallOk ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version ?? '1.0.0',
    checks,
  }
})
