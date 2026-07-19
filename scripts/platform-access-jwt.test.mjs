import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { pbkdf2Sync, scryptSync } from 'node:crypto';

const cache = join(homedir(), '.cache', 'codex-wrangler-npm', '_npx');
const entry = readdirSync(cache, { recursive: true, withFileTypes: true }).find(item => item.isFile() && item.name === 'wrangler.js');
if (!entry) throw new Error('WRANGLER_CACHE_NOT_FOUND');
const outdir = mkdtempSync(join(tmpdir(), 'celulars-jwt-test-'));
const bundle = spawnSync(process.execPath, [join(entry.parentPath, entry.name), 'deploy', '--dry-run', '--outdir', outdir], { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8' });
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
    if (this.sql.startsWith('SELECT id,approval_status FROM companies')) return this.db.company?.id === this.values[0] ? { id: this.db.company.id, approval_status: this.db.company.approval_status } : null;
    if (this.sql.startsWith('SELECT id FROM companies')) return this.db.validCompany === this.values[0] ? { id: this.values[0] } : null;
    return null;
  }
  async all() { this.db.allCalls.push({ sql: this.sql, values: this.values }); return { success: true, results: [] }; }
  async run() {
    if (this.sql.startsWith('INSERT INTO sessions')) this.db.session = this.values;
    if (this.sql.startsWith('UPDATE users SET last_login_at')) this.db.updated = true;
    if (this.sql.startsWith('UPDATE notifications SET read_at=COALESCE')) this.db.markedNotification = this.values[1];
    if (this.sql.startsWith('UPDATE notifications SET read_at=?')) this.db.markedAllFor = this.values[1];
    if (this.sql.startsWith('UPDATE settings SET')) this.db.updatedSetting = this.values;
    if (this.sql.startsWith('INSERT INTO audit_events')) this.db.audit = this.values;
    if (this.sql.startsWith('INSERT INTO customers')) this.db.insertedCustomer = this.values;
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
    return { success: true, results: [] };
  }
}
class LoginD1 {
  constructor(user) { this.user = user; this.session = null; this.updated = false; this.principal = null; this.notification = null; this.markedNotification = null; this.markedAllFor = null; this.setting = null; this.updatedSetting = null; this.audit = null; this.customer = null; this.duplicateCustomer = null; this.validCompany = null; this.insertedCustomer = null; this.updatedCustomer = null; this.company = null; this.updatedCompany = null; this.approval = null; this.requestCustomer = null; this.requestRecord = null; this.validEmployee = null; this.insertedLead = null; this.insertedRequest = null; this.updatedRequestStatus = null; this.updatedLeadStatus = null; this.conversation = null; this.insertedConversation = null; this.insertedMessage = null; this.updatedConversation = null; this.allCalls = []; }
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
  assert.equal(sent.status,201);assert.equal(db.insertedMessage?.[4],'MESSAGE');assert.equal(db.updatedConversation?.[0],'OPEN');assert.equal((await sent.json()).externalDelivery,'DEMO_NOT_SENT');assert.equal(db.audit?.[2],'MESSAGE_SENT');
  db.principal={...db.principal,id:'usr-employee',role:'EMPLOYEE',company_id:null};
  const internal=await api(new Request(messagesUrl,{method:'POST',headers,body:JSON.stringify({conversationId,body:'Nota interna ficticia',messageType:'INTERNAL_NOTE'})}),env,messagesUrl);
  assert.equal(internal.status,201);assert.equal(db.insertedMessage?.[4],'INTERNAL_NOTE');
  db.principal={...db.principal,id:'usr-wholesale',role:'WHOLESALE',company_id:'other-company'};
  const foreign=await api(new Request(messagesUrl,{method:'POST',headers,body:JSON.stringify({conversationId,body:'Mensagem indevida',messageType:'MESSAGE'})}),env,messagesUrl);
  assert.equal(foreign.status,404);
});

test('accepts a correctly signed Access JWT', async () => assert.equal((await verifyAccess(request(await token()), env)).email, 'alamomalarocha@gmail.com'));
test('rejects a missing Access JWT', async () => assert.rejects(verifyAccess(request(), env), /ACCESS_TOKEN_MISSING/));
test('rejects wrong issuer', async () => assert.rejects(verifyAccess(request(await token({iss:'https://invalid.example'})), env), /ACCESS_CLAIMS_INVALID/));
test('rejects wrong audience', async () => assert.rejects(verifyAccess(request(await token({aud:['wrong']})), env), /ACCESS_CLAIMS_INVALID/));
test('rejects expired token', async () => assert.rejects(verifyAccess(request(await token({exp:1})), env), /ACCESS_TOKEN_EXPIRED/));
test('rejects a different email', async () => assert.rejects(verifyAccess(request(await token({email:'other@example.com'})), env), /ACCESS_EMAIL_DENIED/));
test('rejects an invalid signature', async () => { const other=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']); await assert.rejects(verifyAccess(request(await token({},other.privateKey)),env),/ACCESS_SIGNATURE_INVALID/); });
test.after(() => { globalThis.fetch=originalFetch; rmSync(outdir,{recursive:true,force:true}); });
