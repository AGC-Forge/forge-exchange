import { broadcastToClients } from '~~/server/routes/_ws'
import type { RedisValue } from "ioredis";

export default defineNitroPlugin(async () => {
  // Hanya jalan di server-side
  if (import.meta.client) return

  try {
    const IORedis = (await import('ioredis')).default
    const sub = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    })

    // Subscribe ke semua channel yang dikirim worker
    await sub.subscribe(
      'analytics:update',
      'campaign:update',
      'worker:update',
      'worker:health',
      'worker:alert',
      'queue:update',
      'proxy:update',
      'system:health',
    )

    sub.on('message', (channel: string, message: RedisValue) => {
      try {
        const data = JSON.parse(message as string)
        broadcastToClients(channel, data)
      } catch { /* malformed */ }
    })

    console.log('✅ Redis Pub/Sub subscriber started')
  } catch (err) {
    console.error('Redis subscriber failed to start:', err)
  }
})
