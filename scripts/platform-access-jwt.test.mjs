import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { pbkdf2Sync, scryptSync } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const wranglerEntry = require.resolve('wrangler');
const outdir = mkdtempSync(join(tmpdir(), 'celulars-jwt-test-'));
const bundle = spawnSync(process.execPath, [wranglerEntry, 'deploy', '--dry-run', '--outdir', outdir], { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8' });
if (bundle.status !== 0) throw new Error(bundle.stderr || 'WORKER_BUNDLE_FAILED');
globalThis.Cloudflare = { compatibilityFlags: { enable_nodejs_process_v2: false } };
const { api, verifyAccess, verifyPassword } = await import(`${pathToFileURL(join(outdir, 'index.js')).href}?test=${Date.now()}`);
const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['sign','verify']);
const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey); jwk.kid = 'jwt-test-key';
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200, headers: { 'content-type': 'application/json' } });
const env = { ACCESS_TEAM_DOMAIN: 'black-hall-e4fd.cloudflareaccess.com', ACCESS_AUDIENCE: 'aud-celulars-demo', ACCESS_ALLOWED_EMAIL: 'alamomalarocha@gmail.com' };
const encode = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
async function token(overrides = {}, key = pair.privateKey) { const header=encode({alg:'RS256',kid:'jwt-test-key'}); const claims=encode({iss:'https://black-hall-e4fd.cloudflareaccess.com',aud:['aud-celulars-demo'],email:'alamomalarocha@gmail.com',exp:Math.floor(Date.now()/1000)+300,...overrides}); const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(`${header}.${claims}`)); return `${header}.${claims}.${Buffer.from(signature).toString('base64url')}`; }
const request = value => new Request('https://demo.celulars.com.br/', { headers: value ? { 'Cf-Access-Jwt-Assertion': value } : {} });
const passwordFixture = 'Fixture-Password-Only!';
const saltFixture = 'YWJjZGVmZ2hpamtsbW5vcA';
const legacyHashFixture = pbkdf2Sync(passwordFixture, saltFixture, 210_000, 32, 'sha256').toString('hex');
const scryptDerivedFixture = scryptSync(passwordFixture, saltFixture, 32, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const hashFixture = 'scrypt$v1$N=16384,r=8,p=1,l=32$' + saltFixture + '$' + scryptDerivedFixture.toString('hex');
test('uses the project Wrangler without depending on a Codex npx cache', () => {
  assert.equal(wranglerEntry.includes('codex-wrangler-npm'), false);
  assert.equal(wranglerEntry.includes(join('node_modules', 'wrangler')), true);
});
test('verifies versioned scrypt v1', async () => assert.equal(await verifyPassword(passwordFixture, saltFixture, hashFixture), true));
test('retains legacy PBKDF2 verification for rollback only', async () => assert.equal(await verifyPassword(passwordFixture, saltFixture, legacyHashFixture), true));
test('rejects an incorrect scrypt password', async () => assert.equal(await verifyPassword('wrong-password', saltFixture, hashFixture), false));
test('rejects malformed and unsupported password records', async () => {
  assert.equal(await verifyPassword(passwordFixture, 'bad salt!', hashFixture), false);
  assert.equal(await verifyPassword(passwordFixture, saltFixture, '00'), false);
  assert.equal(await verifyPassword(passwordFixture, saltFixture, 'argon2$' + saltFixture + '$' + '00'.repeat(32)), false);
  assert.equal(await verifyPassword(passwordFixture, saltFixture, 'scrypt=16384,r=8,p=1,l=32$' + saltFixture + '$' + '00'.repeat(32)), false);
  assert.equal(await verifyPassword(passwordFixture, saltFixture, 'scrypt=1048576,r=8,p=1,l=32$' + saltFixture + '$' + '00'.repeat(32)), false);
  assert.equal(await verifyPassword(passwordFixture, 'bad salt!', hashFixture), false);
  assert.equal(await verifyPassword(passwordFixture, saltFixture, legacyHashFixture, 0), false);
  assert.equal(await verifyPassword(passwordFixture, saltFixture, legacyHashFixture, -1), false);
  assert.equal(await verifyPassword(passwordFixture, saltFixture, legacyHashFixture, 1_000_001), false);
});

class LoginD1Statement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.values = []; }
  bind(...values) { this.values = values; return this; }
  async first() {
    if (this.sql.startsWith('SELECT id,name FROM d1_migrations')) return this.db.migration ?? null;
    if (this.sql.includes('FROM sessions s JOIN users')) return this.db.principal ?? null;
    if (this.sql.startsWith('SELECT u.id FROM users u JOIN user_roles')) return this.db.validEmployee === this.values[0] ? { id: this.values[0] } : null;
    if (this.sql.includes('FROM users u JOIN user_roles')) return this.values[0] === 'admin@demo.invalid' ? this.db.user : null;
    if (this.sql.startsWith('SELECT id FROM notifications')) return this.db.notification?.id === this.values[0] && this.db.principal?.id === this.values[1] ? { id: this.db.notification.id } : null;
    if (this.sql.startsWith('SELECT setting_value FROM settings')) return this.db.setting?.key === this.values[0] ? { setting_value: this.db.setting.value } : null;
    if (this.sql.startsWith('SELECT name,email,country')) return this.db.customer?.id === this.values[0] ? this.db.customer : null;
    if (this.sql.startsWith('SELECT id FROM customers WHERE email=? AND id<>?')) return this.db.duplicateCustomer ? { id: this.db.duplicateCustomer } : null;
    if (this.sql.startsWith('SELECT id FROM customers WHERE email=?')) return this.db.duplicateCustomer ? { id: this.db.duplicateCustomer } : null;
    if (this.sql.startsWith('SELECT id,company_id FROM customers')) return this.db.requestCustomer?.id === this.values[0] ? this.db.requestCustomer : null;
    if (this.sql.startsWith('SELECT id,company_id FROM conversations')) return this.db.conversation?.id === this.values[0] ? this.db.conversation : null;
    if (this.sql.startsWith('SELECT id,lead_id,status,assigned_user_id FROM requests')) return this.db.requestRecord?.id === this.values[0] ? this.db.requestRecord : null;
    if (this.sql.startsWith('SELECT * FROM inbox_cases')) return this.db.inboxCase;
    if (this.sql.startsWith("SELECT id FROM users WHERE id=? AND status='ACTIVE'")) return this.db.validInboxUser === this.values[0] ? { id: this.values[0] } : null;
    if (this.sql.startsWith("SELECT id,company_id,status FROM orders WHERE id=? AND status IN ('DELIVERED','RETURNED')")) return this.db.returnOrder?.id === this.values[0] ? this.db.returnOrder : null;
    if (this.sql.startsWith('SELECT oi.id,oi.quantity,ii.id inventory_item_id')) return this.db.returnOrderItem?.id === this.values[0] ? this.db.returnOrderItem : null;
    if (this.sql.startsWith('SELECT COALESCE(SUM(ri.quantity),0) quantity FROM return_items')) return { quantity: this.db.priorReturnQuantity };
    if (this.sql.startsWith('SELECT * FROM return_requests')) return this.db.returnRecord?.id === this.values[0] ? this.db.returnRecord : null;
    if (this.sql.startsWith('SELECT COALESCE(SUM(physical_delta),0) physical')) return this.db.inventoryBalance;
    if (this.sql.startsWith("SELECT id,status FROM orders WHERE id=? AND status IN")) return this.db.orderRecord && this.db.orderRecord.id === this.values[0] && ['CONFIRMED','RESERVED'].includes(this.db.orderRecord.status) ? this.db.orderRecord : null;
    if (this.sql.startsWith('SELECT id,status FROM orders WHERE id=?')) return this.db.orderRecord?.id === this.values[0] ? this.db.orderRecord : null;
    if (this.sql.startsWith('WITH ordered AS')) return this.db.incompleteReservation;
    if (this.sql.startsWith('SELECT ii.id,ii.variant_id,COALESCE')) return this.db.inventoryRecord?.id === this.values[0] ? this.db.inventoryRecord : null;
    if (this.sql.startsWith('SELECT COALESCE(SUM(quantity),0) quantity FROM order_items')) return { quantity: this.db.orderedQuantity };
    if (this.sql.startsWith('SELECT COALESCE(SUM(quantity),0) quantity FROM reservations')) return { quantity: this.db.reservedQuantity };
    if (this.sql.startsWith("SELECT id,inventory_item_id,order_id,quantity FROM reservations")) return this.db.reservationRecord?.id === this.values[0] ? this.db.reservationRecord : null;
    if (this.sql.startsWith('SELECT id,status FROM shipments')) return this.db.shipmentRecord;
    if (this.sql.startsWith("SELECT id FROM inventory_movements WHERE movement_type='RETURN'")) return this.db.returnMovementExists ? { id: 'return-existing' } : null;
    if (this.sql.startsWith('SELECT id,approval_status,price_list_id FROM companies')) return this.db.quoteCompany?.id === this.values[0] ? this.db.quoteCompany : null;
    if (this.sql.startsWith('SELECT id FROM product_variants')) return this.db.validVariant === this.values[0] ? { id: this.values[0] } : null;
    if (this.sql.startsWith("SELECT id,currency FROM price_lists")) return this.db.priceList?.id === this.values[0] ? this.db.priceList : null;
    if (this.sql.startsWith('SELECT id,amount_cents,currency,valid_from FROM prices')) return this.db.currentPrice;
    if (this.sql.startsWith('SELECT i.id,COALESCE(SUM(m.physical_delta)')) return this.db.inventoryBalanceRecord?.id === this.values[0] ? this.db.inventoryBalanceRecord : null;
    if (this.sql.startsWith('SELECT id,email,display_name,status,company_id,created_at,updated_at FROM users')) return this.db.exportUser?.id === this.values[0] ? this.db.exportUser : null;
    if (this.sql.startsWith('SELECT amount_cents FROM prices')) return this.db.listedPrice == null ? null : { amount_cents: this.db.listedPrice };
    if (this.sql.startsWith('SELECT id,company_id,status FROM quotes')) return this.db.quoteRecord?.id === this.values[0] ? this.db.quoteRecord : null;
    if (this.sql.startsWith('SELECT id,company_id,customer_id FROM quotes')) return this.db.acceptedQuote?.id === this.values[0] ? this.db.acceptedQuote : null;
    if (this.sql.startsWith('SELECT id FROM orders WHERE quote_id')) return this.db.existingOrder ? { id: this.db.existingOrder } : null;
    if (this.sql.startsWith('SELECT id,approval_status FROM companies')) return this.db.company?.id === this.values[0] ? { id: this.db.company.id, approval_status: this.db.company.approval_status } : null;
    if (this.sql.startsWith('SELECT id FROM companies')) return this.db.validCompany === this.values[0] ? { id: this.values[0] } : null;
    return null;
  }
  async all() {
    this.db.allCalls.push({ sql: this.sql, values: this.values });
    if (this.sql.startsWith('SELECT variant_id,quantity,unit_price_cents FROM quote_items')) return { success: true, results: this.db.quoteItems };
    if (this.sql.startsWith("SELECT id,inventory_item_id,order_id,quantity FROM reservations WHERE status='ACTIVE' AND expires_at")) return { success: true, results: this.db.dueReservations };
    if (this.sql.startsWith("SELECT id,inventory_item_id,quantity FROM reservations WHERE order_id=? AND status='ACTIVE'")) return { success: true, results: this.db.activeReservations };
    if (this.sql.startsWith("SELECT id,inventory_item_id,quantity FROM reservations WHERE order_id=? AND status='CONVERTED'")) return { success: true, results: this.db.convertedReservations };
    if (this.sql.startsWith('SELECT DISTINCT p.product_type FROM order_items')) return { success: true, results: this.db.orderProductTypes };
    if (this.sql.startsWith('SELECT inventory_item_id,quantity FROM return_items')) return { success: true, results: this.db.returnItems };
    if (this.sql.startsWith('SELECT id,email,display_name,status,company_id,email_verified_at')) return { success: true, results: this.db.adminExportRows ?? [] };
    if (this.sql.startsWith("SELECT id FROM delivery_outbox WHERE status='PENDING'")) return { success: true, results: this.db.pendingDeliveries ?? [] };
    return { success: true, results: [] };
  }
  async run() {
    if (this.sql.startsWith('INSERT INTO sessions')) this.db.session = this.values;
    if (this.sql.startsWith('UPDATE users SET last_login_at')) this.db.updated = true;
    if (this.sql.startsWith('UPDATE users SET failed_login_count=?')) { this.db.user.failed_login_count=this.values[0];this.db.user.locked_until=this.values[1];this.db.failedLoginUpdate=this.values; }
    if (this.sql.startsWith('UPDATE sessions SET revoked_at=? WHERE user_id=? AND id<>?')) this.db.revokedOtherSessions = this.values;
    if (this.sql.startsWith('UPDATE sessions SET revoked_at=? WHERE id=? AND user_id=?')) this.db.revokedCurrentSession = this.values;
    if (this.sql.startsWith('UPDATE notifications SET read_at=COALESCE')) this.db.markedNotification = this.values[1];
    if (this.sql.startsWith('UPDATE notifications SET read_at=?')) this.db.markedAllFor = this.values[1];
    if (this.sql.startsWith('UPDATE settings SET')) this.db.updatedSetting = this.values;
    if (this.sql.startsWith('INSERT INTO audit_events')) { this.db.audit = this.values; this.db.audits.push(this.values); }
    if (this.sql.startsWith('INSERT INTO customers')) this.db.insertedCustomer = this.values;
    if (this.sql.startsWith('INSERT INTO privacy_requests')) this.db.insertedPrivacyRequest = this.values;
    if (this.sql.startsWith("UPDATE delivery_outbox SET status='SIMULATED'")) this.db.simulatedDeliveries.push(this.values);
    if (this.sql.startsWith('UPDATE customers SET')) this.db.updatedCustomer = this.values;
    if (this.sql.startsWith('UPDATE companies SET approval_status')) this.db.updatedCompany = this.values;
    if (this.sql.startsWith('INSERT INTO approvals')) this.db.approval = this.values;
    if (this.sql.startsWith('INSERT INTO leads')) this.db.insertedLead = this.values;
    if (this.sql.startsWith('INSERT INTO requests')) this.db.insertedRequest = this.values;
    if (this.sql.startsWith('UPDATE requests SET status')) this.db.updatedRequestStatus = this.values;
    if (this.sql.startsWith('UPDATE leads SET status')) this.db.updatedLeadStatus = this.values;
    if (this.sql.startsWith('INSERT INTO conversations')) this.db.insertedConversation = this.values;
    if (this.sql.startsWith('INSERT INTO messages')) this.db.insertedMessage = this.values;
    if (this.sql.startsWith('UPDATE conversations SET status')) this.db.updatedConversation = this.values;
    if (this.sql.startsWith('INSERT INTO quotes')) this.db.insertedQuote = this.values;
    if (this.sql.startsWith('INSERT INTO quote_items')) this.db.insertedQuoteItem = this.values;
    if (this.sql.startsWith('UPDATE quotes SET status=?')) this.db.updatedQuoteStatus = this.values;
    if (this.sql.startsWith('UPDATE prices SET valid_until')) this.db.closedPrice = this.values;
    if (this.sql.startsWith('INSERT INTO prices')) this.db.insertedPrice = this.values;
    if (this.sql.includes("UPDATE quotes SET status='CONVERTED'")) this.db.convertedQuote = this.values;
    if (this.sql.startsWith('INSERT INTO orders')) this.db.insertedOrder = this.values;
    if (this.sql.startsWith('INSERT INTO order_items')) this.db.insertedOrderItems.push(this.values);
    if (this.sql.startsWith('INSERT INTO reservations')) this.db.insertedReservation = this.values;
    if (this.sql.startsWith('INSERT INTO inventory_movements')) this.db.inventoryMovements.push({ sql: this.sql, values: this.values });
    if (this.sql.startsWith('UPDATE reservations SET')) this.db.updatedReservation = this.values;
    if (this.sql.startsWith('UPDATE orders SET status=CASE')) this.db.recalculatedOrder = this.values;
    if (this.sql.startsWith('UPDATE orders SET status=?')) this.db.updatedOrderStatus = this.values;
    if (this.sql.includes("UPDATE orders SET status='CONFIRMED'")) this.db.confirmedOrder = this.values;
    if (this.sql.includes("UPDATE orders SET status='SHIPPED'")) this.db.shippedOrder = this.values;
    if (this.sql.includes("UPDATE orders SET status='DELIVERED'")) this.db.deliveredOrder = this.values;
    if (this.sql.startsWith('INSERT INTO shipments')) this.db.insertedShipment = this.values;
    if (this.sql.startsWith('UPDATE shipments SET status=?')) this.db.updatedShipment = this.values;
    if (this.sql.startsWith('UPDATE inbox_cases SET')) this.db.updatedInbox = this.values;
    if (this.sql.startsWith('INSERT INTO inbox_history')) this.db.inboxHistory = this.values;
    if (this.sql.startsWith('UPDATE conversations SET assigned_user_id')) this.db.updatedInboxConversation = this.values;
    if (this.sql.startsWith('INSERT INTO return_requests')) this.db.insertedReturn = this.values;
    if (this.sql.startsWith('INSERT INTO return_items')) this.db.insertedReturnItems.push(this.values);
    if (this.sql.startsWith('INSERT INTO return_history')) this.db.returnHistory.push(this.values);
    if (this.sql.startsWith('UPDATE return_items SET inspection_result')) this.db.inspectedReturnItems = this.values;
    if (this.sql.startsWith('INSERT INTO inventory_movement_details')) this.db.inventoryMovementDetails.push(this.values);
    if (this.sql.startsWith('UPDATE return_requests SET')) this.db.updatedReturn = this.values;
    if (this.sql.includes("UPDATE orders SET status='RETURNED'")) this.db.returnedOrder = this.values;
    return { success: true, results: [] };
  }
}
class LoginD1 {
  constructor(user) { this.user = user; this.session = null; this.updated = false; this.principal = null; this.notification = null; this.markedNotification = null; this.markedAllFor = null; this.setting = null; this.updatedSetting = null; this.audit = null; this.customer = null; this.duplicateCustomer = null; this.validCompany = null; this.insertedCustomer = null; this.updatedCustomer = null; this.company = null; this.updatedCompany = null; this.approval = null; this.requestCustomer = null; this.requestRecord = null; this.validEmployee = null; this.insertedLead = null; this.insertedRequest = null; this.updatedRequestStatus = null; this.updatedLeadStatus = null; this.conversation = null; this.insertedConversation = null; this.insertedMessage = null; this.updatedConversation = null; this.allCalls = []; this.quoteCompany = null; this.validVariant = null; this.listedPrice = null; this.quoteRecord = null; this.acceptedQuote = null; this.existingOrder = null; this.quoteItems = []; this.insertedQuote = null; this.insertedQuoteItem = null; this.updatedQuoteStatus = null; this.convertedQuote = null; this.insertedOrder = null; this.insertedOrderItems = []; this.audits = []; this.orderRecord = null; this.incompleteReservation = null; this.inventoryRecord = null; this.orderedQuantity = 0; this.reservedQuantity = 0; this.reservationRecord = null; this.shipmentRecord = null; this.returnMovementExists = false; this.dueReservations = []; this.activeReservations = []; this.convertedReservations = []; this.orderProductTypes = []; this.insertedReservation = null; this.inventoryMovements = []; this.updatedReservation = null; this.recalculatedOrder = null; this.updatedOrderStatus = null; this.confirmedOrder = null; this.shippedOrder = null; this.deliveredOrder = null; this.insertedShipment = null; this.updatedShipment = null; this.inboxCase = null; this.validInboxUser = null; this.updatedInbox = null; this.inboxHistory = null; this.updatedInboxConversation = null; this.returnOrder = null; this.returnOrderItem = null; this.priorReturnQuantity = 0; this.returnRecord = null; this.returnItems = []; this.inventoryBalance = { physical: 0, reserved: 0 }; this.insertedReturn = null; this.insertedReturnItems = []; this.returnHistory = []; this.inspectedReturnItems = null; this.inventoryMovementDetails = []; this.updatedReturn = null; this.returnedOrder = null; this.simulatedDeliveries = []; }
  prepare(sql) { return new LoginD1Statement(this, sql); }
  async batch(statements) { return await Promise.all(statements.map(statement => statement.run())); }
}
function loginEnv(db) { return { DB: db, SESSION_SECRET: 'session-secret-for-handler-test' }; }

test('real login handler verifies scrypt v1, creates session and cookie', async () => {
  const db = new LoginD1({ id: 'usr-admin', email: 'admin@demo.invalid', display_name: 'Administrador DEMO', company_id: '', role: 'ADMIN', status: 'ACTIVE', password_salt: saltFixture, password_hash: hashFixture });
  const response = await api(new Request('https://demo.celulars.com.br/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-ray': 'handler-test' }, body: JSON.stringify({ email: 'admin@demo.invalid', password: passwordFixture }) }), loginEnv(db), new URL('https://demo.celulars.com.br/api/auth/login'));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie') ?? '', /^celulars_demo_online_session=/);
  assert.equal(db.session?.[1], 'usr-admin');
  assert.equal(db.updated, true);
  const loginPayload = await response.json();
  assert.equal(loginPayload.user.roles[0], 'ADMIN');
  assert.ok(loginPayload.user.permissions.includes('companies.approve'));
});

test('real login handler rejects wrong password without creating session', async () => {
  const db = new LoginD1({ id: 'usr-admin', email: 'admin@demo.invalid', display_name: 'Administrador DEMO', company_id: '', role: 'ADMIN', status: 'ACTIVE', password_salt: saltFixture, password_hash: hashFixture });
  const response = await api(new Request('https://demo.celulars.com.br/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'admin@demo.invalid', password: 'wrong-password' }) }), loginEnv(db), new URL('https://demo.celulars.com.br/api/auth/login'));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'INVALID_CREDENTIALS' });
  assert.equal(db.session, null);
});
test('notification writes require CSRF and stay scoped to the signed-in user', async () => {
  const db = new LoginD1(null);
  db.principal = { id: 'usr-admin', email: 'admin@demo.invalid', display_name: 'Administrador DEMO', company_id: null, role: 'ADMIN', csrfToken: 'csrf-notifications' };
  db.notification = { id: 'notification-owned' };
  const env = loginEnv(db);
  const ownedUrl = new URL('https://demo.celulars.com.br/api/notifications/notification-owned/read');
  const headers = { cookie: 'celulars_demo_online_session=session-token', 'x-csrf-token': 'csrf-notifications' };
  const response = await api(new Request(ownedUrl, { method: 'POST', headers }), env, ownedUrl);
  assert.equal(response.status, 200);
  assert.equal(db.markedNotification, 'notification-owned');
  const foreignUrl = new URL('https://demo.celulars.com.br/api/notifications/notification-foreign/read');
  const foreign = await api(new Request(foreignUrl, { method: 'POST', headers }), env, foreignUrl);
  assert.equal(foreign.status, 404);
  assert.equal(db.markedNotification, 'notification-owned');
  await assert.rejects(api(new Request(ownedUrl, { method: 'POST', headers: { cookie: 'celulars_demo_online_session=session-token' } }), env, ownedUrl), /CSRF_INVALID/);
});

test('mark-all notifications updates only the signed-in user', async () => {
  const db = new LoginD1(null);
  db.principal = { id: 'usr-employee', email: 'funcionario1@demo.invalid', display_name: 'Funcionário DEMO', company_id: null, role: 'EMPLOYEE', csrfToken: 'csrf-all' };
  const env = loginEnv(db);
  const url = new URL('https://demo.celulars.com.br/api/notifications/read-all');
  const response = await api(new Request(url, { method: 'POST', headers: { cookie: 'celulars_demo_online_session=session-token', 'x-csrf-token': 'csrf-all' } }), env, url);
  assert.equal(response.status, 200);
  assert.equal(db.markedAllFor, 'usr-employee');
});
test('settings writes are validated, admin-only and audited atomically', async () => {
  const db = new LoginD1(null);
  db.principal = { id: 'usr-admin', email: 'admin@demo.invalid', display_name: 'Administrador DEMO', company_id: null, role: 'ADMIN', csrfToken: 'csrf-settings' };
  db.setting = { key: 'reservation_minutes', value: '60' };
  const env = loginEnv(db);
  const url = new URL('https://demo.celulars.com.br/api/settings/reservation_minutes');
  const request = value => new Request(url, { method: 'PATCH', headers: { cookie: 'celulars_demo_online_session=session-token', 'x-csrf-token': 'csrf-settings', 'content-type': 'application/json' }, body: JSON.stringify({ value }) });
  const response = await api(request('90'), env, url);
  assert.equal(response.status, 200);
  assert.deepEqual(db.updatedSetting?.slice(0, 3), ['90', 'NUMBER', 'usr-admin']);
  assert.equal(db.audit?.[2], 'SETTINGS_CHANGE');
  const invalid = await api(request('-1'), env, url);
  assert.equal(invalid.status, 400);
  db.principal = { ...db.principal, id: 'usr-employee', role: 'EMPLOYEE' };
  const forbidden = await api(request('120'), env, url);
  assert.equal(forbidden.status, 403);
});
test('customer create and update are validated, audited and blocked for wholesale', async () => {
  const db = new LoginD1(null);
  db.principal = { id: 'usr-employee', email: 'funcionario1@demo.invalid', display_name: 'Funcionário DEMO', company_id: null, role: 'EMPLOYEE', csrfToken: 'csrf-customers' };
  const env = loginEnv(db);
  const headers = { cookie: 'celulars_demo_online_session=session-token', 'x-csrf-token': 'csrf-customers', 'content-type': 'application/json' };
  const payload = { name: 'Cliente Teste DEMO', email: 'cliente.teste@demo.invalid', country: 'br', language: 'pt-BR', source: 'Teste automatizado', status: 'LEAD', notes: 'Registro fictício.' };
  const createUrl = new URL('https://demo.celulars.com.br/api/customers');
  const created = await api(new Request(createUrl, { method: 'POST', headers, body: JSON.stringify(payload) }), env, createUrl);
  assert.equal(created.status, 201);
  assert.equal(db.insertedCustomer?.[2], 'cliente.teste@demo.invalid');
  assert.equal(db.audit?.[2], 'CREATE');
  const invalid = await api(new Request(createUrl, { method: 'POST', headers, body: JSON.stringify({ ...payload, email: 'invalid' }) }), env, createUrl);
  assert.equal(invalid.status, 400);
  const id = 'customer-demo-edit';
  db.customer = { id, name: 'Antes', email: 'antes@demo.invalid', country: 'US', language: 'pt-BR', source: 'DEMO', status: 'LEAD', notes: 'Antes', company_id: null };
  const updateUrl = new URL(`https://demo.celulars.com.br/api/customers/${id}`);
  const updated = await api(new Request(updateUrl, { method: 'PATCH', headers, body: JSON.stringify({ ...payload, status: 'ACTIVE' }) }), env, updateUrl);
  assert.equal(updated.status, 200);
  assert.equal(db.updatedCustomer?.[5], 'ACTIVE');
  assert.equal(db.audit?.[2], 'UPDATE');
  db.principal = { ...db.principal, id: 'usr-wholesale', role: 'WHOLESALE', company_id: 'company-wholesale' };
  const forbidden = await api(new Request(createUrl, { method: 'POST', headers, body: JSON.stringify(payload) }), env, createUrl);
  assert.equal(forbidden.status, 403);
});
test('company approval enforces valid transitions, admin role and atomic audit', async () => {
  const db = new LoginD1(null);
  db.principal = { id: 'usr-admin', email: 'admin@demo.invalid', display_name: 'Administrador DEMO', company_id: null, role: 'ADMIN', csrfToken: 'csrf-company' };
  db.company = { id: 'company-review', approval_status: 'UNDER_REVIEW' };
  const env = loginEnv(db);
  const url = new URL('https://demo.celulars.com.br/api/companies/company-review/approval');
  const request = (status, role = 'ADMIN') => { db.principal = { ...db.principal, role }; return new Request(url, { method: 'POST', headers: { cookie: 'celulars_demo_online_session=session-token', 'x-csrf-token': 'csrf-company', 'content-type': 'application/json' }, body: JSON.stringify({ status, notes: 'Decisão comercial fictícia.' }) }); };
  const approved = await api(request('APPROVED'), env, url);
  assert.equal(approved.status, 200);
  assert.deepEqual(db.updatedCompany?.[0], 'APPROVED');
  assert.equal(db.approval?.[2], 'UNDER_REVIEW');
  assert.equal(db.audit?.[2], 'COMPANY_APPROVAL');
  db.company.approval_status = 'APPROVED';
  const invalid = await api(request('REJECTED'), env, url);
  assert.equal(invalid.status, 409);
  const forbidden = await api(request('SUSPENDED', 'EMPLOYEE'), env, url);
  assert.equal(forbidden.status, 403);
});

test('request creation is scoped and status transitions are internal, validated and audited', async () => {
  const db = new LoginD1(null);
  db.principal = { id: 'usr-wholesale', email: 'atacadista2@demo.invalid', display_name: 'Atacadista DEMO', company_id: 'company-wholesale', role: 'WHOLESALE', csrfToken: 'csrf-requests' };
  const env = loginEnv(db);
  const headers = { cookie: 'celulars_demo_online_session=session-token', 'x-csrf-token': 'csrf-requests', 'content-type': 'application/json' };
  const createUrl = new URL('https://demo.celulars.com.br/api/requests');
  const payload = { title: 'Consulta DEMO', description: 'Solicitacao ficticia de produto.', leadType: 'PRODUCT', priority: 'HIGH' };
  const created = await api(new Request(createUrl, { method: 'POST', headers, body: JSON.stringify(payload) }), env, createUrl);
  assert.equal(created.status, 201);
  assert.equal(db.insertedLead?.[2], 'company-wholesale');
  assert.equal(db.insertedRequest?.[4], 'usr-wholesale');
  assert.equal(db.audit?.[2], 'CREATE');
  const listResponse = await api(new Request(createUrl, { headers: { cookie: 'celulars_demo_online_session=session-token' } }), env, createUrl);
  assert.equal((await listResponse.json()).readOnlyStatus, true);
  db.requestRecord = { id: 'request-demo', lead_id: 'lead-demo', status: 'NEW', assigned_user_id: null };
  const statusUrl = new URL('https://demo.celulars.com.br/api/requests/request-demo/status');
  const forbidden = await api(new Request(statusUrl, { method: 'POST', headers, body: JSON.stringify({ status: 'ASSIGNED' }) }), env, statusUrl);
  assert.equal(forbidden.status, 403);
  db.principal = { ...db.principal, id: 'usr-employee', role: 'EMPLOYEE', company_id: null };
  db.validEmployee = 'usr-employee';
  const transitioned = await api(new Request(statusUrl, { method: 'POST', headers, body: JSON.stringify({ status: 'ASSIGNED', assignedUserId: 'usr-employee' }) }), env, statusUrl);
  assert.equal(transitioned.status, 200);
  assert.deepEqual(db.updatedRequestStatus?.slice(0,2), ['ASSIGNED','usr-employee']);
  assert.deepEqual(db.updatedLeadStatus?.slice(0,2), ['ASSIGNED','usr-employee']);
  assert.equal(db.audit?.[2], 'UPDATE');
  db.requestRecord.status = 'ASSIGNED';
  const invalid = await api(new Request(statusUrl, { method: 'POST', headers, body: JSON.stringify({ status: 'RESOLVED' }) }), env, statusUrl);
  assert.equal(invalid.status, 409);
});

test('conversations and messages preserve company scope, internal-note privacy and simulated delivery', async () => {
  const db=new LoginD1(null);
  db.principal={id:'usr-wholesale',email:'atacadista2@demo.invalid',display_name:'Atacadista DEMO',company_id:'company-wholesale',role:'WHOLESALE',csrfToken:'csrf-messages'};
  const env=loginEnv(db);const headers={cookie:'celulars_demo_online_session=session-token','x-csrf-token':'csrf-messages','content-type':'application/json'};
  const conversationsUrl=new URL('https://demo.celulars.com.br/api/conversations');
  const listed=await api(new Request(conversationsUrl,{headers:{cookie:'celulars_demo_online_session=session-token'}}),env,conversationsUrl);
  const listPayload=await listed.json();assert.equal(listPayload.allowInternalNotes,false);assert.equal(listPayload.environment,'DEMO_ONLINE');
  assert.ok(db.allCalls.some(call=>call.sql.includes("m.message_type<>'INTERNAL_NOTE'")&&call.values[2]===1));
  const created=await api(new Request(conversationsUrl,{method:'POST',headers,body:JSON.stringify({subject:'Conversa atacadista DEMO'})}),env,conversationsUrl);
  assert.equal(created.status,201);assert.equal(db.insertedConversation?.[1],'company-wholesale');assert.equal(db.audit?.[2],'CREATE');
  const conversationId=(await created.json()).id;db.conversation={id:conversationId,company_id:'company-wholesale'};
  const messagesUrl=new URL('https://demo.celulars.com.br/api/messages');
  const forbidden=await api(new Request(messagesUrl,{method:'POST',headers,body:JSON.stringify({conversationId,body:'Nota privada',messageType:'INTERNAL_NOTE'})}),env,messagesUrl);
  assert.equal(forbidden.status,403);assert.equal(db.insertedMessage,null);
  const sent=await api(new Request(messagesUrl,{method:'POST',headers,body:JSON.stringify({conversationId,body:'Mensagem ficticia',messageType:'MESSAGE'})}),env,messagesUrl);
  assert.equal(sent.status,201);assert.equal(db.insertedMessage?.[4],'MESSAGE');assert.equal(db.updatedConversation?.[0],'OPEN');assert.equal((await sent.json()).externalDelivery,'NOT_CONFIGURED');assert.equal(db.audit?.[2],'MESSAGE_SENT');
  db.principal={...db.principal,id:'usr-employee',role:'EMPLOYEE',company_id:null};
  const internal=await api(new Request(messagesUrl,{method:'POST',headers,body:JSON.stringify({conversationId,body:'Nota interna ficticia',messageType:'INTERNAL_NOTE'})}),env,messagesUrl);
  assert.equal(internal.status,201);assert.equal(db.insertedMessage?.[4],'INTERNAL_NOTE');
  db.principal={...db.principal,id:'usr-wholesale',role:'WHOLESALE',company_id:'other-company'};
  const foreign=await api(new Request(messagesUrl,{method:'POST',headers,body:JSON.stringify({conversationId,body:'Mensagem indevida',messageType:'MESSAGE'})}),env,messagesUrl);
  assert.equal(foreign.status,404);
});

test('quotes use DEMO list prices, enforce wholesale decisions and convert atomically for internal users', async () => {
  const db=new LoginD1(null);db.principal={id:'usr-wholesale',email:'atacadista2@demo.invalid',display_name:'Atacadista DEMO',company_id:'company-wholesale',role:'WHOLESALE',csrfToken:'csrf-quotes'};db.quoteCompany={id:'company-wholesale',approval_status:'APPROVED',price_list_id:'price-list-demo'};db.validVariant='variant-demo';db.listedPrice=12345;
  const env=loginEnv(db),headers={cookie:'celulars_demo_online_session=session-token','x-csrf-token':'csrf-quotes','content-type':'application/json'},quotesUrl=new URL('https://demo.celulars.com.br/api/quotes');
  const listed=await api(new Request(quotesUrl,{headers:{cookie:'celulars_demo_online_session=session-token'}}),env,quotesUrl);const listPayload=await listed.json();assert.equal(listPayload.readOnlyInternalWorkflow,true);assert.equal(listPayload.scopedCompanyId,'company-wholesale');
  const created=await api(new Request(quotesUrl,{method:'POST',headers,body:JSON.stringify({variantId:'variant-demo',quantity:2,unitPriceCents:1,notes:'Cotacao ficticia.'})}),env,quotesUrl);assert.equal(created.status,201);assert.equal(db.insertedQuote?.[2],'company-wholesale');assert.equal(db.insertedQuoteItem?.[4],12345);assert.equal((await created.json()).unitPriceCents,12345);assert.equal(db.audit?.[2],'CREATE');
  db.quoteRecord={id:'quote-demo',company_id:'company-wholesale',status:'SENT'};const statusUrl=new URL('https://demo.celulars.com.br/api/quotes/quote-demo/status');const accepted=await api(new Request(statusUrl,{method:'POST',headers,body:JSON.stringify({status:'ACCEPTED'})}),env,statusUrl);assert.equal(accepted.status,200);assert.equal(db.updatedQuoteStatus?.[0],'ACCEPTED');assert.equal(db.audit?.[2],'QUOTE_ACCEPTED');
  db.quoteRecord.status='DRAFT';const forbiddenTransition=await api(new Request(statusUrl,{method:'POST',headers,body:JSON.stringify({status:'SENT'})}),env,statusUrl);assert.equal(forbiddenTransition.status,403);
  const convertUrl=new URL('https://demo.celulars.com.br/api/quotes/quote-demo/convert');const forbiddenConvert=await api(new Request(convertUrl,{method:'POST',headers,body:JSON.stringify({deliveryMethod:'PICKUP_MIAMI',addressDemo:'Endereco DEMO',carrierDemo:'Carrier DEMO'})}),env,convertUrl);assert.equal(forbiddenConvert.status,403);
  db.principal={...db.principal,id:'usr-employee',role:'EMPLOYEE',company_id:null};db.acceptedQuote={id:'quote-demo',company_id:'company-wholesale',customer_id:null};db.quoteItems=[{variant_id:'variant-demo',quantity:2,unit_price_cents:12345}];db.audits=[];
  const converted=await api(new Request(convertUrl,{method:'POST',headers,body:JSON.stringify({deliveryMethod:'PICKUP_MIAMI',addressDemo:'Endereco DEMO',carrierDemo:'Carrier DEMO'})}),env,convertUrl);assert.equal(converted.status,201);assert.equal(db.insertedOrder?.[5],'MIAMI_PICKUP');assert.equal(db.insertedOrderItems.length,1);assert.equal(db.convertedQuote?.[1],'quote-demo');assert.deepEqual(db.audits.map(row=>row[2]),['QUOTE_CONVERTED','ORDER_CREATED']);
});

test('orders, reservations and shipments preserve the DEMO ledger and internal workflow', async () => {
  const db=new LoginD1(null);db.principal={id:'usr-employee',email:'funcionario1@demo.invalid',display_name:'Funcionario DEMO',company_id:null,role:'EMPLOYEE',csrfToken:'csrf-orders'};const env=loginEnv(db),headers={cookie:'celulars_demo_online_session=session-token','x-csrf-token':'csrf-orders','content-type':'application/json'};
  db.orderRecord={id:'order-demo',status:'CONFIRMED'};db.inventoryRecord={id:'inventory-demo',variant_id:'variant-demo',physical:5,reserved:1};db.orderedQuantity=2;db.reservedQuantity=0;
  const reservationUrl=new URL('https://demo.celulars.com.br/api/reservations');const created=await api(new Request(reservationUrl,{method:'POST',headers,body:JSON.stringify({orderId:'order-demo',inventoryItemId:'inventory-demo',quantity:2})}),env,reservationUrl);assert.equal(created.status,201);assert.equal(db.insertedReservation?.[3],2);assert.equal(db.inventoryMovements.at(-1)?.values[2],2);assert.ok(db.recalculatedOrder);assert.equal(db.audit?.[2],'RESERVATION');
  const insufficient=await api(new Request(reservationUrl,{method:'POST',headers,body:JSON.stringify({orderId:'order-demo',inventoryItemId:'inventory-demo',quantity:5})}),env,reservationUrl);assert.equal(insufficient.status,409);
  db.reservationRecord={id:'reservation-demo',inventory_item_id:'inventory-demo',order_id:'order-demo',quantity:2};const releaseUrl=new URL('https://demo.celulars.com.br/api/reservations/reservation-demo/release');const released=await api(new Request(releaseUrl,{method:'POST',headers,body:'{}'}),env,releaseUrl);assert.equal(released.status,200);assert.equal(db.inventoryMovements.at(-1)?.values[2],-2);assert.equal(db.audit?.[2],'RELEASE');
  const statusUrl=new URL('https://demo.celulars.com.br/api/orders/order-demo/status');db.incompleteReservation={variant_id:'variant-demo'};const incomplete=await api(new Request(statusUrl,{method:'POST',headers,body:JSON.stringify({status:'READY_FOR_PICKUP'})}),env,statusUrl);assert.equal(incomplete.status,409);db.incompleteReservation=null;const ready=await api(new Request(statusUrl,{method:'POST',headers,body:JSON.stringify({status:'READY_FOR_PICKUP'})}),env,statusUrl);assert.equal(ready.status,200);assert.equal(db.updatedOrderStatus?.[0],'READY_FOR_PICKUP');
  db.orderRecord={id:'order-demo',status:'READY_FOR_PICKUP'};db.orderProductTypes=[{product_type:'NEW'}];const shipmentUrl=new URL('https://demo.celulars.com.br/api/shipments');const pending=await api(new Request(shipmentUrl,{method:'POST',headers,body:JSON.stringify({orderId:'order-demo',status:'PENDING',method:'BRAZIL_COURIER',carrierDemo:'Carrier DEMO',trackingDemo:'DEMO-NOT-SHIPPED',shippingCostCents:1})}),env,shipmentUrl);assert.equal(pending.status,200);assert.equal(db.insertedShipment?.[5],20000);assert.equal((await pending.json()).shippingCostCents,20000);
  db.shipmentRecord={id:'shipment-demo',status:'READY'};const transit=await api(new Request(shipmentUrl,{method:'POST',headers,body:JSON.stringify({orderId:'order-demo',status:'IN_TRANSIT',method:'PICKUP_MIAMI',carrierDemo:'Carrier DEMO',trackingDemo:'DEMO-NOT-SHIPPED',shippingCostCents:0})}),env,shipmentUrl);assert.equal(transit.status,200);assert.ok(db.shippedOrder);
  db.orderRecord.status='SHIPPED';db.shipmentRecord.status='IN_TRANSIT';db.activeReservations=[{id:'reservation-sale',inventory_item_id:'inventory-demo',quantity:2}];const delivered=await api(new Request(shipmentUrl,{method:'POST',headers,body:JSON.stringify({orderId:'order-demo',status:'DELIVERED',method:'PICKUP_MIAMI',carrierDemo:'Carrier DEMO',trackingDemo:'DEMO-DELIVERED',shippingCostCents:0})}),env,shipmentUrl);assert.equal(delivered.status,200);assert.ok(db.inventoryMovements.some(item=>item.sql.includes("'SALE'")));assert.ok(db.deliveredOrder);assert.equal(db.audit?.[2],'SHIPMENT_STATUS_CHANGE');
  db.principal={...db.principal,id:'usr-wholesale',role:'WHOLESALE',company_id:'company-wholesale'};const forbidden=await api(new Request(reservationUrl,{method:'POST',headers,body:JSON.stringify({orderId:'order-demo',inventoryItemId:'inventory-demo',quantity:1})}),env,reservationUrl);assert.equal(forbidden.status,403);
});

test('inbox, document capability and returns stay scoped, fail closed and auditable', async () => {
  const db=new LoginD1(null);db.principal={id:'usr-employee',email:'funcionario1@demo.invalid',display_name:'Funcionario DEMO',company_id:null,role:'EMPLOYEE',csrfToken:'csrf-modules'};const env=loginEnv(db),headers={cookie:'celulars_demo_online_session=session-token','x-csrf-token':'csrf-modules','content-type':'application/json'};
  db.conversation={id:'conversation-demo',company_id:'company-wholesale'};db.inboxCase={conversation_id:'conversation-demo',status:'OPEN',priority:'NORMAL',assigned_user_id:null,tags_json:'[]',sla_due_at:null};const inboxUrl=new URL('https://demo.celulars.com.br/api/inbox/conversation-demo');const resolved=await api(new Request(inboxUrl,{method:'PATCH',headers,body:JSON.stringify({status:'RESOLVED',priority:'HIGH',tags:['demo']})}),env,inboxUrl);assert.equal(resolved.status,200);assert.equal(db.updatedInbox?.[0],'RESOLVED');assert.equal(db.updatedInboxConversation?.[1],'OPEN');assert.equal(db.inboxHistory?.[3],'CASE_UPDATED');assert.equal(db.audit?.[2],'INBOX_CASE_UPDATED');
  db.principal={...db.principal,id:'usr-wholesale',role:'WHOLESALE',company_id:'company-wholesale'};const forbiddenManage=await api(new Request(inboxUrl,{method:'PATCH',headers,body:JSON.stringify({status:'WAITING_CUSTOMER',priority:'URGENT'})}),env,inboxUrl);assert.equal(forbiddenManage.status,403);const waiting=await api(new Request(inboxUrl,{method:'PATCH',headers,body:JSON.stringify({status:'WAITING_CUSTOMER'})}),env,inboxUrl);assert.equal(waiting.status,200);assert.equal(db.updatedInboxConversation?.[1],'PENDING');
  const documentsUrl=new URL('https://demo.celulars.com.br/api/documents');const documents=await api(new Request(documentsUrl,{headers:{cookie:'celulars_demo_online_session=session-token'}}),env,documentsUrl);const documentPayload=await documents.json();assert.equal(documentPayload.storageAvailable,false);assert.equal(documentPayload.storageProvider,'EXTERNAL_NOT_PROVISIONED');const upload=await api(new Request(documentsUrl,{method:'POST',headers,body:JSON.stringify({name:'demo.txt',mimeType:'text/plain',contentBase64:'ZGVtbw=='})}),env,documentsUrl);assert.equal(upload.status,503);
  db.returnOrder={id:'order-return',company_id:'company-wholesale',status:'DELIVERED'};db.returnOrderItem={id:'order-item-return',quantity:2,inventory_item_id:'inventory-demo'};const returnsUrl=new URL('https://demo.celulars.com.br/api/returns');const created=await api(new Request(returnsUrl,{method:'POST',headers,body:JSON.stringify({orderId:'order-return',reasonCode:'RETURN_DEMO',notes:'Solicitacao ficticia.',items:[{orderItemId:'order-item-return',quantity:1}]})}),env,returnsUrl);assert.equal(created.status,201);assert.equal(db.insertedReturn?.[2],'order-return');assert.equal(db.insertedReturnItems.length,1);assert.equal(db.returnHistory.at(-1)?.[1],(await created.clone().json()).id);assert.equal(db.returnHistory.at(-1)?.[2],'Solicitação criada.');assert.equal(db.audit?.[2],'RETURN_CREATED');
  const returnId=(await created.json()).id,returnUrl=new URL(`https://demo.celulars.com.br/api/returns/${returnId}`);const wholesaleReview=await api(new Request(returnUrl,{method:'PATCH',headers,body:JSON.stringify({status:'UNDER_REVIEW',notes:'Revisao interna.'})}),env,returnUrl);assert.equal(wholesaleReview.status,403);
  db.principal={...db.principal,id:'usr-employee',role:'EMPLOYEE',company_id:null};db.returnRecord={id:returnId,return_number:'RET-DEMO-TEST',order_id:'order-return',status:'RECEIVED',resolution:null};const inspected=await api(new Request(returnUrl,{method:'PATCH',headers,body:JSON.stringify({status:'INSPECTED',notes:'Inspecao ficticia.',resolution:'RESTOCK',inspectionResult:'Apto para estoque DEMO'})}),env,returnUrl);assert.equal(inspected.status,200);assert.equal(db.inspectedReturnItems?.[0],'Apto para estoque DEMO');assert.equal(db.updatedReturn?.[2],'RESTOCK');
  db.returnRecord.status='INSPECTED';db.returnRecord.resolution='RESTOCK';db.returnItems=[{inventory_item_id:'inventory-demo',quantity:1}];db.inventoryBalance={physical:4,reserved:0};const restocked=await api(new Request(returnUrl,{method:'PATCH',headers,body:JSON.stringify({status:'RESTOCKED',notes:'Reposicao ficticia.'})}),env,returnUrl);assert.equal(restocked.status,200);assert.ok(db.inventoryMovements.some(item=>item.sql.includes("'RETURN'")));assert.equal(db.inventoryMovementDetails.length,1);assert.ok(db.returnedOrder);assert.equal(db.audit?.[2],'RETURN_STATUS_CHANGE');
});

test('accepts a correctly signed Access JWT', async () => assert.equal((await verifyAccess(request(await token()), env)).email, 'alamomalarocha@gmail.com'));
test('rejects a missing Access JWT', async () => assert.rejects(verifyAccess(request(), env), /ACCESS_TOKEN_MISSING/));
test('rejects wrong issuer', async () => assert.rejects(verifyAccess(request(await token({iss:'https://invalid.example'})), env), /ACCESS_CLAIMS_INVALID/));
test('rejects wrong audience', async () => assert.rejects(verifyAccess(request(await token({aud:['wrong']})), env), /ACCESS_CLAIMS_INVALID/));
test('rejects expired token', async () => assert.rejects(verifyAccess(request(await token({exp:1})), env), /ACCESS_TOKEN_EXPIRED/));
test('rejects a different email', async () => assert.rejects(verifyAccess(request(await token({email:'other@example.com'})), env), /ACCESS_EMAIL_DENIED/));
test('rejects an invalid signature', async () => { const other=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']); await assert.rejects(verifyAccess(request(await token({},other.privateKey)),env),/ACCESS_SIGNATURE_INVALID/); });
test.after(() => { globalThis.fetch=originalFetch; rmSync(outdir,{recursive:true,force:true}); });
test('account session controls revoke only other sessions and logout revokes the current session', async () => {
  const db = new LoginD1(null); db.principal={id:'usr-admin',email:'admin@demo.invalid',display_name:'Admin',company_id:null,role:'ADMIN',csrfToken:'csrf-session',session_id:'session-current'};const env=loginEnv(db),headers={cookie:'celulars_demo_online_session=session-token','x-csrf-token':'csrf-session'};
  let url=new URL('https://demo.celulars.com.br/api/account/sessions/revoke-others');let response=await api(new Request(url,{method:'POST',headers}),env,url);assert.equal(response.status,200);assert.deepEqual(db.revokedOtherSessions?.slice(1),['usr-admin','session-current']);
  url=new URL('https://demo.celulars.com.br/api/auth/logout');response=await api(new Request(url,{method:'POST',headers}),env,url);assert.equal(response.status,200);assert.deepEqual(db.revokedCurrentSession?.slice(1),['session-current','usr-admin']);assert.match(response.headers.get('set-cookie')??'',/Max-Age=0/);
});

test('admin cannot revoke the current account sessions through user administration', async () => {
  const db=new LoginD1(null);db.principal={id:'usr-admin',email:'admin@demo.invalid',display_name:'Admin',company_id:null,role:'ADMIN',csrfToken:'csrf-admin',session_id:'session-current'};const env=loginEnv(db),url=new URL('https://demo.celulars.com.br/api/admin/users/usr-admin/sessions'),headers={cookie:'celulars_demo_online_session=session-token','x-csrf-token':'csrf-admin'};
  const response=await api(new Request(url,{method:'DELETE',headers}),env,url);assert.equal(response.status,409);assert.deepEqual(await response.json(),{error:'SELF_SESSION_REVOCATION_FORBIDDEN'});
});
test('DEMO price revisions close the previous value, append history and reject wholesale writes', async () => {
  const db=new LoginD1(null);db.principal={id:'usr-admin',email:'admin@demo.invalid',display_name:'Admin',company_id:null,role:'ADMIN',csrfToken:'csrf-price',session_id:'s'};db.priceList={id:'list-demo',currency:'USD'};db.validVariant='variant-demo';db.currentPrice={id:'price-old',amount_cents:1000,currency:'USD',valid_from:'2026-01-01'};const env=loginEnv(db),url=new URL('https://demo.celulars.com.br/api/prices/revisions'),headers={cookie:'celulars_demo_online_session=x','x-csrf-token':'csrf-price','content-type':'application/json'},request=()=>new Request(url,{method:'POST',headers,body:JSON.stringify({priceListId:'list-demo',variantId:'variant-demo',amountCents:1250})});
  const response=await api(request(),env,url);assert.equal(response.status,201);assert.equal(db.closedPrice?.[2],'price-old');assert.deepEqual(db.insertedPrice?.slice(1,5),['list-demo','variant-demo',1250,'USD']);assert.equal(db.audit?.[2],'PRICE_CHANGE');db.principal={...db.principal,role:'WHOLESALE'};assert.equal((await api(request(),env,url)).status,403);
});

test('DEMO inventory movements preserve the immutable ledger and reject negative availability', async () => {
  const db=new LoginD1(null);db.principal={id:'usr-admin',email:'admin@demo.invalid',display_name:'Admin',company_id:null,role:'ADMIN',csrfToken:'csrf-stock',session_id:'s'};db.inventoryBalanceRecord={id:'inventory-demo',physical:5,reserved:2};const env=loginEnv(db),url=new URL('https://demo.celulars.com.br/api/inventory/movements'),headers={cookie:'celulars_demo_online_session=x','x-csrf-token':'csrf-stock','content-type':'application/json'},request=quantity=>new Request(url,{method:'POST',headers,body:JSON.stringify({inventoryItemId:'inventory-demo',movementType:'ADJUSTMENT_OUT',quantity,notes:'Ajuste ficticio DEMO'})});
  const response=await api(request(2),env,url);assert.equal(response.status,201);assert.deepEqual((await response.json()).balance,{physical:3,reserved:2,available:1});assert.equal(db.inventoryMovements.at(-1)?.values[2],'ADJUSTMENT_OUT');assert.equal((await api(request(4),env,url)).status,409);
});
test('privacy self-service stays scoped and administrative CSV exports neutralize formulas', async () => {
  const db=new LoginD1(null);db.principal={id:'usr-employee',email:'funcionario1@demo.invalid',display_name:'Funcionario',company_id:null,role:'EMPLOYEE',csrfToken:'csrf-privacy',session_id:'s'};db.exportUser={id:'usr-employee',email:'funcionario1@demo.invalid',display_name:'Funcionario',status:'ACTIVE',company_id:null,created_at:'now',updated_at:'now'};const env=loginEnv(db),headers={cookie:'celulars_demo_online_session=x','x-csrf-token':'csrf-privacy','content-type':'application/json'};
  let url=new URL('https://demo.celulars.com.br/api/privacy/requests'),response=await api(new Request(url,{method:'POST',headers,body:JSON.stringify({type:'EXPORT',notes:'Exportacao ficticia DEMO'})}),env,url);assert.equal(response.status,201);assert.equal(db.insertedPrivacyRequest?.[1],'usr-employee');url=new URL('https://demo.celulars.com.br/api/privacy/export');response=await api(new Request(url,{headers}),env,url);assert.equal(response.status,200);assert.equal((await response.json()).user.id,'usr-employee');
  db.principal={...db.principal,id:'usr-admin',role:'ADMIN'};db.adminExportRows=[{id:'usr-formula',email:'=HYPERLINK("bad")',display_name:'Teste'}];url=new URL('https://demo.celulars.com.br/api/admin/export?entity=USERS&format=CSV');response=await api(new Request(url,{headers}),env,url);assert.equal(response.status,200);assert.match(await response.text(),/"'=HYPERLINK/);
});

test('delivery processing remains MOCK and never invokes an external provider', async () => {
  const db=new LoginD1(null);db.principal={id:'usr-admin',email:'admin@demo.invalid',display_name:'Admin',company_id:null,role:'ADMIN',csrfToken:'csrf-delivery',session_id:'s'};db.pendingDeliveries=[{id:'delivery-one'},{id:'delivery-two'}];const env=loginEnv(db),url=new URL('https://demo.celulars.com.br/api/admin/deliveries/process'),headers={cookie:'celulars_demo_online_session=x','x-csrf-token':'csrf-delivery'};const response=await api(new Request(url,{method:'POST',headers}),env,url);assert.equal(response.status,200);assert.deepEqual(await response.json(),{processed:2,provider:'NOT_CONFIGURED',externalDelivery:false});assert.equal(db.simulatedDeliveries.length,2);assert.match(db.simulatedDeliveries[0][0],/^mock-/);
});
test('wholesale reports bind every commercial aggregate to the signed-in company', async () => {
  const db=new LoginD1(null);db.principal={id:'usr-wholesale',email:'atacadista@demo.invalid',display_name:'Atacadista',company_id:'company-wholesale',role:'WHOLESALE',csrfToken:'csrf-report',session_id:'s'};const env=loginEnv(db),headers={cookie:'celulars_demo_online_session=x'},url=new URL('https://demo.celulars.com.br/api/reports'),response=await api(new Request(url,{headers}),env,url),payload=await response.json();assert.equal(response.status,200);assert.equal(payload.scope,'COMPANY');assert.equal(payload.companyId,'company-wholesale');assert.equal('companies' in payload,false);const scoped=db.allCalls.filter(call=>call.sql.includes('(? IS NULL OR'));assert.ok(scoped.length>=5);for(const call of scoped)assert.deepEqual(call.values.slice(0,2),['company-wholesale','company-wholesale']);
});
test('online login locks after five failures and records safe session metadata', async () => {
  const user={id:'usr-admin',email:'admin@demo.invalid',display_name:'Admin',company_id:'',role:'ADMIN',status:'ACTIVE',password_salt:saltFixture,password_hash:hashFixture,failed_login_count:0,locked_until:null,access_expires_at:null};const db=new LoginD1(user),env=loginEnv(db),url=new URL('https://demo.celulars.com.br/api/auth/login'),request=password=>new Request(url,{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':'203.0.113.10','user-agent':'CELULARS test agent'},body:JSON.stringify({email:'admin@demo.invalid',password})});
  for(let index=0;index<5;index+=1)assert.equal((await api(request('wrong-password'),env,url)).status,401);assert.equal(db.user.failed_login_count,5);assert.ok(Date.parse(db.user.locked_until)>Date.now());assert.equal((await api(request(passwordFixture),env,url)).status,401);db.user.locked_until=new Date(Date.now()-1000).toISOString();db.user.failed_login_count=0;assert.equal((await api(request(passwordFixture),env,url)).status,200);assert.equal(db.session?.[4],'203.0.113.10');assert.equal(db.session?.[5],'CELULARS test agent');
});
test('readiness follows Wrangler d1_migrations and requires migration 010', async () => {
  const db=new LoginD1(null),env=loginEnv(db),url=new URL('https://demo.celulars.com.br/ready');db.migration={id:10,name:'010_user_management.sql'};let response=await api(new Request(url),env,url);assert.equal(response.status,200);assert.deepEqual(await response.json(),{status:'READY',database:true,latestMigration:'010_user_management.sql',administrator:false,access:'REQUIRED',providers:{email:'OPTIONAL_NOT_CONFIGURED',whatsapp:'OPTIONAL_NOT_CONFIGURED',payment:'OPTIONAL_NOT_CONFIGURED',shipment:'OPTIONAL_NOT_CONFIGURED',storage:'OPTIONAL_NOT_CONFIGURED'},production:false});db.migration={id:9,name:'009_data_governance.sql'};response=await api(new Request(url),env,url);assert.equal(response.status,503);assert.equal((await response.json()).status,'NOT_READY');
});