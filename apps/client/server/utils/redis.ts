import type { H3Event } from "h3";
import type { Redis } from "ioredis";

export const useRedis = (event: H3Event) => {
  let redis = event.context.redis as Redis | null;

  async function setRedis(client: Redis) {
    if (!redis) {
      redis = client;
    }
  }
  async function setCache<T>(
    key: string,
    value: T,
    ttlSeconds?: number
  ): Promise<void> {
    const serializedValue = JSON.stringify(value);
    if (ttlSeconds) {
      await redis?.setex(key, ttlSeconds, serializedValue);
    } else {
      await redis?.set(key, serializedValue);
    }
  }
  async function getCache<T>(key: string): Promise<T | null> {
    const cachedData = await redis?.get(key);
    if (cachedData) {
      return JSON.parse(cachedData) as T;
    }
    return null;
  }
  async function deleteCache(key: string): Promise<void> {
    await redis?.del(key);
  }
  return {
    redis,
    setRedis,
    setCache,
    getCache,
    deleteCache,
  };
};
