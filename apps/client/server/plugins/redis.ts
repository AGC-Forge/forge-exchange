import type { H3Event } from "h3";
import Redis from "ioredis";

let redisClient: Redis | null = null;
export default defineNitroPlugin((nitroApp) => {
  if (!redisClient) {
    const config = useRuntimeConfig();

    redisClient = new Redis({
      host: config.REDIS_HOST as string,
      port: parseInt(config.REDIS_PORT || "6379", 10),
      password: config.REDIS_PASSWORD as string,
      db: parseInt(config.REDIS_DB || "0", 10),
      maxRetriesPerRequest: null,
      connectTimeout: 5000,
    });

    redisClient.on("connect", () => {
      console.log("✅ Redis connected");
    });

    redisClient.on("error", (err) => {
      console.error("❌ Redis error:", err.message);
    });

    redisClient.on("reconnecting", () => {
      console.log("🔁 Redis reconnecting...");
    });
  }
  nitroApp.hooks.hook("request", async (event: H3Event) => {
    event.context.redis = redisClient;

    const { setRedis } = useRedis(event);
    if (redisClient) {
      setRedis(redisClient);
    }
  });
  nitroApp.hooks.hookOnce("render:before", async () => {
    if (redisClient) {
      try {
        await redisClient.ping();
        // console.log("🟢 Redis health check passed");
      } catch (err) {
        console.error("🔴 Redis health check failed:", err);
      }
    }
  });

  nitroApp.hooks.hook("close", async () => {
    if (redisClient) {
      try {
        console.log("🛑 Closing Redis connection...");
        await redisClient.quit();
        console.log("✅ Redis connection closed gracefully");
      } catch (err) {
        console.error("❌ Error closing Redis connection:", err);
      } finally {
        redisClient = null;
      }
    }
  });
});
