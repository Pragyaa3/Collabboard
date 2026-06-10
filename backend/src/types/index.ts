export interface Session {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  canvas_state: object;
  created_at: Date;
  updated_at: Date;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: Date;
}

export interface DrawingEvent {
  id?: string;
  session_id: string;
  user_id: string;
  event_data: object;
  sequence_num?: number;
}

export interface TokenPayload {
  sub: string;
  preferred_username: string;
  email: string;
  realm_access?: { roles: string[] };
}

export interface ConnectedUser {
  userId: string;
  username: string;
  color: string;
  sessionId: string;
  socketId: string;
}

export interface CursorPosition {
  x: number;
  y: number;
  userId: string;
  username: string;
  color: string;
}