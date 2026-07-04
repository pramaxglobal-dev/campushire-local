import type { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";
import { MessageType } from "@campushire/types";
import { env } from "../config/env";
import { prisma } from "./prisma";
import { verifyAccessToken } from "./jwt";
import { logger } from "./logger";

interface SocketUser {
  userId: string;
  tenantId: string | null;
}

let ioInstance: Server | null = null;

const extractToken = (socket: Socket): string | null => {
  const authToken = socket.handshake.auth.token;
  if (typeof authToken === "string" && authToken.length > 0) {
    return authToken;
  }

  const headerToken = socket.handshake.headers.authorization;
  if (typeof headerToken === "string" && headerToken.startsWith("Bearer ")) {
    return headerToken.replace("Bearer ", "").trim();
  }

  return null;
};

export const initSocket = (server: HttpServer): Server => {
  ioInstance = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true
    }
  });

  ioInstance.use((socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) {
        return next(new Error("Authentication token missing"));
      }

      const payload = verifyAccessToken(token);
      const socketUser: SocketUser = {
        userId: payload.userId,
        tenantId: payload.tenantId
      };
      socket.data.user = socketUser;
      return next();
    } catch (error) {
      return next(new Error("Unauthorized socket connection"));
    }
  });

  ioInstance.on("connection", (socket) => {
    const user = socket.data.user as SocketUser;
    socket.join(`user:${user.userId}`);
    if (user.tenantId) {
      socket.join(`tenant:${user.tenantId}`);
    }
    void (async () => {
      try {
        if (!user.tenantId) {
          return;
        }
        const threads = await prisma.chatThread.findMany({
          where: {
            tenantId: user.tenantId,
            participantUserIds: {
              array_contains: [user.userId]
            }
          },
          select: {
            id: true
          }
        });
        for (const thread of threads) {
          socket.join(`thread:${thread.id}`);
        }
      } catch (error) {
        logger.warn({ error, userId: user.userId }, "Failed to join chat thread rooms");
      }
    })();

    socket.on(
      "message:send",
      async (payload: { threadId: string; content?: string; messageType?: string }) => {
        try {
          const { sendMessageFromSocket } = await import("../modules/chat/chat.service");
          const message = await sendMessageFromSocket(user.userId, {
            threadId: payload.threadId,
            content: payload.content,
            messageType:
              payload.messageType && Object.values(MessageType).includes(payload.messageType as MessageType)
                ? (payload.messageType as MessageType)
                : MessageType.TEXT
          });
          socket.emit("message:sent", {
            threadId: payload.threadId,
            message
          });
        } catch (error) {
          socket.emit("message:error", {
            threadId: payload.threadId,
            error: "Unable to send message"
          });
          logger.warn({ error, userId: user.userId }, "Socket message send failed");
        }
      }
    );

    socket.on("disconnect", () => {
      logger.info({ userId: user.userId, socketId: socket.id }, "Socket disconnected");
    });

    logger.info({ userId: user.userId, socketId: socket.id }, "Socket connected");
  });

  return ioInstance;
};

export const getIO = (): Server => {
  if (!ioInstance) {
    throw new Error("Socket.io is not initialized.");
  }
  return ioInstance;
};

export const emitToUser = (userId: string, event: string, data: unknown): void => {
  if (!ioInstance) {
    return;
  }
  ioInstance.to(`user:${userId}`).emit(event, data);
};

export const emitToTenant = (tenantId: string, event: string, data: unknown): void => {
  if (!ioInstance) {
    return;
  }
  ioInstance.to(`tenant:${tenantId}`).emit(event, data);
};
