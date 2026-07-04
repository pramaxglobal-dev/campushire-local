import Redis from "ioredis";
import { env } from "./env";
import { logger } from "../lib/logger";

declare global {
  interface GlobalThis {
    __campushireRedis?: Redis;
  }
}

const createRedisClient = (): Redis => {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: (attempts: number): number => {
      const delay = Math.min(attempts * 100, 3000);
      logger.warn({ attempts, delay }, "Redis reconnecting");
      return delay;
    }
  });

  client.on("connect", () => logger.info("Redis connected"));
  client.on("ready", () => logger.info("Redis ready"));
  client.on("error", (error: Error) => logger.error({ error }, "Redis error"));
  client.on("end", () => logger.warn("Redis connection ended"));

  return client;
};

export const redis = globalThis.__campushireRedis ?? createRedisClient();

if (env.NODE_ENV !== "production") {
  globalThis.__campushireRedis = redis;
}
