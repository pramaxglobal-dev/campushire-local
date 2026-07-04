import type { Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "../lib/redis";

interface RateLimitRequest extends Request {
  rateLimit?: {
    resetTime?: Date;
  };
}

const buildRetryResponse = (req: RateLimitRequest, res: Response): void => {
  const retryAfterSeconds = req.rateLimit?.resetTime
    ? Math.max(0, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000))
    : 0;

  res.status(429).json({
    success: false,
    data: null,
    error: "Too many requests",
    meta: {
      retryAfter: retryAfterSeconds
    }
  });
};

const createRedisStore = (prefix: string): RedisStore =>
  new RedisStore({
    prefix,
    sendCommand: (...args: string[]): Promise<never> => {
      const command = args[0] ?? "PING";
      return redis.call(command, ...args.slice(1)) as Promise<never>;
    }
  });

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: createRedisStore("rl:auth:"),
  keyGenerator: (req: Request) => req.ip ?? "unknown-ip",
  handler: (req: Request, res: Response) => buildRetryResponse(req as RateLimitRequest, res)
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: createRedisStore("rl:api:"),
  keyGenerator: (req: Request) => (req.user?.userId ?? req.ip) || "unknown-ip",
  handler: (req: Request, res: Response) => buildRetryResponse(req as RateLimitRequest, res)
});
