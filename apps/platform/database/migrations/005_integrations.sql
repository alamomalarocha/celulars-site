CREATE TABLE delivery_templates (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('EMAIL','WHATSAPP')),
  code TEXT NOT NULL,
  subject_template TEXT,
  body_template TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL,
  UNIQUE(channel, code)
);

CREATE TABLE delivery_outbox (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('EMAIL','WHATSAPP')),
  template_code TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  company_id TEXT REFERENCES companies(id),
  conversation_id TEXT REFERENCES conversations(id),
  correlation_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('PENDING','PROCESSING','SIMULATED','SENT','FAILED','BOUNCED','UNSUBSCRIBED')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  next_attempt_at TEXT,
  provider_message_id TEXT,
  last_error TEXT,
  created_by_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX delivery_outbox_status_idx ON delivery_outbox(status, next_attempt_at, created_at);
CREATE INDEX delivery_outbox_company_idx ON delivery_outbox(company_id, channel, created_at);

CREATE TABLE inbound_webhooks (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  signature_valid INTEGER NOT NULL CHECK (signature_valid IN (0,1)),
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('RECEIVED','PROCESSED','REJECTED')),
  received_at TEXT NOT NULL,
  processed_at TEXT,
  UNIQUE(provider, external_event_id)
);
