import { Server, Socket } from "socket.io";
import { verifyToken } from "../middleware/auth";
import { query } from "../db";
import { ConnectedUser, CursorPosition } from "../types";

// Track connected users per session
const sessionUsers = new Map<string, Map<string, ConnectedUser>>();

// Assign a distinct color to each user (cycles through palette)
const USER_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
  "#BB8FCE", "#85C1E9",
];

let colorIndex = 0;
const getNextColor = () => USER_COLORS[colorIndex++ % USER_COLORS.length];

export const setupSocketHandlers = (io: Server): void => {
  // Auth middleware for socket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      socket.data.user = await verifyToken(token);
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user;
    const userId: string = user.sub;
    const username: string = user.preferred_username;

    console.log(`Socket connected: ${username} (${socket.id})`);

    // Join a whiteboard session room
    socket.on("session:join", async (sessionId: string) => {
      // Verify user is a member of this session
      const membership = await query(
        `SELECT 1 FROM session_members WHERE session_id = $1 AND user_id = $2`,
        [sessionId, userId]
      );

      if (!membership.rows.length) {
        socket.emit("error", { message: "Not a member of this session" });
        return;
      }

      socket.join(sessionId);

      // Register in session user map
      if (!sessionUsers.has(sessionId)) {
        sessionUsers.set(sessionId, new Map());
      }

      const connectedUser: ConnectedUser = {
        userId,
        username,
        color: getNextColor(),
        sessionId,
        socketId: socket.id,
      };

      sessionUsers.get(sessionId)!.set(userId, connectedUser);

      // Send current users list to the newly joined user
      const currentUsers = Array.from(sessionUsers.get(sessionId)!.values());
      socket.emit("session:users", currentUsers);

      // Notify others
      socket.to(sessionId).emit("user:joined", connectedUser);

      console.log(`${username} joined session ${sessionId}`);
    });

    // Leave a session room
    socket.on("session:leave", (sessionId: string) => {
      socket.leave(sessionId);
      cleanupUserFromSession(socket.id, sessionId, io);
    });

    // Broadcast cursor position to others in the session
    socket.on("cursor:move", (data: { sessionId: string; x: number; y: number }) => {
      const sessionMap = sessionUsers.get(data.sessionId);
      const connectedUser = sessionMap?.get(userId);

      if (!connectedUser) return;

      const cursor: CursorPosition = {
        x: data.x,
        y: data.y,
        userId,
        username,
        color: connectedUser.color,
      };

      socket.to(data.sessionId).emit("cursor:update", cursor);
    });

    // Broadcast a drawing action (fabric.js object add/modify/remove)
    socket.on(
      "canvas:action",
      async (data: { sessionId: string; action: string; payload: object }) => {
        // Persist the event
        await query(
          `INSERT INTO drawing_events (session_id, user_id, event_data) VALUES ($1, $2, $3)`,
          [data.sessionId, userId, JSON.stringify({ action: data.action, payload: data.payload })]
        );

        // Broadcast to everyone else in the session
        socket.to(data.sessionId).emit("canvas:action", {
          userId,
          username,
          action: data.action,
          payload: data.payload,
        });
      }
    );

    // Save full canvas snapshot periodically
    socket.on("canvas:save", async (data: { sessionId: string; state: object }) => {
      await query(
        `UPDATE sessions SET canvas_state = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(data.state), data.sessionId]
      );
    });

    // Chat message
    socket.on("chat:send", async (data: { sessionId: string; content: string }) => {
      if (!data.content?.trim()) return;

      const result = await query(
        `INSERT INTO chat_messages (session_id, user_id, username, content)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [data.sessionId, userId, username, data.content.trim()]
      );

      const message = result.rows[0];
      io.to(data.sessionId).emit("chat:message", message);
    });

    // On disconnect, remove from all sessions they were in
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${username}`);

      for (const [sessionId] of sessionUsers) {
        cleanupUserFromSession(socket.id, sessionId, io);
      }
    });
  });
};

function cleanupUserFromSession(socketId: string, sessionId: string, io: Server): void {
  const sessionMap = sessionUsers.get(sessionId);
  if (!sessionMap) return;

  for (const [userId, user] of sessionMap) {
    if (user.socketId === socketId) {
      sessionMap.delete(userId);
      io.to(sessionId).emit("user:left", { userId, username: user.username });
      break;
    }
  }

  if (sessionMap.size === 0) {
    sessionUsers.delete(sessionId);
  }
}