import { io, Socket } from "socket.io-client";
import keycloak from "./keycloak";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:4000";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket || !socket.connected) {
    socket = io(WS_URL, {
      auth: { token: keycloak.token },
      transports: ["websocket"],
      autoConnect: true,
    });
  }
  return socket;
};

export const disconnectSocket = (): void => {
  socket?.disconnect();
  socket = null;
};