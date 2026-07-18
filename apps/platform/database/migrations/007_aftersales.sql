CREATE TABLE return_requests (
  id TEXT PRIMARY KEY,
  return_number TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL REFERENCES orders(id),
  company_id TEXT REFERENCES companies(id),
  status TEXT NOT NULL CHECK (status IN ('REQUESTED','UNDER_REVIEW','APPROVED','REJECTED','RECEIVED','INSPECTED','RESTOCKED','CLOSED')),
  reason_code TEXT NOT NULL,
  customer_notes TEXT NOT NULL,
  internal_notes TEXT NOT NULL,
  resolution TEXT CHECK (resolution IS NULL OR resolution IN ('RESTOCK','DISCARD','REPAIR','INTERNAL_REFUND')),
  requested_by_user_id TEXT NOT NULL REFERENCES users(id),
  assigned_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX return_requests_order_idx ON return_requests(order_id, created_at);
CREATE TABLE return_items (
  id TEXT PRIMARY KEY,
  return_id TEXT NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  order_item_id TEXT NOT NULL REFERENCES order_items(id),
  inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  inspection_result TEXT,
  UNIQUE(return_id, order_item_id)
);
CREATE TABLE return_history (
  id TEXT PRIMARY KEY,
  return_id TEXT NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  notes TEXT NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);
CREATE INDEX return_history_return_idx ON return_history(return_id, created_at);

CREATE TABLE inventory_movement_details (
  movement_id TEXT PRIMARY KEY REFERENCES inventory_movements(id) ON DELETE CASCADE,
  operation_kind TEXT NOT NULL CHECK (operation_kind IN ('ENTRY','RESERVATION','RELEASE','SALE','RETURN','ADJUSTMENT_POSITIVE','ADJUSTMENT_NEGATIVE','TRANSFER','CANCELLATION','CORRECTION','PHYSICAL_COUNT')),
  document_reference TEXT,
  reason TEXT NOT NULL,
  comment TEXT NOT NULL,
  origin_location TEXT,
  destination_location TEXT,
  physical_before INTEGER NOT NULL,
  physical_after INTEGER NOT NULL,
  reserved_before INTEGER NOT NULL,
  reserved_after INTEGER NOT NULL
);
