"use client";

import { io, type Socket } from "socket.io-client";
import { env } from "@/lib/env";

let socket: Socket | null = null;

export function connectSocket(accessToken: string): Socket {
  const baseUrl = env.apiUrl;

  if (socket?.connected) {
    return socket;
  }

  socket = io(baseUrl, {
    auth: { token: accessToken },
    transports: ["websocket"],
    reconnectionAttempts: 5
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
