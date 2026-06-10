import "express-async-errors";
import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import cors from "cors";
import sessionRoutes from "./routes/sessions";
import { setupSocketHandlers } from "./socket/handlers";

const app = express();
const httpServer = createServer(app);

const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";

const io = new SocketServer(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/sessions", sessionRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// Socket.io
setupSocketHandlers(io);

const PORT = parseInt(process.env.PORT ?? "4000", 10);

httpServer.listen(PORT, () => {
  console.log(`CollabBoard backend running on :${PORT}`);
});