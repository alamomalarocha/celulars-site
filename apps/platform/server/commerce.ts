import { randomUUID } from 'node:crypto';
import type { PlatformDatabase } from '../database/db.js';
import { withTransaction } from '../database/db.js';
import type { Principal } from './types.js';

interface QuoteInput {
  readonly companyId?: string | null;
  readonly customerId?: string | null;
  readonly variantId?: string;
  readonly quantity?: number;
  readonly unitPriceCents?: number;
  readonly notes?: string;
}

interface StatusInput { readonly status?: string }
interface ConvertQuoteInput { readonly deliveryMethod?: string; readonly addressDemo?: string; readonly carrierDemo?: string }
interface ReservationInput { readonly orderId?: string; readonly inventoryItemId?: string; readonly quantity?: number; readonly expiresAt?: string }
interface ShipmentInput { readonly orderId?: string; readonly status?: string; readonly method?: string; readonly carrierDemo?: string; readonly trackingDemo?: string; readonly shippingCostCents?: number }

const quoteTransitions: Readonly<Record<string, readonly string[]>> = {
  DRAFT: ['SENT','EXPIRED'], SENT: ['VIEWED','ACCEPTED','REJECTED','EXPIRED'],
  VIEWED: ['ACCEPTED','REJECTED','EXPIRED'], ACCEPTED: ['CONVERTED'], REJECTED: [], EXPIRED: [], CONVERTED: []
};
const orderTransitions: Readonly<Record<string, readonly string[]>> = {
  DRAFT: ['CONFIRMED','CANCELLED'], CONFIRMED: ['READY_FOR_PICKUP','CANCELLED'], RESERVED: ['READY_FOR_PICKUP','CANCELLED'],
  READY_FOR_PICKUP: ['CANCELLED'], SHIPPED: ['RETURNED'], DELIVERED: ['RETURNED'], CANCELLED: [], RETURNED: []
};
const shipmentTransitions: Readonly<Record<string, readonly string[]>> = {
  PENDING: ['READY','CANCELLED'], READY: ['IN_TRANSIT','CANCELLED'], IN_TRANSIT: ['DELIVERED','CANCELLED'], DELIVERED: [], CANCELLED: []
};
const deliveryMethodAliases: Readonly<Record<string, string>> = {
  PICKUP_MIAMI: 'MIAMI_PICKUP', MIAMI_PICKUP: 'MIAMI_PICKUP',
  DOMESTIC_US: 'US_DOMESTIC', US_DOMESTIC: 'US_DOMESTIC',
  BRAZIL_COURIER: 'BRAZIL_CARRIER', BRAZIL_CARRIER: 'BRAZIL_CARRIER',
  WHOLESALE_CARRIER: 'WHOLESALE_CARRIER'
};
const publicDeliveryMethods: Readonly<Record<string, string>> = {
  MIAMI_PICKUP: 'PICKUP_MIAMI', US_DOMESTIC: 'DOMESTIC_US',
  BRAZIL_CARRIER: 'BRAZIL_COURIER', WHOLESALE_CARRIER: 'WHOLESALE_CARRIER'
};

function isWholesale(principal: Principal): boolean { return principal.roles.includes('WHOLESALE'); }

function scopeCompany(principal: Principal): string | null {
  if (!isWholesale(principal)) return null;
  if (!principal.companyId) throw new Error('FORBIDDEN:scope');
  return principal.companyId;
}

function referenceNumber(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 5).toUpperCase()}`;
}

function normalizeDeliveryMethod(value: string | undefined): string {
  return deliveryMethodAliases[value?.trim().toUpperCase() ?? ''] ?? '';
}

interface ReservationRow {
  readonly id: unknown;
  readonly inventory_item_id: unknown;
  readonly order_id: unknown;
  readonly quantity: unknown;
  readonly created_by_user_id: unknown;
}

function recordReservationClosure(
  database: PlatformDatabase,
  reservation: ReservationRow,
  status: 'RELEASED' | 'EXPIRED' | 'CONVERTED',
  movementType: 'RELEASE' | 'SALE' | 'CANCELLATION',
  actorUserId: string,
  now: string,
  notes: string
): void {
  const quantity = Number(reservation.quantity);
  database.prepare("UPDATE reservations SET status=?,updated_at=? WHERE id=? AND status='ACTIVE'")
    .run(status, now, String(reservation.id));
  database.prepare(`INSERT INTO inventory_movements
    (id,inventory_item_id,movement_type,physical_delta,reserved_delta,reference_type,reference_id,notes,actor_user_id,created_at)
    VALUES (?,?,?,?,?,'RESERVATION',?,?,?,?)`).run(
    randomUUID(), String(reservation.inventory_item_id), movementType,
    movementType === 'SALE' ? -quantity : 0, -quantity, String(reservation.id), notes, actorUserId, now);
}

function closeActiveReservations(
  database: PlatformDatabase,
  orderId: string,
  status: 'RELEASED' | 'CONVERTED',
  actorUserId: string,
  now: string,
  cancellation = false
): number {
  const reservations = database.prepare(
    "SELECT id,inventory_item_id,order_id,quantity,created_by_user_id FROM reservations WHERE order_id=? AND status='ACTIVE'"
  ).all(orderId) as unknown as ReservationRow[];
  for (const reservation of reservations) {
    recordReservationClosure(
      database,
      reservation,
      status,
      status === 'CONVERTED' ? 'SALE' : cancellation ? 'CANCELLATION' : 'RELEASE',
      actorUserId,
      now,
      status === 'CONVERTED' ? 'Reserva convertida em venda no ambiente DEMO.' : 'Reserva liberada pelo cancelamento do pedido DEMO.'
    );
  }
  return reservations.length;
}

function expireDueQuotes(database: PlatformDatabase, now: string): number {
  const result = database.prepare(`UPDATE quotes SET status='EXPIRED',updated_at=?
    WHERE status IN ('DRAFT','SENT','VIEWED') AND expires_at<=?`).run(now, now);
  return Number(result.changes);
}

export function expireQuotes(database: PlatformDatabase): number {
  return withTransaction(database, () => expireDueQuotes(database, new Date().toISOString()));
}

function expireDueReservations(database: PlatformDatabase, now: string): number {
  const reservations = database.prepare(`SELECT id,inventory_item_id,order_id,quantity,created_by_user_id
    FROM reservations WHERE status='ACTIVE' AND expires_at<=? ORDER BY expires_at`).all(now) as unknown as ReservationRow[];
  const affectedOrders = new Set<string>();
  for (const reservation of reservations) {
    recordReservationClosure(
      database,
      reservation,
      'EXPIRED',
      'RELEASE',
      String(reservation.created_by_user_id),
      now,
      'Reserva expirada automaticamente no ambiente DEMO.'
    );
    if (reservation.order_id) affectedOrders.add(String(reservation.order_id));
  }
  for (const orderId of affectedOrders) {
    if (!database.prepare("SELECT id FROM reservations WHERE order_id=? AND status='ACTIVE'").get(orderId)) {
      database.prepare("UPDATE orders SET status='CONFIRMED',updated_at=? WHERE id=? AND status='RESERVED'").run(now, orderId);
    }
  }
  return reservations.length;
}

export function expireReservations(database: PlatformDatabase): number {
  return withTransaction(database, () => expireDueReservations(database, new Date().toISOString()));
}

function hasCompleteReservation(database: PlatformDatabase, orderId: string): boolean {
  const incomplete = database.prepare(`WITH ordered AS (
      SELECT variant_id,SUM(quantity) AS quantity FROM order_items WHERE order_id=? GROUP BY variant_id
    ), reserved AS (
      SELECT ii.variant_id,SUM(r.quantity) AS quantity FROM reservations r
      JOIN inventory_items ii ON ii.id=r.inventory_item_id
      WHERE r.order_id=? AND r.status='ACTIVE' GROUP BY ii.variant_id
    )
    SELECT ordered.variant_id FROM ordered LEFT JOIN reserved ON reserved.variant_id=ordered.variant_id
    WHERE COALESCE(reserved.quantity,0)<>ordered.quantity
    LIMIT 1`).get(orderId, orderId);
  return !incomplete;
}

function returnOrderInventory(database: PlatformDatabase, orderId: string, actorUserId: string, now: string): number {
  closeActiveReservations(database, orderId, 'CONVERTED', actorUserId, now);
  const reservations = database.prepare(`SELECT id,inventory_item_id,quantity FROM reservations
    WHERE order_id=? AND status='CONVERTED' ORDER BY created_at`).all(orderId);
  let returned = 0;
  for (const reservation of reservations) {
    const reservationId = String(reservation.id);
    const alreadyReturned = database.prepare(`SELECT id FROM inventory_movements
      WHERE movement_type='RETURN' AND reference_type='ORDER_RETURN' AND reference_id=?`).get(reservationId);
    if (alreadyReturned) continue;
    const quantity = Number(reservation.quantity);
    database.prepare(`INSERT INTO inventory_movements
      (id,inventory_item_id,movement_type,physical_delta,reserved_delta,reference_type,reference_id,notes,actor_user_id,created_at)
      VALUES (?,?,'RETURN',?,0,'ORDER_RETURN',?,'Devolucao do pedido no ambiente DEMO.',?,?)`).run(
      randomUUID(), String(reservation.inventory_item_id), quantity, reservationId, actorUserId, now);
    returned += quantity;
  }
  return returned;
}

function requiredBrazilShippingCost(database: PlatformDatabase, orderId: string): number {
  const rows = database.prepare(`SELECT DISTINCT p.product_type FROM order_items oi
    JOIN product_variants v ON v.id=oi.variant_id JOIN products p ON p.id=v.product_id
    WHERE oi.order_id=?`).all(orderId);
  if (!rows.length) throw new Error('INVALID_SHIPMENT');
  return rows.some((row) => String(row.product_type) === 'NEW') ? 20_000 : 12_500;
}

export function quoteData(database: PlatformDatabase, principal: Principal): object {
  expireQuotes(database);
  const scope = scopeCompany(principal);
  const quotes = database.prepare(`SELECT q.id,q.quote_number,q.company_id,q.customer_id,q.status,q.currency,q.discount_cents,q.notes,
      q.expires_at,q.created_at,q.updated_at,co.name AS company_name,cu.name AS customer_name,u.display_name AS created_by_name,
      COALESCE(SUM(qi.quantity*qi.unit_price_cents-qi.discount_cents),0)-q.discount_cents AS total_cents
    FROM quotes q LEFT JOIN companies co ON co.id=q.company_id LEFT JOIN customers cu ON cu.id=q.customer_id
    LEFT JOIN users u ON u.id=q.created_by_user_id LEFT JOIN quote_items qi ON qi.quote_id=q.id
    WHERE (? IS NULL OR q.company_id=?) GROUP BY q.id ORDER BY q.updated_at DESC LIMIT 150`).all(scope, scope);
  const items = database.prepare(`SELECT qi.id,qi.quote_id,qi.variant_id,qi.quantity,qi.unit_price_cents,qi.discount_cents,qi.notes,
      p.model_name,p.product_type,v.capacity,v.color,v.sku_demo FROM quote_items qi JOIN quotes q ON q.id=qi.quote_id
    JOIN product_variants v ON v.id=qi.variant_id JOIN products p ON p.id=v.product_id
    WHERE (? IS NULL OR q.company_id=?) ORDER BY q.quote_number,p.model_name`).all(scope, scope);
  const variants = database.prepare(`SELECT v.id,p.model_name,p.product_type,v.capacity,v.color,v.sku_demo FROM product_variants v
    JOIN products p ON p.id=v.product_id WHERE v.active=1 AND p.demo_active=1 ORDER BY p.year DESC,p.model_name,v.capacity,v.color LIMIT 500`).all();
  const companies = scope ? [] : database.prepare(`SELECT id,name,approval_status,price_list_id FROM companies
    WHERE company_type='WHOLESALE' ORDER BY name`).all();
  return { quotes, items, variants, companies, scopedCompanyId: scope, readOnlyInternalWorkflow: Boolean(scope), environment: 'DEMO' };
}

export function createQuote(database: PlatformDatabase, principal: Principal, input: QuoteInput): object {
  const scope = scopeCompany(principal);
  const companyId = scope ?? input.companyId?.trim() ?? '';
  const customerId = input.customerId?.trim() || null;
  const variantId = input.variantId?.trim() ?? '';
  const quantity = Number(input.quantity);
  const notes = input.notes?.trim().slice(0, 1000) ?? '';
  if (!companyId || !variantId || !Number.isInteger(quantity) || quantity < 1 || quantity > 500 || notes.length < 3) throw new Error('INVALID_QUOTE');
  return withTransaction(database, () => {
    const company = database.prepare(`SELECT id,approval_status,price_list_id FROM companies WHERE id=? AND company_type='WHOLESALE'`).get(companyId);
    const variant = database.prepare('SELECT id FROM product_variants WHERE id=? AND active=1').get(variantId);
    if (!company || !variant || (scope && String(company.approval_status) !== 'APPROVED')) throw new Error('INVALID_QUOTE');
    if (customerId) {
      const customer = database.prepare('SELECT id,company_id FROM customers WHERE id=? AND deleted_at IS NULL').get(customerId);
      if (!customer || (scope && String(customer.company_id) !== scope)) throw new Error('INVALID_QUOTE');
    }
    const listed = database.prepare(`SELECT amount_cents FROM prices WHERE price_list_id=? AND variant_id=?
      AND valid_until IS NULL ORDER BY valid_from DESC LIMIT 1`).get(String(company.price_list_id), variantId);
    const requestedPrice = Number(input.unitPriceCents);
    const unitPriceCents = scope ? Number(listed?.amount_cents) : (Number.isInteger(requestedPrice) && requestedPrice >= 0 ? requestedPrice : Number(listed?.amount_cents));
    if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0 || unitPriceCents > 100_000_000) throw new Error('INVALID_QUOTE');
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const quoteId = randomUUID();
    const quoteNumber = referenceNumber('DEMO-Q');
    database.prepare(`INSERT INTO quotes
      (id,quote_number,company_id,customer_id,status,currency,discount_cents,notes,created_by_user_id,expires_at,created_at,updated_at)
      VALUES (?,?,?,?,'DRAFT','USD',0,?,?,?,?,?)`).run(quoteId, quoteNumber, companyId, customerId, notes, principal.userId, expiresAt, now, now);
    database.prepare(`INSERT INTO quote_items (id,quote_id,variant_id,quantity,unit_price_cents,discount_cents,notes)
      VALUES (?,?,?,?,?,0,'Item criado no ambiente DEMO.')`).run(randomUUID(), quoteId, variantId, quantity, unitPriceCents);
    return { id: quoteId, quoteNumber, companyId, status: 'DRAFT', quantity, unitPriceCents, actor: principal.userId };
  });
}

export function transitionQuote(database: PlatformDatabase, principal: Principal, quoteId: string, input: StatusInput): object {
  const scope = scopeCompany(principal);
  const status = input.status?.trim().toUpperCase() ?? '';
  return withTransaction(database, () => {
    expireDueQuotes(database, new Date().toISOString());
    const quote = database.prepare('SELECT id,company_id,status FROM quotes WHERE id=?').get(quoteId);
    if (!quote || (scope && String(quote.company_id) !== scope)) throw new Error('QUOTE_NOT_FOUND');
    const fromStatus = String(quote.status);
    if (!(quoteTransitions[fromStatus] ?? []).includes(status)) throw new Error('INVALID_QUOTE_STATUS');
    if (scope && !(['SENT','VIEWED'].includes(fromStatus) && ['ACCEPTED','REJECTED'].includes(status))) throw new Error('FORBIDDEN:quotes.workflow');
    const now = new Date().toISOString();
    database.prepare('UPDATE quotes SET status=?,updated_at=? WHERE id=?').run(status, now, quoteId);
    return { id: quoteId, fromStatus, toStatus: status, actor: principal.userId };
  });
}

export function convertQuoteToOrder(database: PlatformDatabase, principal: Principal, quoteId: string, input: ConvertQuoteInput): object {
  if (isWholesale(principal)) throw new Error('FORBIDDEN:orders.write');
  const deliveryMethod = normalizeDeliveryMethod(input.deliveryMethod);
  const addressDemo = input.addressDemo?.trim().slice(0, 500) ?? '';
  const carrierDemo = input.carrierDemo?.trim().slice(0, 160) ?? '';
  if (!deliveryMethod || addressDemo.length < 3 || carrierDemo.length < 3) throw new Error('INVALID_ORDER');
  return withTransaction(database, () => {
    expireDueQuotes(database, new Date().toISOString());
    const quote = database.prepare("SELECT * FROM quotes WHERE id=? AND status='ACCEPTED'").get(quoteId);
    if (!quote) throw new Error('QUOTE_NOT_FOUND');
    if (database.prepare('SELECT id FROM orders WHERE quote_id=?').get(quoteId)) throw new Error('INVALID_ORDER');
    const items = database.prepare('SELECT variant_id,quantity,unit_price_cents FROM quote_items WHERE quote_id=?').all(quoteId);
    if (!items.length) throw new Error('INVALID_ORDER');
    const now = new Date().toISOString();
    const orderId = randomUUID();
    const orderNumber = referenceNumber('DEMO');
    database.prepare(`INSERT INTO orders
      (id,order_number,quote_id,company_id,customer_id,status,payment_status,currency,delivery_method,address_demo,carrier_demo,notes,assigned_user_id,created_at,updated_at)
      VALUES (?,?,?,?,?,'CONFIRMED','PENDING','USD',?,?,?,'Pedido convertido no ambiente DEMO.',?,?,?)`).run(
      orderId, orderNumber, quoteId, String(quote.company_id), quote.customer_id == null ? null : String(quote.customer_id),
      deliveryMethod, addressDemo, carrierDemo, principal.userId, now, now);
    for (const item of items) database.prepare(`INSERT INTO order_items (id,order_id,variant_id,quantity,unit_price_cents) VALUES (?,?,?,?,?)`)
      .run(randomUUID(), orderId, String(item.variant_id), Number(item.quantity), Number(item.unit_price_cents));
    database.prepare("UPDATE quotes SET status='CONVERTED',updated_at=? WHERE id=?").run(now, quoteId);
    return { id: orderId, orderNumber, quoteId, status: 'CONFIRMED', actor: principal.userId };
  });
}

export function orderData(database: PlatformDatabase, principal: Principal): object {
  expireReservations(database);
  const scope = scopeCompany(principal);
  const orders = database.prepare(`SELECT o.id,o.order_number,o.quote_id,o.company_id,o.customer_id,o.status,o.payment_status,o.currency,
      o.delivery_method,o.address_demo,o.carrier_demo,o.notes,o.created_at,o.updated_at,co.name AS company_name,cu.name AS customer_name,
      COALESCE(SUM(oi.quantity*oi.unit_price_cents),0) AS total_cents FROM orders o LEFT JOIN companies co ON co.id=o.company_id
    LEFT JOIN customers cu ON cu.id=o.customer_id LEFT JOIN order_items oi ON oi.order_id=o.id
    WHERE (? IS NULL OR o.company_id=?) GROUP BY o.id ORDER BY o.updated_at DESC LIMIT 150`).all(scope, scope).map((row) => ({
      ...row,
      delivery_method: publicDeliveryMethods[String(row.delivery_method)] ?? String(row.delivery_method)
    }));
  const items = database.prepare(`SELECT oi.id,oi.order_id,oi.variant_id,oi.quantity,oi.unit_price_cents,p.model_name,p.product_type,v.capacity,v.color,v.sku_demo
    FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN product_variants v ON v.id=oi.variant_id JOIN products p ON p.id=v.product_id
    WHERE (? IS NULL OR o.company_id=?) ORDER BY o.order_number,p.model_name`).all(scope, scope);
  const reservations = database.prepare(`SELECT r.id,r.order_id,r.quote_id,r.inventory_item_id,r.quantity,r.status,r.expires_at,r.created_at,
      p.model_name,v.capacity,v.color FROM reservations r LEFT JOIN orders o ON o.id=r.order_id
    JOIN inventory_items ii ON ii.id=r.inventory_item_id JOIN product_variants v ON v.id=ii.variant_id JOIN products p ON p.id=v.product_id
    WHERE (? IS NULL OR o.company_id=?) ORDER BY r.created_at DESC LIMIT 150`).all(scope, scope);
  const shipments = database.prepare(`SELECT s.id,s.order_id,s.status,s.method,s.carrier_demo,s.tracking_demo,s.shipping_cost_cents,s.updated_at
    FROM shipments s JOIN orders o ON o.id=s.order_id WHERE (? IS NULL OR o.company_id=?) ORDER BY s.updated_at DESC LIMIT 150`).all(scope, scope);
  const inventory = scope ? [] : database.prepare(`SELECT ii.id,ii.variant_id,p.model_name,p.product_type,v.capacity,v.color,
      COALESCE(SUM(im.physical_delta-im.reserved_delta),0) AS available_quantity FROM inventory_items ii
    JOIN product_variants v ON v.id=ii.variant_id JOIN products p ON p.id=v.product_id
    LEFT JOIN inventory_movements im ON im.inventory_item_id=ii.id GROUP BY ii.id HAVING available_quantity>0
    ORDER BY p.year DESC,p.model_name,v.capacity,v.color LIMIT 500`).all();
  return { orders, items, reservations, shipments, inventory, internalWorkflow: !scope, environment: 'DEMO' };
}

export function transitionOrder(database: PlatformDatabase, principal: Principal, orderId: string, input: StatusInput): object {
  if (isWholesale(principal)) throw new Error('FORBIDDEN:orders.write');
  const status = input.status?.trim().toUpperCase() ?? '';
  return withTransaction(database, () => {
    const order = database.prepare('SELECT id,status FROM orders WHERE id=?').get(orderId);
    if (!order) throw new Error('ORDER_NOT_FOUND');
    const fromStatus = String(order.status);
    if (!(orderTransitions[fromStatus] ?? []).includes(status)) throw new Error('INVALID_ORDER_STATUS');
    const now = new Date().toISOString();
    expireDueReservations(database, now);
    if (status === 'READY_FOR_PICKUP' && !hasCompleteReservation(database, orderId)) throw new Error('INCOMPLETE_RESERVATION');
    if (status === 'CANCELLED') {
      closeActiveReservations(database, orderId, 'RELEASED', principal.userId, now, true);
      database.prepare("UPDATE shipments SET status='CANCELLED',updated_at=? WHERE order_id=? AND status IN ('PENDING','READY')")
        .run(now, orderId);
    }
    const returnedQuantity = status === 'RETURNED' ? returnOrderInventory(database, orderId, principal.userId, now) : 0;
    database.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?').run(status, now, orderId);
    return { id: orderId, fromStatus, toStatus: status, returnedQuantity, actor: principal.userId };
  });
}

export function createReservation(database: PlatformDatabase, principal: Principal, input: ReservationInput): object {
  if (isWholesale(principal)) throw new Error('FORBIDDEN:inventory.write');
  const orderId = input.orderId?.trim() ?? '';
  const inventoryItemId = input.inventoryItemId?.trim() ?? '';
  const quantity = Number(input.quantity);
  if (!orderId || !inventoryItemId || !Number.isInteger(quantity) || quantity < 1 || quantity > 500) throw new Error('INVALID_RESERVATION');
  return withTransaction(database, () => {
    expireDueReservations(database, new Date().toISOString());
    const order = database.prepare("SELECT id,status FROM orders WHERE id=? AND status IN ('CONFIRMED','RESERVED')").get(orderId);
    const inventory = database.prepare(`SELECT ii.id,ii.variant_id,COALESCE(SUM(im.physical_delta),0) AS physical,
      COALESCE(SUM(im.reserved_delta),0) AS reserved FROM inventory_items ii LEFT JOIN inventory_movements im ON im.inventory_item_id=ii.id
      WHERE ii.id=? GROUP BY ii.id`).get(inventoryItemId);
    if (!order || !inventory || Number(inventory.physical)-Number(inventory.reserved)<quantity) throw new Error('INSUFFICIENT_INVENTORY');
    const ordered = database.prepare('SELECT COALESCE(SUM(quantity),0) AS quantity FROM order_items WHERE order_id=? AND variant_id=?').get(orderId, String(inventory.variant_id));
    const reserved = database.prepare("SELECT COALESCE(SUM(quantity),0) AS quantity FROM reservations WHERE order_id=? AND inventory_item_id=? AND status='ACTIVE'").get(orderId, inventoryItemId);
    if (Number(reserved?.quantity)+quantity>Number(ordered?.quantity)) throw new Error('INVALID_RESERVATION');
    const now = new Date().toISOString();
    const requestedExpiry = input.expiresAt ? new Date(input.expiresAt) : new Date(Date.now()+60*60*1000);
    if (Number.isNaN(requestedExpiry.getTime()) || requestedExpiry.getTime()<=Date.now()) throw new Error('INVALID_RESERVATION');
    const id = randomUUID();
    database.prepare(`INSERT INTO reservations
      (id,inventory_item_id,order_id,quote_id,quantity,status,expires_at,created_by_user_id,created_at,updated_at)
      VALUES (?,?,?,NULL,?,'ACTIVE',?,?,?,?)`).run(id, inventoryItemId, orderId, quantity, requestedExpiry.toISOString(), principal.userId, now, now);
    database.prepare(`INSERT INTO inventory_movements
      (id,inventory_item_id,movement_type,physical_delta,reserved_delta,reference_type,reference_id,notes,actor_user_id,created_at)
      VALUES (?,?,'RESERVATION',0,?,'ORDER',?,'Reserva vinculada ao pedido DEMO.',?,?)`).run(randomUUID(), inventoryItemId, quantity, orderId, principal.userId, now);
    const complete = hasCompleteReservation(database, orderId);
    database.prepare("UPDATE orders SET status=?,updated_at=? WHERE id=?").run(complete ? 'RESERVED' : 'CONFIRMED', now, orderId);
    return { id, orderId, inventoryItemId, quantity, status: 'ACTIVE', orderStatus: complete ? 'RESERVED' : 'CONFIRMED', expiresAt: requestedExpiry.toISOString(), actor: principal.userId };
  });
}

export function releaseReservation(database: PlatformDatabase, principal: Principal, reservationId: string): object {
  if (isWholesale(principal)) throw new Error('FORBIDDEN:inventory.write');
  return withTransaction(database, () => {
    const now = new Date().toISOString();
    expireDueReservations(database, now);
    const reservation = database.prepare("SELECT * FROM reservations WHERE id=? AND status='ACTIVE'").get(reservationId);
    if (!reservation) throw new Error('RESERVATION_NOT_FOUND');
    recordReservationClosure(database, reservation as unknown as ReservationRow, 'RELEASED', 'RELEASE', principal.userId, now, 'Liberacao de reserva DEMO.');
    if (reservation.order_id && !database.prepare("SELECT id FROM reservations WHERE order_id=? AND status='ACTIVE'").get(reservation.order_id)) {
      database.prepare("UPDATE orders SET status='CONFIRMED',updated_at=? WHERE id=? AND status='RESERVED'").run(now, reservation.order_id);
    }
    return { id: reservationId, orderId: reservation.order_id, status: 'RELEASED', actor: principal.userId };
  });
}

export function updateShipment(database: PlatformDatabase, principal: Principal, input: ShipmentInput): object {
  if (isWholesale(principal)) throw new Error('FORBIDDEN:orders.write');
  const orderId = input.orderId?.trim() ?? '';
  const status = input.status?.trim().toUpperCase() ?? '';
  const method = normalizeDeliveryMethod(input.method);
  const carrierDemo = input.carrierDemo?.trim().slice(0, 160) ?? '';
  const trackingDemo = input.trackingDemo?.trim().slice(0, 160) ?? '';
  const requestedShippingCostCents = Number(input.shippingCostCents);
  if (!orderId || !status || !method || carrierDemo.length<3 || trackingDemo.length<3 || !Number.isInteger(requestedShippingCostCents) || requestedShippingCostCents<0) {
    throw new Error('INVALID_SHIPMENT');
  }
  return withTransaction(database, () => {
    const order = database.prepare('SELECT id,status FROM orders WHERE id=?').get(orderId);
    if (!order) throw new Error('ORDER_NOT_FOUND');
    const current = database.prepare('SELECT id,status FROM shipments WHERE order_id=?').get(orderId);
    const now = new Date().toISOString();
    const shippingCostCents = method === 'BRAZIL_CARRIER' ? requiredBrazilShippingCost(database, orderId) : requestedShippingCostCents;
    if (current) {
      if (!(shipmentTransitions[String(current.status)] ?? []).includes(status)) throw new Error('INVALID_SHIPMENT_STATUS');
      database.prepare(`UPDATE shipments SET status=?,method=?,carrier_demo=?,tracking_demo=?,shipping_cost_cents=?,updated_at=? WHERE id=?`)
        .run(status, method, carrierDemo, trackingDemo, shippingCostCents, now, String(current.id));
    } else {
      if (status !== 'PENDING') throw new Error('INVALID_SHIPMENT_STATUS');
      if (String(order.status) !== 'READY_FOR_PICKUP' || !hasCompleteReservation(database, orderId)) throw new Error('INVALID_SHIPMENT_STATUS');
      database.prepare(`INSERT INTO shipments (id,order_id,status,method,carrier_demo,tracking_demo,shipping_cost_cents,created_at,updated_at)
        VALUES (?,?,'PENDING',?,?,?,?,?,?)`).run(randomUUID(), orderId, method, carrierDemo, trackingDemo, shippingCostCents, now, now);
    }
    if (status==='IN_TRANSIT') database.prepare("UPDATE orders SET status='SHIPPED',updated_at=? WHERE id=? AND status='READY_FOR_PICKUP'").run(now, orderId);
    if (status==='DELIVERED') {
      if (String(order.status) !== 'SHIPPED') throw new Error('INVALID_SHIPMENT_STATUS');
      closeActiveReservations(database, orderId, 'CONVERTED', principal.userId, now);
      database.prepare("UPDATE orders SET status='DELIVERED',updated_at=? WHERE id=? AND status='SHIPPED'").run(now, orderId);
    }
    return { orderId, status, method: publicDeliveryMethods[method], carrierDemo, trackingDemo, shippingCostCents, actor: principal.userId };
  });
}
