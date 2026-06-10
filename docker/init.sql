CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  invite_code VARCHAR(20) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  session_id INT,
  user_name VARCHAR(100),
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE canvas_snapshots (
  id SERIAL PRIMARY KEY,
  session_id INT,
  canvas_json JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);