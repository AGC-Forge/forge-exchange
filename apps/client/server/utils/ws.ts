import Redis from "ioredis";

let publisher: Redis | null = null;

function getPublisher(): Redis {
  if (publisher) return publisher;
  const config = useRuntimeConfig();
  publisher = new Redis({
    host: config.REDIS_HOST as string,
    port: parseInt((config.REDIS_PORT as string) || "6379", 10),
    password: (config.REDIS_PASSWORD as string) || undefined,
    db: parseInt((config.REDIS_DB as string) || "0", 10),
    maxRetriesPerRequest: null,
    connectTimeout: 5000,
  });
  publisher.on("error", (err) => {
    console.error("[WS Publisher] Redis error:", err.message);
  });
  return publisher;
}

/**
 * Kirim pesan ke semua koneksi WS milik user tertentu.
 * Bisa dipanggil dari API endpoint manapun.
 *
 * Contoh:
 *   await wsSend(userId, { type: 'chunk', conversationId, content: '...' })
 *   await wsSend(userId, { type: 'done', conversationId })
 */
export async function wsSend(userId: string, payload: object): Promise<void> {
  const pub = getPublisher();
  await pub.publish("ws:send", JSON.stringify({ userId, ...payload }));
}
