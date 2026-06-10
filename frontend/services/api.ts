import keycloak from "./keycloak";
import { Session, ChatMessage } from "../types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  // Refresh token if expiring soon
  try {
    await keycloak.updateToken(30);
  } catch {
    keycloak.login();
    throw new Error("Session expired");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${keycloak.token}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }

  return response;
}

export const api = {
  sessions: {
    list: async (): Promise<Session[]> => {
      const res = await authFetch("/api/sessions");
      return res.json() as Promise<Session[]>;
    },

    create: async (name: string): Promise<Session> => {
      const res = await authFetch("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      return res.json() as Promise<Session>;
    },

    join: async (inviteCode: string): Promise<Session> => {
      const res = await authFetch("/api/sessions/join", {
        method: "POST",
        body: JSON.stringify({ invite_code: inviteCode }),
      });
      return res.json() as Promise<Session>;
    },

    get: async (id: string): Promise<Session> => {
      const res = await authFetch(`/api/sessions/${id}`);
      return res.json() as Promise<Session>;
    },

    saveCanvas: async (id: string, state: object): Promise<void> => {
      await authFetch(`/api/sessions/${id}/canvas`, {
        method: "PUT",
        body: JSON.stringify({ canvas_state: state }),
      });
    },

    getChatHistory: async (id: string): Promise<ChatMessage[]> => {
      const res = await authFetch(`/api/sessions/${id}/chat`);
      return res.json() as Promise<ChatMessage[]>;
    },
  },
};