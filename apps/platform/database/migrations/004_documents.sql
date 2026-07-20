CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  uploaded_by_user_id TEXT NOT NULL REFERENCES users(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('COMPANY','REQUEST','MESSAGE','ORDER','INTERNAL')),
  entity_id TEXT,
  original_name TEXT NOT NULL,
  safe_name TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  checksum_sha256 TEXT NOT NULL,
  scan_status TEXT NOT NULL CHECK (scan_status IN ('PENDING','CLEAN','REJECTED')),
  expires_at TEXT,
  deleted_at TEXT,
  deleted_by_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
);
CREATE INDEX documents_company_entity_idx ON documents(company_id, entity_type, entity_id, created_at);
CREATE INDEX documents_expiration_idx ON documents(expires_at, deleted_at);
