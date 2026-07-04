import { PrismaClient } from "@prisma/client";
import { env } from "./env";
import { logger } from "../lib/logger";

declare global {
  interface GlobalThis {
    __campushirePrisma?: PrismaClient;
  }
}

const prismaGlobal = globalThis as typeof globalThis & {
  __campushirePrisma?: PrismaClient;
};

const createPrismaClient = (): PrismaClient => {
  const prisma = new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "event", level: "info" },
            { emit: "event", level: "warn" },
            { emit: "event", level: "error" }
          ]
        : [{ emit: "stdout", level: "error" }]
  });

  if (env.NODE_ENV === "development") {
    prisma.$on("query", (event) => {
      logger.debug(
        {
          query: event.query,
          durationMs: event.duration,
          params: event.params
        },
        "Prisma query"
      );
    });
    prisma.$on("info", (event) => logger.debug({ message: event.message }, "Prisma info"));
    prisma.$on("warn", (event) => logger.warn({ message: event.message }, "Prisma warn"));
    prisma.$on("error", (event) => logger.error({ message: event.message }, "Prisma error"));
  }

  return prisma;
};

export const prisma = prismaGlobal.__campushirePrisma ?? createPrismaClient();

if (!prismaGlobal.__campushirePrisma) {
  prismaGlobal.__campushirePrisma = prisma;
}
