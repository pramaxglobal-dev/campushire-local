import pino from "pino";
import { env } from "../config/env";

const isDev = env.NODE_ENV === "development";

export const logger = pino(
  isDev
    ? {
        level: "debug",
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname"
          }
        }
      }
    : {
        level: "info"
      }
);

export const httpLogger = logger.child({ context: "http" });
