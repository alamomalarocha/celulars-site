CREATE TABLE data_import_batches (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  source_name TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PREVIEWED','APPLIED','ROLLED_BACK','FAILED')),
  row_count INTEGER NOT NULL,
  insert_count INTEGER NOT NULL DEFAULT 0,
  update_count INTEGER NOT NULL DEFAULT 0,
  error_report_json TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  backup_json TEXT,
  confirmation_hash TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  applied_at TEXT,
  rolled_back_at TEXT
);
CREATE INDEX data_import_status_idx ON data_import_batches(status, created_at);
CREATE TABLE retention_policies (
  id TEXT PRIMARY KEY,
  data_category TEXT NOT NULL UNIQUE,
  retention_days INTEGER NOT NULL CHECK (retention_days > 0),
  action TEXT NOT NULL CHECK (action IN ('REVIEW','ANONYMIZE','DELETE')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE privacy_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('ACCESS','EXPORT','ANONYMIZE','DELETE')),
  status TEXT NOT NULL CHECK (status IN ('REQUESTED','UNDER_REVIEW','APPROVED','COMPLETED','REJECTED')),
  notes TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  reviewed_by_user_id TEXT REFERENCES users(id),
  completed_at TEXT
);
CREATE TABLE legal_holds (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  released_at TEXT
);
