CREATE TABLE inbox_cases (
  conversation_id TEXT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('NEW','OPEN','WAITING_CUSTOMER','WAITING_INTERNAL','RESOLVED','CLOSED')),
  priority TEXT NOT NULL CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
  assigned_user_id TEXT REFERENCES users(id),
  tags_json TEXT NOT NULL DEFAULT '[]',
  sla_due_at TEXT,
  first_response_at TEXT,
  resolved_at TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX inbox_cases_queue_idx ON inbox_cases(status, priority, sla_due_at, updated_at);
CREATE TABLE inbox_history (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX inbox_history_conversation_idx ON inbox_history(conversation_id, created_at);
