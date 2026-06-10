import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Session } from "../types";
import "../styles/home.css";

const HomePage: React.FC = () => {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create session modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  // Join modal state
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      setError(null);
      const data = await api.sessions.list();
      setSessions(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const session = await api.sessions.create(newName);
      navigate(`/board/${session.id}`);
    } catch (err) {
      setError((err as Error).message);
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      const session = await api.sessions.join(inviteCode);
      navigate(`/board/${session.id}`);
    } catch (err) {
      setError((err as Error).message);
      setJoining(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="home-layout">
      {/* Sidebar */}
      <aside className="home-sidebar">
        <div className="sidebar-logo">
          <i className="bi bi-layers-fill me-2" />
          CollabBoard
        </div>

        <nav className="sidebar-nav">
          <button className="sidebar-nav-item active">
            <i className="bi bi-grid-fill" /> My Boards
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{username.charAt(0).toUpperCase()}</div>
            <span className="user-name">{username}</span>
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={logout}>
            <i className="bi bi-box-arrow-right" />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="home-main">
        <div className="home-header">
          <div>
            <h1 className="home-title">My Boards</h1>
            <p className="home-subtitle">
              Create or join a whiteboard to start collaborating
            </p>
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-secondary"
              onClick={() => setShowJoin(true)}
            >
              <i className="bi bi-link-45deg me-1" /> Join via Code
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreate(true)}
            >
              <i className="bi bi-plus-lg me-1" /> New Board
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger alert-dismissible d-flex align-items-center">
            <i className="bi bi-exclamation-triangle-fill me-2" />
            {error}
            <button
              type="button"
              className="btn-close btn-close-white ms-auto"
              onClick={() => setError(null)}
            />
          </div>
        )}

        {loading ? (
          <div className="d-flex justify-content-center py-5">
            <div className="spinner-border text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-easel2 empty-icon" />
            <h4>No boards yet</h4>
            <p className="text-muted">
              Create your first board or join one with an invite code.
            </p>
            <button
              className="btn btn-primary mt-2"
              onClick={() => setShowCreate(true)}
            >
              <i className="bi bi-plus-lg me-1" /> Create Board
            </button>
          </div>
        ) : (
          <div className="session-grid">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="session-card"
                onClick={() => navigate(`/board/${s.id}`)}
              >
                <div className="session-card-preview">
                  <i className="bi bi-easel2" />
                </div>
                <div className="session-card-body">
                  <h6 className="session-card-name">{s.name}</h6>
                  <div className="session-card-meta">
                    <span>
                      <i className="bi bi-clock me-1" />
                      {formatDate(s.updated_at)}
                    </span>
                    <span className="invite-badge">
                      <i className="bi bi-key me-1" />
                      {s.invite_code}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Board Modal */}
      {showCreate && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-backdrop show" onClick={() => setShowCreate(false)} />
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">New Whiteboard</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowCreate(false)}
                />
              </div>
              <div className="modal-body">
                <label className="form-label">Board name</label>
                <input
                  className="form-control"
                  placeholder="e.g. Sprint Planning Q3"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                >
                  {creating ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Creating...
                    </>
                  ) : (
                    "Create Board"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoin && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-backdrop show" onClick={() => setShowJoin(false)} />
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Join a Board</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowJoin(false)}
                />
              </div>
              <div className="modal-body">
                <label className="form-label">Invite code</label>
                <input
                  className="form-control text-uppercase"
                  placeholder="e.g. AB12CD34EF"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  maxLength={12}
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setShowJoin(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleJoin}
                  disabled={joining || inviteCode.length < 6}
                >
                  {joining ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Joining...
                    </>
                  ) : (
                    "Join Board"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;