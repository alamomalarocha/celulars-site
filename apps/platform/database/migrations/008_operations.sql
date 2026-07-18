CREATE TABLE job_queue (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL CHECK (job_type IN ('EMAIL_DELIVERY','WHATSAPP_DELIVERY','EXPIRE_RESERVATIONS','NOTIFICATIONS','REPORT','SESSION_CLEANUP','DOCUMENT_PROCESSING','BACKUP')),
  payload_json TEXT NOT NULL,
  correlation_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('PENDING','RUNNING','COMPLETED','FAILED','DEAD_LETTER')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  run_after TEXT NOT NULL,
  locked_at TEXT,
  completed_at TEXT,
  last_error TEXT,
  created_by_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX job_queue_ready_idx ON job_queue(status, run_after, created_at);
CREATE TABLE job_attempts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES job_queue(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('COMPLETED','FAILED')),
  error_message TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL
);
