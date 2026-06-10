import React from "react";
import { ConnectedUser } from "../types";
import "../styles/presence.css";

interface PresencePanelProps {
  users: ConnectedUser[];
  inviteCode: string;
}

const PresencePanel: React.FC<PresencePanelProps> = ({ users, inviteCode }) => {
  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
  };

  return (
    <div className="presence-panel">
      <div className="presence-header">
        <i className="bi bi-people me-2" />
        {users.length} online
      </div>

      <div className="presence-users">
        {users.map((u) => (
          <div key={u.userId} className="presence-user">
            <span
              className="presence-dot"
              style={{ background: u.color }}
            />
            <span className="presence-name">{u.username}</span>
          </div>
        ))}
      </div>

      <div className="presence-invite">
        <div className="presence-invite-label">Invite code</div>
        <div className="presence-invite-row">
          <code className="invite-code">{inviteCode}</code>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={copyInviteCode}
            title="Copy invite code"
          >
            <i className="bi bi-clipboard" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PresencePanel;