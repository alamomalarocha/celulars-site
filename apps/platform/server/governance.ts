import { randomUUID } from 'node:crypto';
import type { PlatformDatabase } from '../database/db.js';
import type { Principal } from './types.js';

const demoBanner = 'AMBIENTE DE DEMONSTRACAO - DADOS FICTICIOS';
const sensitiveKey = /(password|senha|hash|token|secret|segredo|cookie|session|sessao|document|documento)/i;

interface AuditContext {
  readonly before?: unknown;
  readonly after?: unknown;
  readonly companyId?: string | null;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly createdAt?: string;
}

interface AuditFilters {
  readonly from?: string | null;
  readonly to?: string | null;
  readonly userId?: string | null;
  readonly role?: string | null;
  readonly action?: string | null;
  readonly entityType?: string | null;
  readonly companyId?: string | null;
}

interface NotificationInput {
  readonly userId: string;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly companyId?: string | null;
  readonly entityType?: string | null;
  readonly entityId?: string | null;
  readonly dedupeKey?: string | null;
  readonly createdAt?: string;
}

interface SettingDefinition {
  readonly type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  readonly label: string;
  readonly validate?: (value: string) => boolean;
}

interface SettingUpdateResult {
  readonly key: string;
  readonly value: string;
  readonly valueType: SettingDefinition['type'];
  readonly previousValue: string;
  readonly updatedAt: string;
}

const settingDefinitions: Readonly<Record<string, SettingDefinition>> = {
  operation_name: { type: 'STRING', label: 'Nome da plataforma', validate: (value) => value.length >= 3 && value.length <= 80 },
  currency: { type: 'STRING', label: 'Moeda principal', validate: (value) => ['USD', 'BRL'].includes(value) },
  brazil_cpo_shipping: { type: 'NUMBER', label: 'Envio CPO para o Brasil (USD)', validate: positiveNumber },
  brazil_new_shipping: { type: 'NUMBER', label: 'Envio Novo para o Brasil (USD)', validate: positiveNumber },
  reservation_minutes: { type: 'NUMBER', label: 'Duracao da reserva (minutos)', validate: positiveInteger },
  low_stock_threshold: { type: 'NUMBER', label: 'Limite de estoque baixo', validate: nonNegativeInteger },
  default_language: { type: 'STRING', label: 'Idioma padrao', validate: (value) => /^[a-z]{2}-[A-Z]{2}$/.test(value) },
  notification_templates: { type: 'JSON', label: 'Templates internos', validate: validJsonObject },
  default_order_status: { type: 'STRING', label: 'Status padrao do pedido', validate: (value) => value === 'DRAFT' },
  quote_sequence_prefix: { type: 'STRING', label: 'Prefixo de cotacao', validate: safePrefix },
  order_sequence_prefix: { type: 'STRING', label: 'Prefixo de pedido', validate: safePrefix },
  notifications_enabled: { type: 'BOOLEAN', label: 'Notificacoes internas', validate: booleanText },
  demo_mode: { type: 'BOOLEAN', label: 'Modo DEMO', validate: (value) => value === 'true' }
};

function positiveNumber(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 100_000;
}

function positiveInteger(value: string): boolean {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 100_000;
}

function nonNegativeInteger(value: string): boolean {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 100_000;
}

function validJsonObject(value: string): boolean {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

function safePrefix(value: string): boolean {
  return /^[A-Z0-9-]{2,20}$/.test(value);
}

function booleanText(value: string): boolean {
  return value === 'true' || value === 'false';
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[TRUNCATED]';
  if (value === null || value === undefined || typeof value === 'number' || typeof value === 'boolean') return value ?? null;
  if (typeof value === 'string') return value.slice(0, 2000);
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitize(item, depth + 1));
  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 100)) {
      output[key] = sensitiveKey.test(key) ? '[REDACTED]' : sanitize(item, depth + 1);
    }
    return output;
  }
  return String(value).slice(0, 2000);
}

function json(value: unknown): string | null {
  return value === undefined ? null : JSON.stringify(sanitize(value));
}

function primaryRole(principal: Principal | null): string | null {
  return principal?.roles[0] ?? null;
}

export function recordAudit(
  database: PlatformDatabase,
  principal: Principal | null,
  action: string,
  entityType: string,
  entityId: string | null,
  context: AuditContext = {}
): string {
  const id = randomUUID();
  database.prepare(`INSERT INTO audit_events
    (id,actor_user_id,actor_role,action,entity_type,entity_id,before_json,after_json,company_id,ip_address,user_agent,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id,
    principal?.userId ?? null,
    primaryRole(principal),
    action.slice(0, 80),
    entityType.slice(0, 80),
    entityId,
    json(context.before),
    json(context.after),
    context.companyId ?? principal?.companyId ?? null,
    context.ipAddress?.slice(0, 120) ?? 'unknown',
    context.userAgent?.slice(0, 300) ?? 'unknown',
    context.createdAt ?? new Date().toISOString()
  );
  return id;
}

export function auditData(database: PlatformDatabase, principal: Principal, filters: AuditFilters): object {
  const admin = principal.roles.includes('ADMIN');
  const clauses = ['1=1'];
  const parameters: (string | null)[] = [];
  if (!admin) {
    clauses.push('a.actor_user_id=?');
    parameters.push(principal.userId);
  }
  const pairs: readonly [string, string | null | undefined][] = [
    ['a.created_at>=?', filters.from], ['a.created_at<=?', filters.to], ['a.actor_user_id=?', filters.userId],
    ['a.actor_role=?', filters.role], ['a.action=?', filters.action], ['a.entity_type=?', filters.entityType],
    ['a.company_id=?', filters.companyId]
  ];
  for (const [clause, value] of pairs) {
    if (!value) continue;
    clauses.push(clause);
    parameters.push(value);
  }
  const events = database.prepare(`SELECT a.id,a.action,a.entity_type,a.entity_id,a.actor_role,a.company_id,
      a.before_json,a.after_json,a.ip_address,a.user_agent,a.created_at,u.display_name AS actor_name
    FROM audit_events a LEFT JOIN users u ON u.id=a.actor_user_id
    WHERE ${clauses.join(' AND ')} ORDER BY a.created_at DESC LIMIT 500`).all(...parameters);
  return { banner: demoBanner, events, limited: !admin, environment: 'DEMO' };
}

export function createNotification(database: PlatformDatabase, input: NotificationInput): string {
  if (input.dedupeKey) {
    const existing = database.prepare('SELECT id FROM notifications WHERE user_id=? AND dedupe_key=?')
      .get(input.userId, input.dedupeKey);
    if (existing) return String(existing.id);
  }
  const id = randomUUID();
  database.prepare(`INSERT INTO notifications
    (id,user_id,notification_type,title,body,company_id,entity_type,entity_id,dedupe_key,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    id, input.userId, input.type.slice(0, 80), input.title.slice(0, 160), input.body.slice(0, 1000),
    input.companyId ?? null, input.entityType ?? null, input.entityId ?? null, input.dedupeKey ?? null,
    input.createdAt ?? new Date().toISOString()
  );
  return id;
}

export function notifyCompany(
  database: PlatformDatabase,
  companyId: string,
  notification: Omit<NotificationInput, 'userId' | 'companyId'>
): void {
  const users = database.prepare("SELECT id FROM users WHERE company_id=? AND status='ACTIVE'").all(companyId);
  for (const user of users) createNotification(database, { ...notification, userId: String(user.id), companyId });
}

export function notifyInternal(
  database: PlatformDatabase,
  notification: Omit<NotificationInput, 'userId' | 'companyId'>,
  assignedUserId?: string | null
): void {
  const users = assignedUserId
    ? database.prepare("SELECT id FROM users WHERE id=? AND status='ACTIVE'").all(assignedUserId)
    : database.prepare(`SELECT DISTINCT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id
        JOIN roles r ON r.id=ur.role_id WHERE r.code IN ('ADMIN','EMPLOYEE') AND u.status='ACTIVE'`).all();
  for (const user of users) createNotification(database, { ...notification, userId: String(user.id) });
}

export function notificationData(database: PlatformDatabase, principal: Principal): object {
  const notifications = database.prepare(`SELECT id,notification_type,title,body,read_at,company_id,entity_type,entity_id,created_at
    FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100`).all(principal.userId);
  return { notifications, unread: notifications.filter((row) => row.read_at === null).length, environment: 'DEMO' };
}

export function markNotificationRead(database: PlatformDatabase, principal: Principal, notificationId: string): object {
  const notification = database.prepare('SELECT id,user_id,read_at FROM notifications WHERE id=?').get(notificationId);
  if (!notification || String(notification.user_id) !== principal.userId) throw new Error('NOTIFICATION_NOT_FOUND');
  const readAt = notification.read_at ? String(notification.read_at) : new Date().toISOString();
  database.prepare('UPDATE notifications SET read_at=? WHERE id=? AND user_id=?').run(readAt, notificationId, principal.userId);
  return { id: notificationId, readAt };
}

export function markAllNotificationsRead(database: PlatformDatabase, principal: Principal): object {
  const readAt = new Date().toISOString();
  const result = database.prepare('UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL').run(readAt, principal.userId);
  return { updated: Number(result.changes), readAt };
}

export function refreshOperationalNotifications(database: PlatformDatabase): void {
  const lowStock = database.prepare(`SELECT i.id,p.model_name,v.capacity,v.color,
      COALESCE(SUM(m.physical_delta-m.reserved_delta),0) AS available
    FROM inventory_items i JOIN product_variants v ON v.id=i.variant_id JOIN products p ON p.id=v.product_id
    LEFT JOIN inventory_movements m ON m.inventory_item_id=i.id
    GROUP BY i.id HAVING available<=i.low_stock_threshold`).all();
  for (const item of lowStock) notifyInternal(database, {
    type: 'LOW_STOCK', title: 'Estoque DEMO baixo',
    body: `${String(item.model_name)} ${String(item.capacity)} ${String(item.color)}: saldo ${String(item.available)}.`,
    entityType: 'INVENTORY_ITEM', entityId: String(item.id), dedupeKey: `LOW_STOCK:${String(item.id)}`
  });

  const limit = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const reservations = database.prepare(`SELECT r.id,o.company_id,r.expires_at FROM reservations r
    LEFT JOIN orders o ON o.id=r.order_id WHERE r.status='ACTIVE' AND r.expires_at<=?`).all(limit);
  for (const reservation of reservations) {
    const companyId = reservation.company_id ? String(reservation.company_id) : null;
    const notification = {
      type: 'RESERVATION_EXPIRING', title: 'Reserva DEMO perto do vencimento',
      body: `A reserva ${String(reservation.id)} expira em ${String(reservation.expires_at)}.`,
      entityType: 'RESERVATION', entityId: String(reservation.id), dedupeKey: `RESERVATION_EXPIRING:${String(reservation.id)}`
    };
    notifyInternal(database, notification);
    if (companyId) notifyCompany(database, companyId, notification);
  }
}

export function settingsData(database: PlatformDatabase): object {
  const settings = database.prepare(`SELECT setting_key,setting_value,value_type,updated_at FROM settings
    ORDER BY setting_key`).all().filter((row) => settingDefinitions[String(row.setting_key)] !== undefined).map((row) => ({
      ...row,
      label: settingDefinitions[String(row.setting_key)]?.label ?? String(row.setting_key)
    }));
  return { banner: demoBanner, settings, environment: 'DEMO' };
}

export function updateSetting(database: PlatformDatabase, principal: Principal, key: string, rawValue: unknown): SettingUpdateResult {
  const definition = settingDefinitions[key];
  const value = typeof rawValue === 'string' ? rawValue.trim().slice(0, 10_000) : '';
  if (!definition || !value || (definition.validate && !definition.validate(value))) throw new Error('INVALID_SETTING');
  const existing = database.prepare('SELECT setting_value FROM settings WHERE setting_key=?').get(key);
  if (!existing) throw new Error('SETTING_NOT_FOUND');
  const now = new Date().toISOString();
  database.prepare(`UPDATE settings SET setting_value=?,value_type=?,updated_by_user_id=?,updated_at=? WHERE setting_key=?`)
    .run(value, definition.type, principal.userId, now, key);
  return { key, value, valueType: definition.type, previousValue: String(existing.setting_value), updatedAt: now };
}

function grouped(database: PlatformDatabase, sql: string, ...parameters: (string | null)[]): readonly Record<string, unknown>[] {
  return database.prepare(sql).all(...parameters) as Record<string, unknown>[];
}

export function reportsData(database: PlatformDatabase, principal: Principal): object {
  const wholesale = principal.roles.includes('WHOLESALE');
  const companyId = wholesale ? principal.companyId : null;
  const companyClause = wholesale ? ' WHERE company_id=?' : '';
  const companyParameters = wholesale ? [companyId] : [];
  const quoteRows = grouped(database, `SELECT status,COUNT(*) AS count,COALESCE(SUM((SELECT SUM(quantity*unit_price_cents-discount_cents) FROM quote_items WHERE quote_id=quotes.id)),0) AS total_cents FROM quotes${companyClause} GROUP BY status`, ...companyParameters);
  const orderRows = grouped(database, `SELECT status,COUNT(*) AS count,COALESCE(SUM((SELECT SUM(quantity*unit_price_cents) FROM order_items WHERE order_id=orders.id)),0) AS total_cents FROM orders${companyClause} GROUP BY status`, ...companyParameters);
  const requests = wholesale
    ? grouped(database, `SELECT r.status,COUNT(*) AS count FROM requests r JOIN leads l ON l.id=r.lead_id WHERE l.company_id=? GROUP BY r.status`, companyId)
    : grouped(database, 'SELECT status,COUNT(*) AS count FROM requests GROUP BY status');
  const messages = wholesale
    ? grouped(database, `SELECT c.status,COUNT(m.id) AS count FROM conversations c LEFT JOIN messages m ON m.conversation_id=c.id WHERE c.company_id=? GROUP BY c.status`, companyId)
    : grouped(database, 'SELECT c.status,COUNT(m.id) AS count FROM conversations c LEFT JOIN messages m ON m.conversation_id=c.id GROUP BY c.status');
  const shipments = wholesale
    ? grouped(database, 'SELECT s.status,COUNT(*) AS count FROM shipments s JOIN orders o ON o.id=s.order_id WHERE o.company_id=? GROUP BY s.status', companyId)
    : grouped(database, 'SELECT status,COUNT(*) AS count FROM shipments GROUP BY status');
  const converted = quoteRows.reduce((sum, row) => sum + (String(row.status) === 'CONVERTED' ? Number(row.count) : 0), 0);
  const quoteCount = quoteRows.reduce((sum, row) => sum + Number(row.count), 0);
  const internalOnly = wholesale ? {} : {
    companies: grouped(database, 'SELECT approval_status AS status,COUNT(*) AS count FROM companies GROUP BY approval_status'),
    employeeActivity: grouped(database, `SELECT COALESCE(u.display_name,'Sistema') AS employee,COUNT(*) AS count FROM audit_events a
      LEFT JOIN users u ON u.id=a.actor_user_id GROUP BY a.actor_user_id ORDER BY count DESC`),
    inventory: grouped(database, `SELECT CASE WHEN available<=low_stock_threshold THEN 'LOW' ELSE 'OK' END AS status,COUNT(*) AS count FROM (
      SELECT i.low_stock_threshold,COALESCE(SUM(m.physical_delta-m.reserved_delta),0) AS available FROM inventory_items i
      LEFT JOIN inventory_movements m ON m.inventory_item_id=i.id GROUP BY i.id) GROUP BY status`),
    reservations: grouped(database, 'SELECT status,COUNT(*) AS count FROM reservations GROUP BY status'),
    audits: grouped(database, 'SELECT action AS status,COUNT(*) AS count FROM audit_events GROUP BY action ORDER BY count DESC')
  };
  return {
    banner: demoBanner,
    scope: wholesale ? 'COMPANY' : 'INTERNAL',
    companyId,
    conversionRate: quoteCount ? Number(((converted / quoteCount) * 100).toFixed(2)) : 0,
    requests, quotes: quoteRows, orders: orderRows, messages, shipments, ...internalOnly,
    environment: 'DEMO'
  };
}

export function reportsCsv(database: PlatformDatabase, principal: Principal): string {
  const report = reportsData(database, principal) as Record<string, unknown>;
  const rows = [['environment', 'section', 'status', 'count', 'total_cents']];
  for (const [section, value] of Object.entries(report)) {
    if (!Array.isArray(value)) continue;
    for (const item of value as Record<string, unknown>[]) {
      rows.push(['DEMO', section, String(item.status ?? item.employee ?? ''), String(item.count ?? ''), String(item.total_cents ?? '')]);
    }
  }
  return rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n');
}

export const DEMO_REPORT_BANNER = demoBanner;
