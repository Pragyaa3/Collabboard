import { Router, Request, Response } from "express";
import { nanoid } from "nanoid";
import { query } from "../db";
import { authenticate } from "../middleware/auth";
import { Session, ChatMessage } from "../types";

const router = Router();

// All session routes require auth
router.use(authenticate);

// Create a new whiteboard session
router.post("/", async (req: Request, res: Response) => {
  const { name } = req.body as { name: string };
  const userId = req.user!.sub;

  if (!name?.trim()) {
    return res.status(400).json({ error: "Session name is required" });
  }

  const inviteCode = nanoid(10).toUpperCase();

  const result = await query<Session>(
    `INSERT INTO sessions (name, owner_id, invite_code, canvas_state)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name.trim(), userId, inviteCode, JSON.stringify({})]
  );

  // Auto-join as member
  await query(
    `INSERT INTO session_members (session_id, user_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [result.rows[0].id, userId]
  );

  return res.status(201).json(result.rows[0]);
});

// Get all sessions the user owns or has joined
router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.sub;

  const result = await query<Session>(
    `SELECT s.* FROM sessions s
     INNER JOIN session_members sm ON sm.session_id = s.id
     WHERE sm.user_id = $1
     ORDER BY s.updated_at DESC`,
    [userId]
  );

  return res.json(result.rows);
});

// Join by invite code
router.post("/join", async (req: Request, res: Response) => {
  const { invite_code } = req.body as { invite_code: string };
  const userId = req.user!.sub;

  if (!invite_code?.trim()) {
    return res.status(400).json({ error: "Invite code is required" });
  }

  const sessionResult = await query<Session>(
    `SELECT * FROM sessions WHERE invite_code = $1`,
    [invite_code.trim().toUpperCase()]
  );

  if (!sessionResult.rows.length) {
    return res.status(404).json({ error: "No session found with that invite code" });
  }

  const session = sessionResult.rows[0];

  await query(
    `INSERT INTO session_members (session_id, user_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [session.id, userId]
  );

  return res.json(session);
});

// Get one session (must be a member)
router.get("/:id", async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const { id } = req.params;

  const result = await query<Session>(
    `SELECT s.* FROM sessions s
     INNER JOIN session_members sm ON sm.session_id = s.id
     WHERE s.id = $1 AND sm.user_id = $2`,
    [id, userId]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: "Session not found or access denied" });
  }

  return res.json(result.rows[0]);
});

// Save canvas state
router.put("/:id/canvas", async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const { id } = req.params;
  const { canvas_state } = req.body as { canvas_state: object };

  // Must be a member
  const membership = await query(
    `SELECT 1 FROM session_members WHERE session_id = $1 AND user_id = $2`,
    [id, userId]
  );

  if (!membership.rows.length) {
    return res.status(403).json({ error: "Access denied" });
  }

  await query(
    `UPDATE sessions SET canvas_state = $1, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(canvas_state), id]
  );

  return res.json({ ok: true });
});

// Get chat history for a session
router.get("/:id/chat", async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const { id } = req.params;

  const membership = await query(
    `SELECT 1 FROM session_members WHERE session_id = $1 AND user_id = $2`,
    [id, userId]
  );

  if (!membership.rows.length) {
    return res.status(403).json({ error: "Access denied" });
  }

  const result = await query<ChatMessage>(
    `SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT 200`,
    [id]
  );

  return res.json(result.rows);
});

export default router;