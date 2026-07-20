PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (code IN ('ADMIN', 'EMPLOYEE', 'WHOLESALE')),
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company_type TEXT NOT NULL CHECK (company_type IN ('WHOLESALE', 'INTERNAL')),
  country TEXT NOT NULL,
  demo_identifier TEXT NOT NULL UNIQUE,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  approval_status TEXT NOT NULL CHECK (approval_status IN ('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','SUSPENDED')),
  classification TEXT NOT NULL,
  price_list_id TEXT,
  carrier_name TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','SUSPENDED')),
  company_id TEXT REFERENCES companies(id),
  failed_login_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
  locked_until TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_secret TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  rotated_at TEXT NOT NULL
);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE company_documents (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('DEMO','REVIEWED','REJECTED')),
  created_at TEXT NOT NULL
);

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_demo TEXT NOT NULL,
  country TEXT NOT NULL,
  language TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('LEAD','ACTIVE','INACTIVE')),
  notes TEXT NOT NULL,
  assigned_user_id TEXT REFERENCES users(id),
  company_id TEXT REFERENCES companies(id),
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE customer_addresses (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address_demo TEXT NOT NULL,
  country TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE price_lists (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  list_type TEXT NOT NULL CHECK (list_type IN ('RETAIL','CPO','WHOLESALE')),
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','INACTIVE')),
  valid_from TEXT NOT NULL,
  valid_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  canonical_key TEXT NOT NULL UNIQUE,
  model_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('NEW','CPO')),
  demo_active INTEGER NOT NULL DEFAULT 1 CHECK (demo_active IN (0,1)),
  canonical_snapshot TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  capacity TEXT NOT NULL,
  color TEXT NOT NULL,
  sku_demo TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(product_id, capacity, color)
);

CREATE TABLE prices (
  id TEXT PRIMARY KEY,
  price_list_id TEXT NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL,
  valid_from TEXT NOT NULL,
  valid_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(price_list_id, variant_id, valid_from)
);

CREATE TABLE inventory_items (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
  low_stock_threshold INTEGER NOT NULL DEFAULT 2 CHECK (low_stock_threshold >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE inventory_movements (
  id TEXT PRIMARY KEY,
  inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('RECEIPT','RESERVATION','RELEASE','SALE','RETURN','ADJUSTMENT_IN','ADJUSTMENT_OUT','TRANSFER','CANCELLATION')),
  physical_delta INTEGER NOT NULL,
  reserved_delta INTEGER NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id TEXT,
  notes TEXT NOT NULL,
  actor_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
);
CREATE INDEX inventory_movements_item_idx ON inventory_movements(inventory_item_id, created_at);

CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  company_id TEXT REFERENCES companies(id),
  lead_type TEXT NOT NULL CHECK (lead_type IN ('RETAIL','WHOLESALE','PRODUCT','PRICE','PICKUP','SHIPPING','SUPPORT')),
  status TEXT NOT NULL CHECK (status IN ('NEW','ASSIGNED','IN_PROGRESS','WAITING_CUSTOMER','RESOLVED','CLOSED')),
  priority TEXT NOT NULL CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
  tags_json TEXT NOT NULL,
  assigned_user_id TEXT REFERENCES users(id),
  internal_notes TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE requests (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('NEW','ASSIGNED','IN_PROGRESS','WAITING_CUSTOMER','RESOLVED','CLOSED')),
  created_by_user_id TEXT REFERENCES users(id),
  assigned_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  customer_id TEXT REFERENCES customers(id),
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OPEN','PENDING','CLOSED')),
  assigned_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_user_id TEXT REFERENCES users(id),
  body TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('MESSAGE','INTERNAL_NOTE','TEMPLATE')),
  external_delivery TEXT NOT NULL DEFAULT 'DEMO_NOT_SENT',
  created_at TEXT NOT NULL
);

CREATE TABLE message_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  body TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE quotes (
  id TEXT PRIMARY KEY,
  quote_number TEXT NOT NULL UNIQUE,
  company_id TEXT REFERENCES companies(id),
  customer_id TEXT REFERENCES customers(id),
  status TEXT NOT NULL CHECK (status IN ('DRAFT','SENT','VIEWED','ACCEPTED','REJECTED','EXPIRED','CONVERTED')),
  currency TEXT NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  notes TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE quote_items (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES product_variants(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  notes TEXT NOT NULL
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  quote_id TEXT REFERENCES quotes(id),
  company_id TEXT REFERENCES companies(id),
  customer_id TEXT REFERENCES customers(id),
  status TEXT NOT NULL CHECK (status IN ('DRAFT','CONFIRMED','RESERVED','READY_FOR_PICKUP','SHIPPED','DELIVERED','CANCELLED','RETURNED')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('PENDING','CONFIRMED','REFUNDED')),
  currency TEXT NOT NULL,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('MIAMI_PICKUP','US_DOMESTIC','BRAZIL_CARRIER','WHOLESALE_CARRIER')),
  address_demo TEXT NOT NULL,
  carrier_demo TEXT NOT NULL,
  notes TEXT NOT NULL,
  assigned_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES product_variants(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0)
);

CREATE TABLE reservations (
  id TEXT PRIMARY KEY,
  inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id),
  order_id TEXT REFERENCES orders(id),
  quote_id TEXT REFERENCES quotes(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','RELEASED','CONVERTED','EXPIRED')),
  expires_at TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (order_id IS NOT NULL OR quote_id IS NOT NULL)
);

CREATE TABLE shipments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('PENDING','READY','IN_TRANSIT','DELIVERED','CANCELLED')),
  method TEXT NOT NULL,
  carrier_demo TEXT NOT NULL,
  tracking_demo TEXT NOT NULL,
  shipping_cost_cents INTEGER NOT NULL CHECK (shipping_cost_cents >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  notes TEXT NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_json TEXT,
  after_json TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX audit_events_entity_idx ON audit_events(entity_type, entity_id, created_at);

CREATE TABLE settings (
  id TEXT PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('STRING','NUMBER','BOOLEAN','JSON')),
  updated_by_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

