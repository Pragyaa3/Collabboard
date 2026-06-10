import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { getSocket, disconnectSocket } from "../services/socket";
import { useWhiteboard } from "../hooks/useWhiteboard";
import Toolbar from "../components/Toolbar";
import ChatPanel from "../components/ChatPanel";
import PresencePanel from "../components/PresencePanel";
import { Session, ConnectedUser, CursorPosition, ChatMessage } from "../types";
import "../styles/whiteboard.css";

const WhiteboardPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { username, userId, logout } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [showChat, setShowChat] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const handleSave = useCallback(
    (state: object) => {
      if (sessionId) api.sessions.saveCanvas(sessionId, state);
    },
    [sessionId]
  );

  const {
    canvasRef,
    settings,
    setTool,
    setColor,
    setBrushSize,
    undo,
    redo,
    canUndo,
    canRedo,
    clearCanvas,
    exportAsPng,
    exportAsPdf,
  } = useWhiteboard({ sessionId: sessionId!, onSave: handleSave });

  // Load session data
  useEffect(() => {
    if (!sessionId) return;

    (async () => {
      try {
        const [sess, history] = await Promise.all([
          api.sessions.get(sessionId),
          api.sessions.getChatHistory(sessionId),
        ]);
        setSession(sess);
        setChatHistory(history);
      } catch (err) {
        setLoadError((err as Error).message);
      }
    })();
  }, [sessionId]);

  // Socket: join session room, track users and cursors
  useEffect(() => {
    if (!sessionId) return;
    const socket = getSocket();

    socket.emit("session:join", sessionId);

    socket.on("session:users", (users: ConnectedUser[]) => {
      setConnectedUsers(users);
    });

    socket.on("user:joined", (user: ConnectedUser) => {
      setConnectedUsers((prev) => {
        const filtered = prev.filter((u) => u.userId !== user.userId);
        return [...filtered, user];
      });
    });

    socket.on("user:left", (data: { userId: string }) => {
      setConnectedUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    });

    socket.on("cursor:update", (cursor: CursorPosition) => {
      setRemoteCursors((prev) => new Map(prev).set(cursor.userId, cursor));
    });

    return () => {
      socket.emit("session:leave", sessionId);
      socket.off("session:users");
      socket.off("user:joined");
      socket.off("user:left");
      socket.off("cursor:update");
      disconnectSocket();
    };
  }, [sessionId]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") { e.preventDefault(); undo(); }
        if (e.key === "y") { e.preventDefault(); redo(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  // Broadcast cursor position
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const socket = getSocket();
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    socket.emit("cursor:move", {
      sessionId,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Resize canvas to container
  useEffect(() => {
    const resize = () => {
      const container = canvasContainerRef.current;
      if (!container || !canvasRef.current) return;
      const { width, height } = container.getBoundingClientRect();
      // fabric canvas resize via wrapper element
      const wrapper = canvasRef.current.parentElement;
      if (wrapper) {
        wrapper.style.width = `${width}px`;
        wrapper.style.height = `${height}px`;
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvasContainerRef.current) ro.observe(canvasContainerRef.current);
    return () => ro.disconnect();
  }, [canvasRef]);

  if (loadError) {
    return (
      <div className="loading-screen">
        <i className="bi bi-exclamation-circle text-danger" style={{ fontSize: 40 }} />
        <p className="text-danger">{loadError}</p>
        <button className="btn btn-outline-secondary" onClick={() => navigate("/")}>
          Back to Home
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="loading-screen">
        <div className="spinner-border text-primary" />
        <span className="text-muted">Loading board…</span>
      </div>
    );
  }

  return (
    <div className="wb-layout">
      {/* Top nav */}
      <header className="wb-nav">
        <div className="wb-nav-left">
          <button
            className="wb-nav-btn"
            onClick={() => navigate("/")}
            title="Back to home"
          >
            <i className="bi bi-grid-fill" />
          </button>
          <span className="wb-session-name">{session.name}</span>
        </div>

        <div className="wb-nav-right">
          <button
            className={`wb-nav-btn ${showSidebar ? "active" : ""}`}
            onClick={() => setShowSidebar((v) => !v)}
            title="Toggle sidebar"
          >
            <i className="bi bi-people" />
          </button>
          <button
            className={`wb-nav-btn ${showChat ? "active" : ""}`}
            onClick={() => setShowChat((v) => !v)}
            title="Toggle chat"
          >
            <i className="bi bi-chat-dots" />
          </button>
          <div className="wb-user-badge">
            <span>{username}</span>
          </div>
          <button className="wb-nav-btn" onClick={logout} title="Logout">
            <i className="bi bi-box-arrow-right" />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="wb-body">
        {/* Sidebar: presence */}
        {showSidebar && (
          <aside className="wb-sidebar">
            <PresencePanel
              users={connectedUsers}
              inviteCode={session.invite_code}
            />
          </aside>
        )}

        {/* Canvas area */}
        <div
          className="wb-canvas-area"
          ref={canvasContainerRef}
          onMouseMove={handleMouseMove}
        >
          <Toolbar
            settings={settings}
            onToolChange={setTool}
            onColorChange={setColor}
            onBrushSizeChange={setBrushSize}
            onUndo={undo}
            onRedo={redo}
            onClear={clearCanvas}
            onExportPng={exportAsPng}
            onExportPdf={exportAsPdf}
            canUndo={canUndo}
            canRedo={canRedo}
          />

          {/* Fabric.js canvas */}
          <canvas ref={canvasRef} className="wb-canvas" />

          {/* Remote cursors overlay */}
          {Array.from(remoteCursors.values()).map((cursor) => (
            cursor.userId !== userId && (
              <div
                key={cursor.userId}
                className="remote-cursor"
                style={{
                  left: cursor.x,
                  top: cursor.y,
                  "--cursor-color": cursor.color,
                } as React.CSSProperties}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2 2l10 4-5 2-2 5L2 2z"
                    fill={cursor.color}
                    stroke="white"
                    strokeWidth="1"
                  />
                </svg>
                <span
                  className="remote-cursor-label"
                  style={{ background: cursor.color }}
                >
                  {cursor.username}
                </span>
              </div>
            )
          ))}
        </div>

        {/* Chat panel */}
        {showChat && (
          <aside className="wb-chat">
            <ChatPanel
              sessionId={sessionId!}
              currentUserId={userId}
              history={chatHistory}
            />
          </aside>
        )}
      </div>
    </div>
  );
};

export default WhiteboardPage;