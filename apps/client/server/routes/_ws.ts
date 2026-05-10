import type { RedisValue } from "ioredis";
import { getRedis } from '~~/server/services/queue'

const clients = new Set<any>()

export default defineWebSocketHandler({
  open(peer) {
    clients.add(peer)
    // Send initial state
    peer.send(JSON.stringify({
      type: 'connected',
      data: { timestamp: Date.now() },
    }))
  },

  message(peer, message) {
    try {
      // Parse message as JSON
      const msg = JSON.parse(message.text() as string)

      if (msg.type === 'pong') return

      // Handle subscribe (client declares which channels it wants)
      if (msg.type === 'subscribe') {
        // Store channels on peer object
        ; (peer as any)._channels = msg.channels ?? []
      }
    } catch { /* ignore malformed */ }
  },

  close(peer) {
    clients.delete(peer)
  },

  error(peer) {
    clients.delete(peer)
  },
})

// ── Redis Pub/Sub → broadcast to WS clients ───────────────────
// Ini di-init saat server start — lihat plugins/ws-subscriber.ts
export function broadcastToClients(channel: string, data: any) {
  const payload = JSON.stringify({ type: channel, data })
  for (const peer of clients) {
    try {
      // Only send if client is subscribed to this channel
      const channels = (peer as any)._channels as string[] | undefined
      if (!channels || channels.includes(channel)) {
        peer.send(payload)
      }
    } catch { /* client disconnected */ }
  }
}

export function getClientCount(): number {
  return clients.size
}
