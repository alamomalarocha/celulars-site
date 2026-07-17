ALTER TABLE audit_events ADD COLUMN actor_role TEXT;
ALTER TABLE audit_events ADD COLUMN company_id TEXT REFERENCES companies(id);

ALTER TABLE notifications ADD COLUMN company_id TEXT REFERENCES companies(id);
ALTER TABLE notifications ADD COLUMN entity_type TEXT;
ALTER TABLE notifications ADD COLUMN entity_id TEXT;
ALTER TABLE notifications ADD COLUMN dedupe_key TEXT;

CREATE INDEX audit_events_actor_idx ON audit_events(actor_user_id, created_at);
CREATE INDEX audit_events_company_idx ON audit_events(company_id, created_at);
CREATE INDEX notifications_user_unread_idx ON notifications(user_id, read_at, created_at);
CREATE UNIQUE INDEX notifications_dedupe_idx ON notifications(user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;
