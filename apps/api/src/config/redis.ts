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
    enableOfflineQueue: false,
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

  const safeCommands = new Set(["get", "set", "del", "keys"]);
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && safeCommands.has(prop)) {
        if (target.status !== "ready") {
          return async (...args: any[]) => {
            logger.debug(`Redis not ready, skipping command: ${prop}`);
            if (prop === "keys") return [];
            return null;
          };
        }
      }
      return Reflect.get(target, prop, receiver);
    }
  }) as Redis;
};

export const redis = globalThis.__campushireRedis ?? createRedisClient();

if (env.NODE_ENV !== "production") {
  globalThis.__campushireRedis = redis;
}

