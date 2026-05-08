import Redis from "ioredis";

// Peer registry: peerId → peer object
const peerRegistry = new Map<string, any>();
// userId → Set of peer IDs (1 user bisa punya multiple tab/device)
const userPeerMap = new Map<string, Set<string>>();
// peerId → userId
const peerUserMap = new Map<string, string>();

let redisSub: Redis | null = null;

function getRedisSubscriber(): Redis {
  if (redisSub) return redisSub;

  const config = useRuntimeConfig();
  redisSub = new Redis({
    host: config.REDIS_HOST as string,
    port: parseInt((config.REDIS_PORT as string) || "6379", 10),
    password: (config.REDIS_PASSWORD as string) || undefined,
    db: parseInt((config.REDIS_DB as string) || "0", 10),
    maxRetriesPerRequest: null,
    connectTimeout: 5000,
  });

  redisSub.subscribe("ws:send", (err) => {
    if (err) console.error("[WS] Redis subscribe error:", err.message);
    else console.log("[WS] Redis subscriber ready on channel ws:send");
  });

  // Relay pesan dari Redis ke peer yang tepat (untuk multi-server / background worker)
  redisSub.on("message", (_ch, raw) => {
    try {
      const { userId, ...payload } = JSON.parse(raw);
      sendToUser(userId, payload);
    } catch (e) {
      console.error("[WS] Redis relay error:", e);
    }
  });

  redisSub.on("error", (err) => {
    console.error("[WS] Redis subscriber error:", err.message);
  });

  return redisSub;
}

function sendToUser(userId: string, payload: object) {
  const peerIds = userPeerMap.get(userId);
  if (!peerIds?.size) return;
  const message = JSON.stringify(payload);
  for (const id of peerIds) {
    peerRegistry.get(id)?.send(message);
  }
}

export default defineWebSocketHandler({
  open(peer) {
    peerRegistry.set(peer.id, peer);
    getRedisSubscriber();
    peer.send(JSON.stringify({ type: "connected", peerId: peer.id }));
    console.log(`[WS] Connected: ${peer.id}`);
  },

  message(peer, message) {
    let data: Record<string, any>;
    try {
      data = JSON.parse(message.text());
    } catch {
      peer.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    switch (data.type) {
      case "join": {
        const userId = data.userId as string;
        if (!userId) {
          peer.send(JSON.stringify({ type: "error", message: "userId required" }));
          return;
        }

        // Daftarkan peer ke room user ini
        if (!userPeerMap.has(userId)) userPeerMap.set(userId, new Set());
        userPeerMap.get(userId)!.add(peer.id);
        peerUserMap.set(peer.id, userId);

        peer.send(JSON.stringify({ type: "joined", userId }));
        console.log(`[WS] ${peer.id} joined as user ${userId}`);
        break;
      }

      case "ping":
        peer.send(JSON.stringify({ type: "pong" }));
        break;

      default:
        console.log(`[WS] Unknown message type: ${data.type}`);
    }
  },

  close(peer) {
    // Bersihkan registry
    peerRegistry.delete(peer.id);
    const userId = peerUserMap.get(peer.id);
    if (userId) {
      const peerIds = userPeerMap.get(userId);
      if (peerIds) {
        peerIds.delete(peer.id);
        if (peerIds.size === 0) userPeerMap.delete(userId);
      }
      peerUserMap.delete(peer.id);
    }
    console.log(`[WS] Disconnected: ${peer.id}`);
  },

  error(peer, error) {
    console.error(`[WS] Error ${peer.id}:`, error);
  },
});
