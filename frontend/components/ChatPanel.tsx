import React, { useEffect, useRef, useState } from "react";
import { ChatMessage } from "../types";
import { getSocket } from "../services/socket";
import "../styles/chat.css";

interface ChatPanelProps {
  sessionId: string;
  currentUserId: string;
  history: ChatMessage[];
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  sessionId,
  currentUserId,
  history,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(history);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(history);
  }, [history]);

  useEffect(() => {
    const socket = getSocket();

    const onMessage = (msg: ChatMessage) => {
      if (msg.session_id === sessionId) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on("chat:message", onMessage);
    return () => { socket.off("chat:message", onMessage); };
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!draft.trim()) return;
    getSocket().emit("chat:send", { sessionId, content: draft.trim() });
    setDraft("");
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <i className="bi bi-chat-dots me-2" />
        Chat
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">No messages yet. Say something!</div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-msg ${msg.user_id === currentUserId ? "own" : ""}`}
          >
            {msg.user_id !== currentUserId && (
              <div className="chat-username">{msg.username}</div>
            )}
            <div className="chat-bubble">{msg.content}</div>
            <div className="chat-time">{formatTime(msg.created_at)}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          className="form-control chat-input"
          placeholder="Send a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          maxLength={500}
        />
        <button
          className="btn btn-primary chat-send-btn"
          onClick={sendMessage}
          disabled={!draft.trim()}
        >
          <i className="bi bi-send-fill" />
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;