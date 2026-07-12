import { createServer } from "http";
import cron from "node-cron";
import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";
import { logger } from "./lib/logger";
import { initSocket } from "./lib/socket";
import { runInterviewReminderJob } from "./jobs/interview-reminders";

const server = createServer(app);
const io = initSocket(server);

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, "Graceful shutdown initiated");

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });

  io.close();
  await prisma.$disconnect();

  try {
    if (redis.status !== "end") {
      await redis.quit();
    }
  } catch (error) {
    logger.warn({ error }, "Redis disconnect failed (already disconnected)");
  }

  logger.info("Shutdown complete");
  process.exit(0);
};

const start = async (): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    // Try to connect to Redis, but don't block server startup if it fails
    try {
      if (redis.status !== "ready") {
        await redis.connect();
      }
      await redis.ping();
      logger.info("Redis connected successfully");
    } catch (redisError) {
      logger.warn({ error: redisError }, "Redis connection failed - continuing without Redis (rate limiting disabled)");
    }

    server.listen(env.API_PORT, () => {
      logger.info({ port: env.API_PORT, env: env.NODE_ENV }, "API server started");
    });

    cron.schedule("0 * * * *", () => {
      runInterviewReminderJob().catch((error: unknown) => {
        logger.error({ error }, "Interview reminder cron failed");
      });
    });

    process.on("SIGTERM", () => {
      void shutdown("SIGTERM");
    });

    process.on("SIGINT", () => {
      void shutdown("SIGINT");
    });
  } catch (error) {
    logger.error({ error }, "Failed to start server");
    await prisma.$disconnect();
    if (redis.status !== "end") {
      await redis.quit();
    }
    process.exit(1);
  }
};

void start();
