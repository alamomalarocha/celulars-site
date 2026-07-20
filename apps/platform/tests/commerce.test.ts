import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import test from 'node:test';
import { openDatabase, type PlatformDatabase } from '../database/db.js';
import { migrateDatabase } from '../database/migrate.js';
import { seedDatabase } from '../database/seed.js';
import { createPlatformApplication } from '../server/app.js';
import { AuthService } from '../server/auth.js';
import {
  convertQuoteToOrder,
  createQuote,
  createReservation,
  expireReservations,
  orderData,
  quoteData,
  releaseReservation,
  transitionOrder,
  transitionQuote,
  updateShipment
} from '../server/commerce.js';
import type { Principal } from '../server/types.js';
import { loadConfig, type PlatformConfig } from '../src/config.js';

const password = 'Local-Demo-Commerce-Test!';

function removeDatabase(filePath: string): void {
  for (const candidate of [filePath, `${filePath}-wal`, `${filePath}-shm`]) {
    if (existsSync(candidate)) rmSync(candidate);
  }
}

function fixture(name: string): {
  readonly database: PlatformDatabase;
  readonly config: PlatformConfig;
  readonly admin: Principal;
  readonly wholesale1: Principal;
  readonly wholesale2: Principal;
  readonly close: () => void;
} {
  const base = loadConfig();
  const databasePath = path.join(base.platformRoot, 'data', `${name}-${process.pid}.sqlite`);
  const config = loadConfig({ databasePath, allowedOrigin: 'http://platform.demo.test', sessionSecret: `${name}-secret-that-is-long-enough` });
  removeDatabase(databasePath);
  const database = openDatabase(config);
  migrateDatabase(database);
  seedDatabase(database, config, password);
  const auth = new AuthService(database, config);
  const context = { ipAddress: '127.0.0.1', userAgent: 'test' };
  return {
    database,
    config,
    admin: auth.login('admin@demo.invalid', password, context).principal,
    wholesale1: auth.login('atacadista1@demo.invalid', password, context).principal,
    wholesale2: auth.login('atacadista2@demo.invalid', password, context).principal,
    close: () => {
      database.close();
      removeDatabase(databasePath);
    }
  };
}

function acceptedOrder(
  database: PlatformDatabase,
  admin: Principal,
  wholesale: Principal,
  variantId: string,
  quantity: number,
  deliveryMethod = 'PICKUP_MIAMI'
): { readonly quoteId: string; readonly orderId: string } {
  const quote = createQuote(database, wholesale, {
    variantId,
    quantity,
    notes: `Cotacao ficticia ${variantId} para validar o fluxo comercial DEMO.`
  }) as { id: string };
  transitionQuote(database, admin, quote.id, { status: 'SENT' });
  transitionQuote(database, wholesale, quote.id, { status: 'ACCEPTED' });
  const order = convertQuoteToOrder(database, admin, quote.id, {
    deliveryMethod,
    addressDemo: 'Endereco ficticio Miami DEMO',
    carrierDemo: 'Equipe logistica DEMO'
  }) as { id: string };
  return { quoteId: quote.id, orderId: order.id };
}

function balance(database: PlatformDatabase, inventoryItemId: string): { physical: number; reserved: number } {
  const row = database.prepare(`SELECT COALESCE(SUM(physical_delta),0) AS physical,COALESCE(SUM(reserved_delta),0) AS reserved
    FROM inventory_movements WHERE inventory_item_id=?`).get(inventoryItemId);
  return { physical: Number(row?.physical), reserved: Number(row?.reserved) };
}

test('quote workflow expires, scopes and converts exactly once', () => {
  const setup = fixture('commerce-quotes-test');
  const { database, admin, wholesale1, wholesale2 } = setup;
  try {
    const listed = database.prepare(`SELECT amount_cents FROM prices
      WHERE price_list_id='price-list-demo-premium' AND variant_id='variant-demo-0001' AND valid_until IS NULL`).get();
    assert.ok(listed);
    const created = createQuote(database, wholesale1, {
      variantId: 'variant-demo-0001', quantity: 2, unitPriceCents: 1,
      notes: 'Cotacao ficticia para validar o fluxo comercial.'
    }) as { id: string; companyId: string; unitPriceCents: number; status: string };
    assert.equal(created.companyId, 'company-demo-1');
    assert.equal(created.unitPriceCents, Number(listed.amount_cents));
    assert.equal(created.status, 'DRAFT');

    const ownQuotes = quoteData(database, wholesale1) as { quotes: readonly { id: string; company_id: string }[] };
    const otherQuotes = quoteData(database, wholesale2) as { quotes: readonly { id: string }[] };
    assert.ok(ownQuotes.quotes.some((row) => row.id === created.id && row.company_id === 'company-demo-1'));
    assert.ok(!otherQuotes.quotes.some((row) => row.id === created.id));
    assert.throws(() => transitionQuote(database, wholesale1, created.id, { status: 'SENT' }), /FORBIDDEN/);
    assert.throws(() => transitionQuote(database, admin, created.id, { status: 'ACCEPTED' }), /INVALID_QUOTE_STATUS/);
    transitionQuote(database, admin, created.id, { status: 'SENT' });
    transitionQuote(database, wholesale1, created.id, { status: 'ACCEPTED' });
    assert.throws(() => convertQuoteToOrder(database, wholesale1, created.id, {
      deliveryMethod: 'PICKUP_MIAMI', addressDemo: 'Miami DEMO', carrierDemo: 'Equipe DEMO'
    }), /FORBIDDEN/);

    const converted = convertQuoteToOrder(database, admin, created.id, {
      deliveryMethod: 'PICKUP_MIAMI', addressDemo: 'Miami DEMO', carrierDemo: 'Equipe DEMO'
    }) as { id: string; status: string };
    assert.equal(converted.status, 'CONFIRMED');
    assert.throws(() => convertQuoteToOrder(database, admin, created.id, {
      deliveryMethod: 'PICKUP_MIAMI', addressDemo: 'Miami DEMO', carrierDemo: 'Equipe DEMO'
    }), /QUOTE_NOT_FOUND/);

    const ownOrders = orderData(database, wholesale1) as { orders: readonly { id: string }[] };
    const otherOrders = orderData(database, wholesale2) as { orders: readonly { id: string }[] };
    assert.ok(ownOrders.orders.some((row) => row.id === converted.id));
    assert.ok(!otherOrders.orders.some((row) => row.id === converted.id));

    const expiring = createQuote(database, wholesale1, {
      variantId: 'variant-demo-0001', quantity: 1, notes: 'Cotacao ficticia que deve expirar automaticamente.'
    }) as { id: string };
    database.prepare("UPDATE quotes SET expires_at='2020-01-01T00:00:00.000Z' WHERE id=?").run(expiring.id);
    quoteData(database, admin);
    assert.equal(String(database.prepare('SELECT status FROM quotes WHERE id=?').get(expiring.id)?.status), 'EXPIRED');
  } finally {
    setup.close();
  }
});

test('rejected quotes remain terminal and invalid transitions are rejected', () => {
  const setup = fixture('commerce-quote-negative-test');
  const { database, admin, wholesale1 } = setup;
  try {
    const quote = createQuote(database, wholesale1, {
      variantId: 'variant-demo-0001', quantity: 1,
      notes: 'Cotacao ficticia criada para validar rejeicao terminal.'
    }) as { id: string };
    assert.throws(() => transitionQuote(database, admin, quote.id, { status: 'VIEWED' }), /INVALID_QUOTE_STATUS/);
    transitionQuote(database, admin, quote.id, { status: 'SENT' });
    transitionQuote(database, wholesale1, quote.id, { status: 'REJECTED' });
    assert.throws(() => transitionQuote(database, wholesale1, quote.id, { status: 'ACCEPTED' }), /INVALID_QUOTE_STATUS/);
    assert.throws(() => convertQuoteToOrder(database, admin, quote.id, {
      deliveryMethod: 'PICKUP_MIAMI', addressDemo: 'Miami DEMO', carrierDemo: 'Equipe DEMO'
    }), /QUOTE_NOT_FOUND/);
  } finally {
    setup.close();
  }
});

test('reservations remain partial, cancel atomically and expire safely', () => {
  const setup = fixture('commerce-reservations-test');
  const { database, admin, wholesale1 } = setup;
  try {
    const original = balance(database, 'inventory-demo-0001');
    const flow = acceptedOrder(database, admin, wholesale1, 'variant-demo-0001', 2);
    const partial = createReservation(database, admin, {
      orderId: flow.orderId, inventoryItemId: 'inventory-demo-0001', quantity: 1
    }) as { id: string; orderStatus: string };
    assert.equal(partial.orderStatus, 'CONFIRMED');
    assert.throws(() => transitionOrder(database, admin, flow.orderId, { status: 'READY_FOR_PICKUP' }), /INCOMPLETE_RESERVATION/);
    assert.equal((releaseReservation(database, admin, partial.id) as { status: string }).status, 'RELEASED');

    createReservation(database, admin, { orderId: flow.orderId, inventoryItemId: 'inventory-demo-0001', quantity: 1 });
    const completed = createReservation(database, admin, {
      orderId: flow.orderId, inventoryItemId: 'inventory-demo-0001', quantity: 1
    }) as { orderStatus: string };
    assert.equal(completed.orderStatus, 'RESERVED');
    assert.equal(balance(database, 'inventory-demo-0001').reserved, 2);
    transitionOrder(database, admin, flow.orderId, { status: 'CANCELLED' });
    assert.equal(balance(database, 'inventory-demo-0001').reserved, 0);
    assert.equal(balance(database, 'inventory-demo-0001').physical, original.physical);
    assert.equal(Number(database.prepare(`SELECT COALESCE(SUM(reserved_delta),0) AS quantity FROM inventory_movements
      WHERE inventory_item_id='inventory-demo-0001' AND movement_type='CANCELLATION'`).get()?.quantity), -2);

    const expiring = acceptedOrder(database, admin, wholesale1, 'variant-demo-0001', 1);
    const reservation = createReservation(database, admin, {
      orderId: expiring.orderId, inventoryItemId: 'inventory-demo-0001', quantity: 1
    }) as { id: string };
    database.prepare("UPDATE reservations SET expires_at='2020-01-01T00:00:00.000Z' WHERE id=?").run(reservation.id);
    assert.equal(expireReservations(database), 1);
    assert.equal(String(database.prepare('SELECT status FROM reservations WHERE id=?').get(reservation.id)?.status), 'EXPIRED');
    assert.equal(String(database.prepare('SELECT status FROM orders WHERE id=?').get(expiring.orderId)?.status), 'CONFIRMED');
    assert.equal(balance(database, 'inventory-demo-0001').reserved, 0);
  } finally {
    setup.close();
  }
});

test('competing reservations cannot oversell the final available balance', () => {
  const setup = fixture('commerce-reservation-competition-test');
  const { database, admin, wholesale1 } = setup;
  try {
    const current = balance(database, 'inventory-demo-0001');
    const available = current.physical - current.reserved;
    assert.ok(available > 1);
    const first = acceptedOrder(database, admin, wholesale1, 'variant-demo-0001', available);
    const second = acceptedOrder(database, admin, wholesale1, 'variant-demo-0001', 1);
    const reservation = createReservation(database, admin, {
      orderId: first.orderId, inventoryItemId: 'inventory-demo-0001', quantity: available
    }) as { id: string };
    assert.throws(() => createReservation(database, admin, {
      orderId: second.orderId, inventoryItemId: 'inventory-demo-0001', quantity: 1
    }), /INSUFFICIENT_INVENTORY/);
    releaseReservation(database, admin, reservation.id);
    assert.throws(() => releaseReservation(database, admin, reservation.id), /RESERVATION_NOT_FOUND/);
    const recovered = createReservation(database, admin, {
      orderId: second.orderId, inventoryItemId: 'inventory-demo-0001', quantity: 1
    }) as { status: string };
    assert.equal(recovered.status, 'ACTIVE');
    assert.ok(balance(database, 'inventory-demo-0001').reserved <= balance(database, 'inventory-demo-0001').physical);
  } finally {
    setup.close();
  }
});

test('shipment applies Brazil rules, converts stock and returns it to the ledger', () => {
  const setup = fixture('commerce-logistics-test');
  const { database, admin, wholesale1 } = setup;
  try {
    const original = balance(database, 'inventory-demo-0001');
    const flow = acceptedOrder(database, admin, wholesale1, 'variant-demo-0001', 2, 'BRAZIL_COURIER');
    createReservation(database, admin, { orderId: flow.orderId, inventoryItemId: 'inventory-demo-0001', quantity: 2 });
    transitionOrder(database, admin, flow.orderId, { status: 'READY_FOR_PICKUP' });
    const shipment = {
      orderId: flow.orderId,
      method: 'BRAZIL_COURIER',
      carrierDemo: 'Transportadora Brasil DEMO',
      trackingDemo: 'DEMO-NOT-SHIPPED',
      shippingCostCents: 0
    };
    const pending = updateShipment(database, admin, { ...shipment, status: 'PENDING' }) as { shippingCostCents: number; method: string };
    assert.equal(pending.shippingCostCents, 20_000);
    assert.equal(pending.method, 'BRAZIL_COURIER');
    updateShipment(database, admin, { ...shipment, status: 'READY' });
    updateShipment(database, admin, { ...shipment, status: 'IN_TRANSIT' });
    assert.equal(String(database.prepare('SELECT status FROM orders WHERE id=?').get(flow.orderId)?.status), 'SHIPPED');
    updateShipment(database, admin, { ...shipment, status: 'DELIVERED' });
    assert.equal(String(database.prepare('SELECT status FROM orders WHERE id=?').get(flow.orderId)?.status), 'DELIVERED');
    assert.deepEqual(balance(database, 'inventory-demo-0001'), { physical: original.physical - 2, reserved: 0 });
    const returned = transitionOrder(database, admin, flow.orderId, { status: 'RETURNED' }) as { returnedQuantity: number };
    assert.equal(returned.returnedQuantity, 2);
    assert.deepEqual(balance(database, 'inventory-demo-0001'), original);
    assert.throws(() => transitionOrder(database, admin, flow.orderId, { status: 'RETURNED' }), /INVALID_ORDER_STATUS/);

    const cpoVariant = database.prepare(`SELECT v.id FROM product_variants v JOIN products p ON p.id=v.product_id
      WHERE p.product_type='CPO' ORDER BY v.id LIMIT 1`).get();
    assert.ok(cpoVariant);
    database.prepare(`INSERT INTO inventory_items (id,variant_id,low_stock_threshold,created_at,updated_at)
      VALUES ('inventory-cpo-test',?,1,datetime('now'),datetime('now'))`).run(String(cpoVariant.id));
    database.prepare(`INSERT INTO inventory_movements
      (id,inventory_item_id,movement_type,physical_delta,reserved_delta,reference_type,reference_id,notes,actor_user_id,created_at)
      VALUES ('movement-cpo-test','inventory-cpo-test','RECEIPT',1,0,'TEST','TEST','Entrada CPO DEMO','user-demo-admin',datetime('now'))`).run();
    const cpoFlow = acceptedOrder(database, admin, wholesale1, String(cpoVariant.id), 1, 'BRAZIL_COURIER');
    createReservation(database, admin, { orderId: cpoFlow.orderId, inventoryItemId: 'inventory-cpo-test', quantity: 1 });
    transitionOrder(database, admin, cpoFlow.orderId, { status: 'READY_FOR_PICKUP' });
    const cpoShipment = updateShipment(database, admin, {
      orderId: cpoFlow.orderId, status: 'PENDING', method: 'BRAZIL_COURIER', carrierDemo: 'Transportadora CPO DEMO',
      trackingDemo: 'CPO-DEMO-NOT-SHIPPED', shippingCostCents: 0
    }) as { shippingCostCents: number };
    assert.equal(cpoShipment.shippingCostCents, 12_500);
  } finally {
    setup.close();
  }
});

test('invalid shipment transitions and shipping a cancelled order are blocked', () => {
  const setup = fixture('commerce-shipment-negative-test');
  const { database, admin, wholesale1 } = setup;
  try {
    const flow = acceptedOrder(database, admin, wholesale1, 'variant-demo-0001', 1, 'DOMESTIC_US');
    createReservation(database, admin, { orderId: flow.orderId, inventoryItemId: 'inventory-demo-0001', quantity: 1 });
    transitionOrder(database, admin, flow.orderId, { status: 'READY_FOR_PICKUP' });
    const shipment = {
      orderId: flow.orderId, method: 'DOMESTIC_US', carrierDemo: 'Transportadora EUA DEMO',
      trackingDemo: 'TRACKING-DEMO-INVALID', shippingCostCents: 1_500
    };
    assert.throws(() => updateShipment(database, admin, { ...shipment, status: 'DELIVERED' }), /INVALID_SHIPMENT_STATUS/);
    updateShipment(database, admin, { ...shipment, status: 'PENDING' });
    assert.throws(() => updateShipment(database, admin, { ...shipment, status: 'DELIVERED' }), /INVALID_SHIPMENT_STATUS/);
    transitionOrder(database, admin, flow.orderId, { status: 'CANCELLED' });
    assert.throws(() => updateShipment(database, admin, { ...shipment, status: 'READY' }), /INVALID_SHIPMENT_STATUS/);
  } finally {
    setup.close();
  }
});

test('HTTP commercial transitions queue simulated email without external sending', async () => {
  const setup=fixture('commerce-email-outbox-test');const {database,config,wholesale1}=setup;const application=createPlatformApplication(database,config);await new Promise<void>(resolve=>application.server.listen(0,'127.0.0.1',resolve));const address=application.server.address() as AddressInfo;const baseUrl=`http://127.0.0.1:${address.port}`;
  try{const login=await fetch(`${baseUrl}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json',Origin:config.allowedOrigin},body:JSON.stringify({email:'admin@demo.invalid',password})});const cookie=(login.headers.get('set-cookie')??'').split(';')[0]??'';const payload=await login.json() as {user:{csrfToken:string}};const quote=createQuote(database,wholesale1,{variantId:'variant-demo-0001',quantity:1,notes:'Cotação DEMO para validar a outbox HTTP.'}) as {id:string};const response=await fetch(`${baseUrl}/api/quotes/${encodeURIComponent(quote.id)}/status`,{method:'POST',headers:{Cookie:cookie,Origin:config.allowedOrigin,'X-CSRF-Token':payload.user.csrfToken,'Content-Type':'application/json'},body:JSON.stringify({status:'SENT'})});assert.equal(response.status,200);const delivery=database.prepare("SELECT status,template_code,recipient FROM delivery_outbox WHERE correlation_id=?").get(`QUOTE:${quote.id}:SENT`);assert.equal(String(delivery?.status),'PENDING');assert.equal(String(delivery?.template_code),'QUOTE');assert.match(String(delivery?.recipient),/@/);assert.equal(Number(database.prepare("SELECT COUNT(*) total FROM delivery_outbox WHERE provider_message_id IS NOT NULL").get()?.total),0);}
  finally{await new Promise<void>((resolve,reject)=>application.server.close(error=>error?reject(error):resolve()));setup.close();}
});
test('HTTP maps incomplete reservations to a stable conflict code', async () => {
  const setup = fixture('commerce-http-test');
  const { database, config } = setup;
  const application = createPlatformApplication(database, config);
  await new Promise<void>((resolve) => application.server.listen(0, '127.0.0.1', resolve));
  const address = application.server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: config.allowedOrigin },
      body: JSON.stringify({ email: 'admin@demo.invalid', password })
    });
    assert.equal(login.status, 200);
    const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
    const payload = await login.json() as { user: { csrfToken: string } };
    const response = await fetch(`${baseUrl}/api/orders/order-demo-0003/status`, {
      method: 'POST',
      headers: { Cookie: cookie, Origin: config.allowedOrigin, 'X-CSRF-Token': payload.user.csrfToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'READY_FOR_PICKUP' })
    });
    assert.equal(response.status, 409);
    assert.equal((await response.json() as { code: string }).code, 'INCOMPLETE_RESERVATION');
    const auditCount = Number(database.prepare("SELECT COUNT(*) AS count FROM audit_events WHERE action='LOGIN'").get()?.count);
    assert.ok(auditCount >= 1);
  } finally {
    await new Promise<void>((resolve, reject) => application.server.close((error) => error ? reject(error) : resolve()));
    setup.close();
  }
});
