import { pbkdf2, scrypt, timingSafeEqual } from 'node:crypto';

interface D1Result<T = Record<string, unknown>> { results?: T[]; success: boolean }
interface D1PreparedStatement { bind(...values: unknown[]): D1PreparedStatement; first<T = Record<string, unknown>>(): Promise<T | null>; all<T = Record<string, unknown>>(): Promise<D1Result<T>>; run(): Promise<D1Result> }
interface D1Database { prepare(sql: string): D1PreparedStatement; batch(statements: D1PreparedStatement[]): Promise<D1Result[]> }
interface Env {
  DB: D1Database;
  ASSETS: { fetch(request: Request): Promise<Response> };
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUDIENCE: string;
  ACCESS_ALLOWED_EMAIL: string;
  SESSION_SECRET: string;
  DEMO_SEED_SECRET: string;
  PLATFORM_ENV: string;
  PLATFORM_DEMO: string;
  REAL_EMAIL_ENABLED: string;
  REAL_WHATSAPP_ENABLED: string;
  REAL_PAYMENTS_ENABLED: string;
  REAL_SHIPMENTS_ENABLED: string;
  REAL_DATA_IMPORT_ENABLED: string;
  PUBLIC_SIGNUP_ENABLED: string;
  PRODUCTION_MODE: string;
}

type Principal = { id: string; email: string; display_name: string; company_id: string | null; role: string; csrfToken: string };
type AccessClaims = { aud?: string | string[]; email?: string; exp?: number; iss?: string; sub?: string };

const encoder = new TextEncoder();
const DEMO_BANNER = 'AMBIENTE DE DEMONSTRAÇÃO — DADOS FICTÍCIOS — SEM TRANSAÇÕES REAIS';
let keyCache: { expires: number; keys: JsonWebKey[] } | undefined;

type SettingDefinition = { type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON'; label: string; validate(value: string): boolean };
const settingDefinitions: Record<string, SettingDefinition> = {
  operation_name: { type: 'STRING', label: 'Nome da plataforma', validate: value => value.length >= 3 && value.length <= 80 },
  currency: { type: 'STRING', label: 'Moeda principal', validate: value => ['USD', 'BRL'].includes(value) },
  brazil_cpo_shipping: { type: 'NUMBER', label: 'Envio CPO para o Brasil (USD)', validate: value => Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 100_000 },
  brazil_new_shipping: { type: 'NUMBER', label: 'Envio Novo para o Brasil (USD)', validate: value => Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 100_000 },
  reservation_minutes: { type: 'NUMBER', label: 'Duração da reserva (minutos)', validate: value => Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= 100_000 },
  low_stock_threshold: { type: 'NUMBER', label: 'Limite de estoque baixo', validate: value => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 100_000 },
  default_language: { type: 'STRING', label: 'Idioma padrão', validate: value => /^[a-z]{2}-[A-Z]{2}$/.test(value) },
  notification_templates: { type: 'JSON', label: 'Templates internos', validate: value => { try { const parsed = JSON.parse(value); return Boolean(parsed) && typeof parsed === 'object' && !Array.isArray(parsed); } catch { return false; } } },
  default_order_status: { type: 'STRING', label: 'Status padrão do pedido', validate: value => value === 'DRAFT' },
  quote_sequence_prefix: { type: 'STRING', label: 'Prefixo de cotação', validate: value => /^[A-Z0-9-]{2,20}$/.test(value) },
  order_sequence_prefix: { type: 'STRING', label: 'Prefixo de pedido', validate: value => /^[A-Z0-9-]{2,20}$/.test(value) },
  notifications_enabled: { type: 'BOOLEAN', label: 'Notificações internas', validate: value => ['true', 'false'].includes(value) },
  demo_mode: { type: 'BOOLEAN', label: 'Modo DEMO', validate: value => value === 'true' }
};

const requestLeadTypes = new Set(['RETAIL','WHOLESALE','PRODUCT','PRICE','PICKUP','SHIPPING','SUPPORT']);
const requestPriorities = new Set(['LOW','NORMAL','HIGH','URGENT']);
const requestTransitions: Record<string,string[]> = {
  NEW:['ASSIGNED','IN_PROGRESS','CLOSED'], ASSIGNED:['IN_PROGRESS','WAITING_CUSTOMER','CLOSED'],
  IN_PROGRESS:['WAITING_CUSTOMER','RESOLVED','CLOSED'], WAITING_CUSTOMER:['IN_PROGRESS','RESOLVED','CLOSED'],
  RESOLVED:['CLOSED','IN_PROGRESS'], CLOSED:[]
};

const quoteTransitions: Record<string,string[]> = {
  DRAFT:['SENT','EXPIRED'], SENT:['VIEWED','ACCEPTED','REJECTED','EXPIRED'],
  VIEWED:['ACCEPTED','REJECTED','EXPIRED'], ACCEPTED:['CONVERTED'], REJECTED:[], EXPIRED:[], CONVERTED:[]
};
const quoteDeliveryMethods: Record<string,string> = { PICKUP_MIAMI:'MIAMI_PICKUP',DOMESTIC_US:'US_DOMESTIC',BRAZIL_COURIER:'BRAZIL_CARRIER',WHOLESALE_CARRIER:'WHOLESALE_CARRIER' };
function demoReference(prefix:string):string { return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0,5).toUpperCase()}`; }

function customerValues(input: Record<string, unknown>): { name: string; email: string; country: string; language: string; source: string; status: string; notes: string; companyId: string | null } | null {
  const value = {
    name: String(input.name ?? '').trim().slice(0, 120),
    email: String(input.email ?? '').trim().toLowerCase().slice(0, 180),
    country: String(input.country ?? '').trim().toUpperCase().slice(0, 2),
    language: String(input.language ?? '').trim().slice(0, 12),
    source: String(input.source ?? '').trim().slice(0, 80),
    status: String(input.status ?? '').trim().toUpperCase(),
    notes: String(input.notes ?? '').trim().slice(0, 1000),
    companyId: typeof input.companyId === 'string' && input.companyId.trim() ? input.companyId.trim() : null
  };
  return value.name.length >= 2 && /^[^@\s]+@[^@\s]+$/.test(value.email) && value.country.length === 2 && value.language.length >= 2 && value.source.length >= 2 && ['LEAD','ACTIVE','INACTIVE'].includes(value.status) && value.notes.length >= 3 ? value : null;
}

function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
}

function publicUser(user: Principal): object {
  return { id: user.id, email: user.email, displayName: user.display_name, companyId: user.company_id, roles: [user.role], permissions: user.role === 'ADMIN' ? ['companies.approve'] : [], csrfToken: user.csrfToken };
}

function base64url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(normalized), c => c.charCodeAt(0));
}

function decodePart<T>(part: string): T { return JSON.parse(new TextDecoder().decode(base64url(part))) as T; }

async function accessKeys(env: Env): Promise<JsonWebKey[]> {
  if (keyCache && keyCache.expires > Date.now()) return keyCache.keys;
  const response = await fetch(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`, { cf: { cacheTtl: 300 } } as RequestInit);
  if (!response.ok) throw new Error('ACCESS_CERTS_UNAVAILABLE');
  const payload = await response.json() as { keys?: JsonWebKey[] };
  if (!payload.keys?.length) throw new Error('ACCESS_CERTS_INVALID');
  keyCache = { keys: payload.keys, expires: Date.now() + 300_000 };
  return payload.keys;
}

async function verifyAccess(request: Request, env: Env): Promise<AccessClaims> {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) throw new Error('ACCESS_TOKEN_MISSING');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('ACCESS_TOKEN_INVALID');
  const header = decodePart<{ alg?: string; kid?: string }>(parts[0]);
  const claims = decodePart<AccessClaims>(parts[1]);
  if (header.alg !== 'RS256' || !header.kid) throw new Error('ACCESS_ALGORITHM_INVALID');
  const expectedIssuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== expectedIssuer || !audience.includes(env.ACCESS_AUDIENCE)) throw new Error('ACCESS_CLAIMS_INVALID');
  if (!claims.exp || claims.exp <= Math.floor(Date.now() / 1000)) throw new Error('ACCESS_TOKEN_EXPIRED');
  if (claims.email?.toLowerCase() !== env.ACCESS_ALLOWED_EMAIL.toLowerCase()) throw new Error('ACCESS_EMAIL_DENIED');
  const jwk = (await accessKeys(env)).find(key => key.kid === header.kid);
  if (!jwk) throw new Error('ACCESS_KEY_UNKNOWN');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64url(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`));
  if (!ok) throw new Error('ACCESS_SIGNATURE_INVALID');
  return claims;
}

async function digest(value: string): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))].map(v => v.toString(16).padStart(2, '0')).join('');
}

function cookies(request: Request): Record<string, string> {
  return Object.fromEntries((request.headers.get('cookie') ?? '').split(';').map(v => v.trim()).filter(Boolean).map(v => { const i = v.indexOf('='); return [v.slice(0, i), decodeURIComponent(v.slice(i + 1))]; }));
}

async function principal(request: Request, env: Env): Promise<Principal | null> {
  const token = cookies(request).celulars_demo_online_session;
  if (!token) return null;
  const row = await env.DB.prepare(`SELECT u.id,u.email,u.display_name,u.company_id,r.code role,s.csrf_secret csrfToken
    FROM sessions s JOIN users u ON u.id=s.user_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
    WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND u.status='ACTIVE' LIMIT 1`).bind(await digest(`${token}:${env.SESSION_SECRET}`), new Date().toISOString()).first<Principal>();
  return row;
}

function requireCsrf(request: Request, user: Principal): void {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers.get('x-csrf-token') !== user.csrfToken) throw new Error('CSRF_INVALID');
}

async function body(request: Request): Promise<Record<string, unknown>> {
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) throw new Error('JSON_REQUIRED');
  return await request.json() as Record<string, unknown>;
}

const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 32;
const SCRYPT_PARAMETERS = `N=${SCRYPT_COST},r=${SCRYPT_BLOCK_SIZE},p=${SCRYPT_PARALLELIZATION},l=${SCRYPT_KEY_LENGTH}`;

function validPasswordSalt(value: string): boolean { return /^[A-Za-z0-9_-]{22,128}$/.test(value); }

async function scryptKey(password: string, salt: string, cost = SCRYPT_COST): Promise<Uint8Array> {
  return await new Promise<Uint8Array>((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEY_LENGTH, { N: cost, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELIZATION, maxmem: 64 * 1024 * 1024 }, (error, derived) => error ? reject(error) : resolve(derived));
  });
}

async function verifyPassword(password: string, salt: string, stored: string, iterations = 210_000): Promise<boolean> {
  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    if (parts.length !== 5 || parts[0] !== 'scrypt' || parts[1] !== 'v1' || parts[2] !== SCRYPT_PARAMETERS || parts[3] !== salt || !validPasswordSalt(salt) || !/^[a-f0-9]{64}$/i.test(parts[4] ?? '')) return false;
    const actual = await scryptKey(password, salt);
    const expected = Buffer.from(parts[4], 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 1_000_000) return false;
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(salt) || !/^[a-f0-9]{64}$/i.test(stored)) return false;
  const actual = await new Promise<Uint8Array>((resolve, reject) => {
    pbkdf2(password, salt, iterations, 32, 'sha256', (error, derived) => error ? reject(error) : resolve(derived));
  });
  const expected = Buffer.from(stored, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function list<T>(env: Env, sql: string, ...args: unknown[]): Promise<T[]> { return (await env.DB.prepare(sql).bind(...args).all<T>()).results ?? []; }

async function api(request: Request, env: Env, url: URL): Promise<Response> {
  if (url.pathname === '/health' && request.method === 'GET') return json({ status: 'UP', environment: env.PLATFORM_ENV, demo: true, banner: DEMO_BANNER });
  if (url.pathname === '/ready' && request.method === 'GET') {
    const migration = await env.DB.prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1').first<{ version: string }>();
    return json({ status: migration ? 'READY' : 'NOT_READY', database: Boolean(migration), latestMigration: migration?.version, providers: { email: 'MOCK', whatsapp: 'MOCK', payment: 'MOCK', shipment: 'MOCK', storage: 'MOCK' }, production: false }, migration ? 200 : 503);
  }
  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    const input = await body(request); const email = String(input.email ?? '').trim().toLowerCase(); const password = String(input.password ?? '');
    const row = await env.DB.prepare(`SELECT u.*,r.code role FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE lower(u.email)=? LIMIT 1`).bind(email).first<Record<string, string>>();
    if (!row || row.status !== 'ACTIVE' || !await verifyPassword(password, row.password_salt, row.password_hash)) return json({ error: 'INVALID_CREDENTIALS' }, 401);
    const token = crypto.randomUUID() + crypto.randomUUID(); const csrf = crypto.randomUUID(); const now = new Date(); const expiry = new Date(now.getTime() + 8 * 3600_000).toISOString();
    await env.DB.prepare('INSERT INTO sessions(id,user_id,token_hash,csrf_secret,expires_at,created_at,rotated_at) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(), row.id, await digest(`${token}:${env.SESSION_SECRET}`), csrf, expiry, now.toISOString(), now.toISOString()).run();
    await env.DB.prepare('UPDATE users SET last_login_at=?,failed_login_count=0,updated_at=? WHERE id=?').bind(now.toISOString(), now.toISOString(), row.id).run();
    return json({ user: publicUser({ id: row.id, email: row.email, display_name: row.display_name, company_id: row.company_id || null, role: row.role, csrfToken: csrf }), banner: DEMO_BANNER }, 200, { 'set-cookie': `celulars_demo_online_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800` });
  }
  const user = await principal(request, env);
  if (!user) return json({ error: 'AUTHENTICATION_REQUIRED' }, 401);
  requireCsrf(request, user);
  if (url.pathname === '/api/auth/me' && request.method === 'GET') return json({ user: publicUser(user), banner: DEMO_BANNER });
  if (url.pathname === '/api/auth/logout' && request.method === 'POST') return json({ ok: true }, 200, { 'set-cookie': 'celulars_demo_online_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' });
  if (url.pathname === '/api/dashboard' && request.method === 'GET') {
    const counts = await env.DB.prepare(`SELECT (SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL) customers,(SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL) companies,(SELECT COUNT(*) FROM requests) requests,(SELECT COUNT(*) FROM orders) orders,(SELECT COUNT(*) FROM notifications WHERE user_id=? AND read_at IS NULL) unreadNotifications`).bind(user.id).first();
    const productCount = await env.DB.prepare('SELECT COUNT(*) total FROM products WHERE demo_active=1').first<{ total: number }>();
    return json({ user: publicUser(user), metrics: { products: Number(productCount?.total ?? 0), unreadNotifications: Number((counts as { unreadNotifications?: number } | null)?.unreadNotifications ?? 0), openRequests: Number((counts as { requests?: number } | null)?.requests ?? 0), activeOrders: Number((counts as { orders?: number } | null)?.orders ?? 0) }, profile: user.role, recent: [], environment: 'DEMO_ONLINE', banner: DEMO_BANNER });
  }
  if (url.pathname === '/api/notifications' && request.method === 'GET') { const notifications=await list<Record<string,unknown>>(env,'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100',user.id); return json({notifications,unread:notifications.filter(row=>!row.read_at).length}); }
  const notificationRead = url.pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
  if (notificationRead?.[1] && request.method === 'POST') {
    const id = decodeURIComponent(notificationRead[1]);
    const notification = await env.DB.prepare('SELECT id FROM notifications WHERE id=? AND user_id=? LIMIT 1').bind(id, user.id).first<{ id: string }>();
    if (!notification) return json({ error: 'NOT_FOUND' }, 404);
    await env.DB.prepare('UPDATE notifications SET read_at=COALESCE(read_at,?) WHERE id=? AND user_id=?').bind(new Date().toISOString(), id, user.id).run();
    return json({ ok: true, id });
  }
  if (url.pathname === '/api/notifications/read-all' && request.method === 'POST') {
    await env.DB.prepare('UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL').bind(new Date().toISOString(), user.id).run();
    return json({ ok: true });
  }
  if (url.pathname === '/api/audit' && request.method === 'GET') return json({ events: user.role === 'ADMIN' ? await list(env, 'SELECT a.*,u.display_name actor_name FROM audit_events a LEFT JOIN users u ON u.id=a.actor_user_id ORDER BY a.created_at DESC LIMIT 200') : await list(env, 'SELECT a.*,u.display_name actor_name FROM audit_events a LEFT JOIN users u ON u.id=a.actor_user_id WHERE a.actor_user_id=? ORDER BY a.created_at DESC LIMIT 100',user.id), limited:user.role!=='ADMIN' });
  if (url.pathname === '/api/catalog/products' && request.method === 'GET') return json({ products: await list<Record<string, unknown>>(env, `SELECT p.id,p.model_name,p.year,p.product_type,COUNT(v.id) variant_count,json_group_array(DISTINCT v.capacity) capacities,json_group_array(DISTINCT v.color) colors FROM products p JOIN product_variants v ON v.product_id=p.id WHERE p.demo_active=1 AND v.active=1 GROUP BY p.id ORDER BY p.model_name`).then(rows => rows.map(item => ({ ...item, capacities: JSON.parse(String(item.capacities)), colors: JSON.parse(String(item.colors)) }))) });
  if (url.pathname === '/api/price-lists' && request.method === 'GET') return json({ lists: await list(env, `SELECT * FROM price_lists WHERE status='ACTIVE' ORDER BY name`) });
  if (url.pathname === '/api/prices' && request.method === 'GET') return json({ prices: await list(env, `SELECT pr.*,pl.name list_name,v.capacity,v.color,p.model_name,p.product_type FROM prices pr JOIN price_lists pl ON pl.id=pr.price_list_id JOIN product_variants v ON v.id=pr.variant_id JOIN products p ON p.id=v.product_id WHERE pr.valid_until IS NULL ORDER BY p.model_name`), readOnly: user.role === 'WHOLESALE' });
  if (url.pathname === '/api/inventory' && request.method === 'GET') return json({ inventory: await list(env, `SELECT i.*,v.capacity,v.color,p.model_name,p.product_type,COALESCE(SUM(m.physical_delta),0) physical_quantity,COALESCE(SUM(m.reserved_delta),0) reserved_quantity,COALESCE(SUM(m.physical_delta+m.reserved_delta),0) available_quantity FROM inventory_items i JOIN product_variants v ON v.id=i.variant_id JOIN products p ON p.id=v.product_id LEFT JOIN inventory_movements m ON m.inventory_item_id=i.id GROUP BY i.id ORDER BY p.model_name`) });
  if (url.pathname === '/api/customers' && request.method === 'GET') return json({ customers: user.role === 'WHOLESALE' ? [] : await list(env, 'SELECT * FROM customers WHERE deleted_at IS NULL ORDER BY updated_at DESC,name LIMIT 200'), environment: 'DEMO_ONLINE' });
  if (url.pathname === '/api/customers' && request.method === 'POST') {
    if (user.role === 'WHOLESALE') return json({ error: 'FORBIDDEN' }, 403);
    const value = customerValues(await body(request));
    if (!value) return json({ error: 'INVALID_CUSTOMER' }, 400);
    if (await env.DB.prepare('SELECT id FROM customers WHERE email=? LIMIT 1').bind(value.email).first()) return json({ error: 'CUSTOMER_EXISTS' }, 409);
    if (value.companyId && !await env.DB.prepare('SELECT id FROM companies WHERE id=? AND deleted_at IS NULL LIMIT 1').bind(value.companyId).first()) return json({ error: 'INVALID_CUSTOMER' }, 400);
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO customers(id,name,email,phone_demo,country,language,source,status,notes,assigned_user_id,company_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,value.name,value.email,`DEMO-PHONE-${id.slice(0,8)}`,value.country,value.language,value.source,value.status,value.notes,user.id,value.companyId,now,now),
      env.DB.prepare('INSERT INTO audit_events(id,actor_user_id,action,entity_type,entity_id,after_json,ip_address,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,'CREATE','CUSTOMER',id,JSON.stringify(value),request.headers.get('cf-connecting-ip')??'CLOUDFLARE',(request.headers.get('user-agent')??'unknown').slice(0,500),now)
    ]);
    return json({ id, ...value, actor: user.id }, 201);
  }
  const customerRoute = url.pathname.match(/^\/api\/customers\/([^/]+)$/);
  if (customerRoute?.[1] && request.method === 'PATCH') {
    if (user.role === 'WHOLESALE') return json({ error: 'FORBIDDEN' }, 403);
    const id = decodeURIComponent(customerRoute[1]);
    const value = customerValues(await body(request));
    if (!value) return json({ error: 'INVALID_CUSTOMER' }, 400);
    const current = await env.DB.prepare('SELECT name,email,country,language,source,status,notes,company_id FROM customers WHERE id=? AND deleted_at IS NULL LIMIT 1').bind(id).first<Record<string, unknown>>();
    if (!current) return json({ error: 'CUSTOMER_NOT_FOUND' }, 404);
    if (await env.DB.prepare('SELECT id FROM customers WHERE email=? AND id<>? LIMIT 1').bind(value.email,id).first()) return json({ error: 'CUSTOMER_EXISTS' }, 409);
    if (value.companyId && !await env.DB.prepare('SELECT id FROM companies WHERE id=? AND deleted_at IS NULL LIMIT 1').bind(value.companyId).first()) return json({ error: 'INVALID_CUSTOMER' }, 400);
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare('UPDATE customers SET name=?,email=?,country=?,language=?,source=?,status=?,notes=?,company_id=?,assigned_user_id=?,updated_at=? WHERE id=?').bind(value.name,value.email,value.country,value.language,value.source,value.status,value.notes,value.companyId,user.id,now,id),
      env.DB.prepare('INSERT INTO audit_events(id,actor_user_id,action,entity_type,entity_id,before_json,after_json,ip_address,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,'UPDATE','CUSTOMER',id,JSON.stringify(current),JSON.stringify(value),request.headers.get('cf-connecting-ip')??'CLOUDFLARE',(request.headers.get('user-agent')??'unknown').slice(0,500),now)
    ]);
    return json({ id, ...value, actor: user.id });
  }
  if (url.pathname === '/api/companies' && request.method === 'GET') {
    const scope = user.role === 'WHOLESALE' ? user.company_id : null;
    if (user.role === 'WHOLESALE' && !scope) return json({ error: 'FORBIDDEN' }, 403);
    return json({
      companies: await list(env, `SELECT c.id,c.name,c.company_type,c.country,c.demo_identifier,c.contact_name,c.contact_email,c.approval_status,c.classification,c.price_list_id,pl.name price_list_name,c.carrier_name,c.created_at,c.updated_at,COUNT(DISTINCT d.id) document_count,COUNT(DISTINCT u.id) user_count FROM companies c LEFT JOIN price_lists pl ON pl.id=c.price_list_id LEFT JOIN company_documents d ON d.company_id=c.id LEFT JOIN users u ON u.company_id=c.id WHERE c.deleted_at IS NULL AND (? IS NULL OR c.id=?) GROUP BY c.id ORDER BY c.company_type,c.name`, scope, scope),
      documents: await list(env, 'SELECT id,company_id,file_name,mime_type,status,created_at FROM company_documents WHERE (? IS NULL OR company_id=?) ORDER BY created_at DESC', scope, scope),
      approvals: user.role === 'WHOLESALE' ? [] : await list(env, 'SELECT a.id,a.company_id,a.from_status,a.to_status,a.notes,a.actor_user_id,u.display_name actor_name,a.created_at FROM approvals a JOIN users u ON u.id=a.actor_user_id ORDER BY a.created_at DESC LIMIT 100'),
      readOnly: user.role === 'WHOLESALE', environment: 'DEMO_ONLINE'
    });
  }
  const companyApproval = url.pathname.match(/^\/api\/companies\/([^/]+)\/approval$/);
  if (companyApproval?.[1] && request.method === 'POST') {
    if (user.role !== 'ADMIN') return json({ error: 'FORBIDDEN' }, 403);
    const companyId = decodeURIComponent(companyApproval[1]);
    const input = await body(request);
    const status = String(input.status ?? '').trim().toUpperCase();
    const notes = String(input.notes ?? '').trim().slice(0,1000);
    if (!status || notes.length < 3) return json({ error: 'INVALID_COMPANY_APPROVAL' }, 400);
    const company = await env.DB.prepare('SELECT id,approval_status FROM companies WHERE id=? AND deleted_at IS NULL LIMIT 1').bind(companyId).first<{ id:string; approval_status:string }>();
    if (!company) return json({ error: 'COMPANY_NOT_FOUND' }, 404);
    const transitions: Record<string,string[]> = { DRAFT:['SUBMITTED'], SUBMITTED:['UNDER_REVIEW'], UNDER_REVIEW:['APPROVED','REJECTED'], APPROVED:['SUSPENDED'], REJECTED:['SUBMITTED'], SUSPENDED:['UNDER_REVIEW'] };
    if (!(transitions[company.approval_status] ?? []).includes(status)) return json({ error: 'INVALID_COMPANY_APPROVAL' }, 409);
    const id=crypto.randomUUID(); const now=new Date().toISOString();
    const result={id,companyId,fromStatus:company.approval_status,toStatus:status,notes,actor:user.id,createdAt:now};
    await env.DB.batch([
      env.DB.prepare('UPDATE companies SET approval_status=?,updated_at=? WHERE id=?').bind(status,now,companyId),
      env.DB.prepare('INSERT INTO approvals(id,company_id,from_status,to_status,notes,actor_user_id,created_at) VALUES(?,?,?,?,?,?,?)').bind(id,companyId,company.approval_status,status,notes,user.id,now),
      env.DB.prepare('INSERT INTO audit_events(id,actor_user_id,action,entity_type,entity_id,before_json,after_json,ip_address,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,'COMPANY_APPROVAL','COMPANY',companyId,JSON.stringify({approvalStatus:company.approval_status}),JSON.stringify({approvalStatus:status,notes}),request.headers.get('cf-connecting-ip')??'CLOUDFLARE',(request.headers.get('user-agent')??'unknown').slice(0,500),now)
    ]);
    return json(result);
  }
  if (url.pathname === '/api/requests' && request.method === 'GET') {
    const scope = user.role === 'WHOLESALE' ? user.company_id : null;
    if (user.role === 'WHOLESALE' && !scope) return json({ error: 'FORBIDDEN' }, 403);
    return json({
      requests: await list(env, `SELECT r.id,r.title,r.description,r.status,r.created_by_user_id,r.assigned_user_id,l.id lead_id,l.lead_type,l.priority,l.company_id,l.customer_id,l.tags_json,l.internal_notes,c.name customer_name,co.name company_name,u.display_name assigned_name,r.created_at,r.updated_at FROM requests r JOIN leads l ON l.id=r.lead_id LEFT JOIN customers c ON c.id=l.customer_id LEFT JOIN companies co ON co.id=l.company_id LEFT JOIN users u ON u.id=r.assigned_user_id WHERE (? IS NULL OR l.company_id=?) ORDER BY r.updated_at DESC LIMIT 200`, scope, scope),
      employees: scope ? [] : await list(env, `SELECT DISTINCT u.id,u.display_name FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles ro ON ro.id=ur.role_id WHERE ro.code IN ('ADMIN','EMPLOYEE') AND u.status='ACTIVE' ORDER BY u.display_name`),
      readOnlyStatus: Boolean(scope), environment: 'DEMO_ONLINE'
    });
  }
  if (url.pathname === '/api/requests' && request.method === 'POST') {
    const input=await body(request); const title=String(input.title??'').trim().slice(0,160); const description=String(input.description??'').trim().slice(0,2000); const leadType=String(input.leadType??'').trim().toUpperCase(); const priority=String(input.priority??'').trim().toUpperCase(); const customerId=typeof input.customerId==='string'&&input.customerId.trim()?input.customerId.trim():null; const companyId=user.role==='WHOLESALE'?user.company_id:null;
    if (user.role==='WHOLESALE'&&!companyId) return json({error:'FORBIDDEN'},403);
    if (title.length<3||description.length<3||!requestLeadTypes.has(leadType)||!requestPriorities.has(priority)) return json({error:'INVALID_REQUEST'},400);
    if (customerId) { const customer=await env.DB.prepare('SELECT id,company_id FROM customers WHERE id=? AND deleted_at IS NULL LIMIT 1').bind(customerId).first<{id:string;company_id:string|null}>(); if (!customer||(companyId&&customer.company_id!==companyId)) return json({error:'INVALID_REQUEST'},400); }
    const leadId=crypto.randomUUID(), id=crypto.randomUUID(), now=new Date().toISOString(); const result={id,leadId,title,status:'NEW',companyId,actor:user.id};
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO leads(id,customer_id,company_id,lead_type,status,priority,tags_json,assigned_user_id,internal_notes,created_at,updated_at) VALUES(?,?,?,?,'NEW',?,'["DEMO"]',NULL,'Solicitacao criada no ambiente DEMO.',?,?)`).bind(leadId,customerId,companyId,leadType,priority,now,now),
      env.DB.prepare(`INSERT INTO requests(id,lead_id,title,description,status,created_by_user_id,assigned_user_id,created_at,updated_at) VALUES(?,?,?,?,'NEW',?,NULL,?,?)`).bind(id,leadId,title,description,user.id,now,now),
      env.DB.prepare('INSERT INTO audit_events(id,actor_user_id,action,entity_type,entity_id,after_json,ip_address,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,'CREATE','REQUEST',id,JSON.stringify(result),request.headers.get('cf-connecting-ip')??'CLOUDFLARE',(request.headers.get('user-agent')??'unknown').slice(0,500),now)
    ]);
    return json(result,201);
  }
  const requestStatusRoute=url.pathname.match(/^\/api\/requests\/([^/]+)\/status$/);
  if (requestStatusRoute?.[1]&&request.method==='POST') {
    if (user.role==='WHOLESALE') return json({error:'FORBIDDEN'},403);
    const id=decodeURIComponent(requestStatusRoute[1]); const input=await body(request); const status=String(input.status??'').trim().toUpperCase(); const assignedUserId=typeof input.assignedUserId==='string'&&input.assignedUserId.trim()?input.assignedUserId.trim():null;
    const current=await env.DB.prepare('SELECT id,lead_id,status,assigned_user_id FROM requests WHERE id=? LIMIT 1').bind(id).first<{id:string;lead_id:string;status:string;assigned_user_id:string|null}>();
    if (!current) return json({error:'REQUEST_NOT_FOUND'},404);
    if (!(requestTransitions[current.status]??[]).includes(status)) return json({error:'INVALID_REQUEST_STATUS'},409);
    if (assignedUserId&&!await env.DB.prepare(`SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE u.id=? AND r.code IN ('ADMIN','EMPLOYEE') AND u.status='ACTIVE' LIMIT 1`).bind(assignedUserId).first()) return json({error:'INVALID_REQUEST_STATUS'},400);
    const now=new Date().toISOString(); const result={id,fromStatus:current.status,toStatus:status,assignedUserId,actor:user.id};
    await env.DB.batch([
      env.DB.prepare('UPDATE requests SET status=?,assigned_user_id=COALESCE(?,assigned_user_id),updated_at=? WHERE id=?').bind(status,assignedUserId,now,id),
      env.DB.prepare('UPDATE leads SET status=?,assigned_user_id=COALESCE(?,assigned_user_id),updated_at=? WHERE id=?').bind(status,assignedUserId,now,current.lead_id),
      env.DB.prepare('INSERT INTO audit_events(id,actor_user_id,action,entity_type,entity_id,before_json,after_json,ip_address,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,'UPDATE','REQUEST',id,JSON.stringify({status:current.status,assignedUserId:current.assigned_user_id}),JSON.stringify(result),request.headers.get('cf-connecting-ip')??'CLOUDFLARE',(request.headers.get('user-agent')??'unknown').slice(0,500),now)
    ]);
    return json(result);
  }
  if (url.pathname === '/api/conversations' && request.method === 'GET') {
    const scope=user.role==='WHOLESALE'?user.company_id:null;
    if(user.role==='WHOLESALE'&&!scope) return json({error:'FORBIDDEN'},403);
    return json({
      conversations:await list(env,`SELECT c.id,c.company_id,c.customer_id,c.subject,c.status,c.assigned_user_id,co.name company_name,cu.name customer_name,u.display_name assigned_name,c.created_at,c.updated_at,COUNT(m.id) message_count FROM conversations c LEFT JOIN companies co ON co.id=c.company_id LEFT JOIN customers cu ON cu.id=c.customer_id LEFT JOIN users u ON u.id=c.assigned_user_id LEFT JOIN messages m ON m.conversation_id=c.id WHERE (? IS NULL OR c.company_id=?) GROUP BY c.id ORDER BY c.updated_at DESC LIMIT 100`,scope,scope),
      messages:await list(env,`SELECT m.id,m.conversation_id,m.sender_user_id,u.display_name sender_name,m.body,m.message_type,m.external_delivery,m.created_at FROM messages m JOIN conversations c ON c.id=m.conversation_id LEFT JOIN users u ON u.id=m.sender_user_id WHERE (? IS NULL OR c.company_id=?) AND (?=0 OR m.message_type<>'INTERNAL_NOTE') ORDER BY m.created_at DESC LIMIT 300`,scope,scope,scope?1:0),
      templates:await list(env,'SELECT id,name,body FROM message_templates WHERE active=1 ORDER BY name'),
      allowInternalNotes:!scope, environment:'DEMO_ONLINE'
    });
  }
  if(url.pathname==='/api/conversations'&&request.method==='POST') {
    const input=await body(request); const subject=String(input.subject??'').trim().slice(0,180); const customerId=typeof input.customerId==='string'&&input.customerId.trim()?input.customerId.trim():null; const companyId=user.role==='WHOLESALE'?user.company_id:null;
    if(user.role==='WHOLESALE'&&!companyId) return json({error:'FORBIDDEN'},403);
    if(subject.length<3) return json({error:'INVALID_CONVERSATION'},400);
    if(customerId){const customer=await env.DB.prepare('SELECT id,company_id FROM customers WHERE id=? AND deleted_at IS NULL LIMIT 1').bind(customerId).first<{id:string;company_id:string|null}>();if(!customer||(companyId&&customer.company_id!==companyId))return json({error:'INVALID_CONVERSATION'},400);}
    const id=crypto.randomUUID(),now=new Date().toISOString();const result={id,companyId,customerId,subject,status:'OPEN',actor:user.id};
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO conversations(id,company_id,customer_id,subject,status,assigned_user_id,created_at,updated_at) VALUES(?,?,?,?,'OPEN',NULL,?,?)`).bind(id,companyId,customerId,subject,now,now),
      env.DB.prepare('INSERT INTO audit_events(id,actor_user_id,action,entity_type,entity_id,after_json,ip_address,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,'CREATE','CONVERSATION',id,JSON.stringify(result),request.headers.get('cf-connecting-ip')??'CLOUDFLARE',(request.headers.get('user-agent')??'unknown').slice(0,500),now)
    ]);
    return json(result,201);
  }
  if(url.pathname==='/api/messages'&&request.method==='POST') {
    const input=await body(request);const conversationId=String(input.conversationId??'').trim();const messageBody=String(input.body??'').trim().slice(0,4000);const messageType=String(input.messageType??'MESSAGE').trim().toUpperCase();const scope=user.role==='WHOLESALE'?user.company_id:null;
    if(user.role==='WHOLESALE'&&!scope) return json({error:'FORBIDDEN'},403);
    if(scope&&messageType==='INTERNAL_NOTE') return json({error:'FORBIDDEN'},403);
    if(!conversationId||!messageBody||!['MESSAGE','INTERNAL_NOTE','TEMPLATE'].includes(messageType)) return json({error:'INVALID_MESSAGE'},400);
    const conversation=await env.DB.prepare('SELECT id,company_id FROM conversations WHERE id=? LIMIT 1').bind(conversationId).first<{id:string;company_id:string|null}>();
    if(!conversation||(scope&&conversation.company_id!==scope)) return json({error:'CONVERSATION_NOT_FOUND'},404);
    const id=crypto.randomUUID(),now=new Date().toISOString();const result={id,conversationId,body:messageBody,messageType,externalDelivery:'DEMO_NOT_SENT',actor:user.id};
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO messages(id,conversation_id,sender_user_id,body,message_type,external_delivery,created_at) VALUES(?,?,?,?,?,'DEMO_NOT_SENT',?)`).bind(id,conversationId,user.id,messageBody,messageType,now),
      env.DB.prepare('UPDATE conversations SET status=?,updated_at=? WHERE id=?').bind('OPEN',now,conversationId),
      env.DB.prepare('INSERT INTO audit_events(id,actor_user_id,action,entity_type,entity_id,after_json,ip_address,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,'MESSAGE_SENT','MESSAGE',id,JSON.stringify({id,conversationId,messageType,externalDelivery:'DEMO_NOT_SENT'}),request.headers.get('cf-connecting-ip')??'CLOUDFLARE',(request.headers.get('user-agent')??'unknown').slice(0,500),now)
    ]);
    return json(result,201);
  }
  if (url.pathname === '/api/quotes' && request.method === 'GET') {
    const scope=user.role==='WHOLESALE'?user.company_id:null;if(user.role==='WHOLESALE'&&!scope)return json({error:'FORBIDDEN'},403);const now=new Date().toISOString();
    await env.DB.prepare(`UPDATE quotes SET status='EXPIRED',updated_at=? WHERE status IN ('DRAFT','SENT','VIEWED') AND expires_at<=?`).bind(now,now).run();
    return json({
      quotes:await list(env,`SELECT q.id,q.quote_number,q.company_id,q.customer_id,q.status,q.currency,q.discount_cents,q.notes,q.expires_at,q.created_at,q.updated_at,co.name company_name,cu.name customer_name,u.display_name created_by_name,COALESCE(SUM(qi.quantity*qi.unit_price_cents-qi.discount_cents),0)-q.discount_cents total_cents FROM quotes q LEFT JOIN companies co ON co.id=q.company_id LEFT JOIN customers cu ON cu.id=q.customer_id LEFT JOIN users u ON u.id=q.created_by_user_id LEFT JOIN quote_items qi ON qi.quote_id=q.id WHERE (? IS NULL OR q.company_id=?) GROUP BY q.id ORDER BY q.updated_at DESC LIMIT 150`,scope,scope),
      items:await list(env,`SELECT qi.id,qi.quote_id,qi.variant_id,qi.quantity,qi.unit_price_cents,qi.discount_cents,qi.notes,p.model_name,p.product_type,v.capacity,v.color,v.sku_demo FROM quote_items qi JOIN quotes q ON q.id=qi.quote_id JOIN product_variants v ON v.id=qi.variant_id JOIN products p ON p.id=v.product_id WHERE (? IS NULL OR q.company_id=?) ORDER BY q.quote_number,p.model_name`,scope,scope),
      variants:await list(env,`SELECT v.id,p.model_name,p.product_type,v.capacity,v.color,v.sku_demo FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.active=1 AND p.demo_active=1 ORDER BY p.year DESC,p.model_name,v.capacity,v.color LIMIT 500`),
      companies:scope?[]:await list(env,`SELECT id,name,approval_status,price_list_id FROM companies WHERE company_type='WHOLESALE' AND deleted_at IS NULL ORDER BY name`),
      scopedCompanyId:scope,readOnlyInternalWorkflow:Boolean(scope),environment:'DEMO_ONLINE'
    });
  }
  if(url.pathname==='/api/quotes'&&request.method==='POST') {
    const input=await body(request);const scope=user.role==='WHOLESALE'?user.company_id:null;const companyId=scope||(typeof input.companyId==='string'?input.companyId.trim():'');const customerId=typeof input.customerId==='string'&&input.customerId.trim()?input.customerId.trim():null;const variantId=String(input.variantId??'').trim();const quantity=Number(input.quantity);const notes=String(input.notes??'').trim().slice(0,1000);
    if(user.role==='WHOLESALE'&&!scope)return json({error:'FORBIDDEN'},403);if(!companyId||!variantId||!Number.isInteger(quantity)||quantity<1||quantity>500||notes.length<3)return json({error:'INVALID_QUOTE'},400);
    const company=await env.DB.prepare(`SELECT id,approval_status,price_list_id FROM companies WHERE id=? AND company_type='WHOLESALE' AND deleted_at IS NULL LIMIT 1`).bind(companyId).first<{id:string;approval_status:string;price_list_id:string|null}>();
    const variant=await env.DB.prepare('SELECT id FROM product_variants WHERE id=? AND active=1 LIMIT 1').bind(variantId).first<{id:string}>();
    if(!company||!variant||(scope&&company.approval_status!=='APPROVED'))return json({error:'INVALID_QUOTE'},400);
    if(customerId){const customer=await env.DB.prepare('SELECT id,company_id FROM customers WHERE id=? AND deleted_at IS NULL LIMIT 1').bind(customerId).first<{id:string;company_id:string|null}>();if(!customer||(scope&&customer.company_id!==scope))return json({error:'INVALID_QUOTE'},400);}
    const listed=company.price_list_id?await env.DB.prepare('SELECT amount_cents FROM prices WHERE price_list_id=? AND variant_id=? AND valid_until IS NULL ORDER BY valid_from DESC LIMIT 1').bind(company.price_list_id,variantId).first<{amount_cents:number}>():null;const requested=Number(input.unitPriceCents);const unitPriceCents=scope?Number(listed?.amount_cents):(Number.isInteger(requested)&&requested>=0?requested:Number(listed?.amount_cents));if(!Number.isInteger(unitPriceCents)||unitPriceCents<0||unitPriceCents>100_000_000)return json({error:'INVALID_QUOTE'},400);
    const id=crypto.randomUUID(),quoteNumber=demoReference('DEMO-Q'),now=new Date().toISOString(),expiresAt=new Date(Date.now()+7*86_400_000).toISOString();const result={id,quoteNumber,companyId,status:'DRAFT',quantity,unitPriceCents,actor:user.id};
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO quotes(id,quote_number,company_id,customer_id,status,currency,discount_cents,notes,created_by_user_id,expires_at,created_at,updated_at) VALUES(?,?,?,?,'DRAFT','USD',0,?,?,?,?,?)`).bind(id,quoteNumber,companyId,customerId,notes,user.id,expiresAt,now,now),
      env.DB.prepare(`INSERT INTO quote_items(id,quote_id,variant_id,quantity,unit_price_cents,discount_cents,notes) VALUES(?,?,?,?,?,0,'Item criado no ambiente DEMO.')`).bind(crypto.randomUUID(),id,variantId,quantity,unitPriceCents),
      env.DB.prepare('INSERT INTO audit_events(id,actor_user_id,action,entity_type,entity_id,after_json,ip_address,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,'CREATE','QUOTE',id,JSON.stringify(result),request.headers.get('cf-connecting-ip')??'CLOUDFLARE',(request.headers.get('user-agent')??'unknown').slice(0,500),now)
    ]);return json(result,201);
  }
  const quoteStatusRoute=url.pathname.match(/^\/api\/quotes\/([^/]+)\/status$/);
  if(quoteStatusRoute?.[1]&&request.method==='POST') {
    const id=decodeURIComponent(quoteStatusRoute[1]),scope=user.role==='WHOLESALE'?user.company_id:null;if(user.role==='WHOLESALE'&&!scope)return json({error:'FORBIDDEN'},403);const input=await body(request),status=String(input.status??'').trim().toUpperCase(),now=new Date().toISOString();await env.DB.prepare(`UPDATE quotes SET status='EXPIRED',updated_at=? WHERE status IN ('DRAFT','SENT','VIEWED') AND expires_at<=?`).bind(now,now).run();
    const quote=await env.DB.prepare('SELECT id,company_id,status FROM quotes WHERE id=? LIMIT 1').bind(id).first<{id:string;company_id:string|null;status:string}>();if(!quote||(scope&&quote.company_id!==scope))return json({error:'QUOTE_NOT_FOUND'},404);if(!(quoteTransitions[quote.status]??[]).includes(status))return json({error:'INVALID_QUOTE_STATUS'},409);if(scope&&!(['SENT','VIEWED'].includes(quote.status)&&['ACCEPTED','REJECTED'].includes(status)))return json({error:'FORBIDDEN'},403);
    const result={id,fromStatus:quote.status,toStatus:status,actor:user.id};await env.DB.batch([env.DB.prepare('UPDATE quotes SET status=?,updated_at=? WHERE id=?').bind(status,now,id),env.DB.prepare('INSERT INTO audit_events(id,actor_user_id,action,entity_type,entity_id,before_json,after_json,ip_address,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,({SENT:'QUOTE_SENT',VIEWED:'QUOTE_VIEWED',ACCEPTED:'QUOTE_ACCEPTED',REJECTED:'QUOTE_REJECTED'} as Record<string,string>)[status]??'UPDATE','QUOTE',id,JSON.stringify({status:quote.status}),JSON.stringify(result),request.headers.get('cf-connecting-ip')??'CLOUDFLARE',(request.headers.get('user-agent')??'unknown').slice(0,500),now)]);return json(result);
  }
  const quoteConvertRoute=url.pathname.match(/^\/api\/quotes\/([^/]+)\/convert$/);
  if(quoteConvertRoute?.[1]&&request.method==='POST') {
    if(user.role==='WHOLESALE')return json({error:'FORBIDDEN'},403);const quoteId=decodeURIComponent(quoteConvertRoute[1]),input=await body(request),deliveryMethod=quoteDeliveryMethods[String(input.deliveryMethod??'').trim().toUpperCase()]??'',addressDemo=String(input.addressDemo??'').trim().slice(0,500),carrierDemo=String(input.carrierDemo??'').trim().slice(0,160);if(!deliveryMethod||addressDemo.length<3||carrierDemo.length<3)return json({error:'INVALID_ORDER'},400);
    const quote=await env.DB.prepare(`SELECT id,company_id,customer_id FROM quotes WHERE id=? AND status='ACCEPTED' LIMIT 1`).bind(quoteId).first<{id:string;company_id:string;customer_id:string|null}>();if(!quote)return json({error:'QUOTE_NOT_FOUND'},404);if(await env.DB.prepare('SELECT id FROM orders WHERE quote_id=? LIMIT 1').bind(quoteId).first())return json({error:'INVALID_ORDER'},409);const items=await list<{variant_id:string;quantity:number;unit_price_cents:number}>(env,'SELECT variant_id,quantity,unit_price_cents FROM quote_items WHERE quote_id=?',quoteId);if(!items.length)return json({error:'INVALID_ORDER'},400);
    const id=crypto.randomUUID(),orderNumber=demoReference('DEMO'),now=new Date().toISOString(),result={id,orderNumber,quoteId,companyId:quote.company_id,status:'CONFIRMED',actor:user.id};const statements=[env.DB.prepare(`INSERT INTO orders(id,order_number,quote_id,company_id,customer_id,status,payment_status,currency,delivery_method,address_demo,carrier_demo,notes,assigned_user_id,created_at,updated_at) VALUES(?,?,?,?,?,'CONFIRMED','PENDING','USD',?,?,?,'Pedido convertido no ambiente DEMO.',?,?,?)`).bind(id,orderNumber,quoteId,quote.company_id,quote.customer_id,deliveryMethod,addressDemo,carrierDemo,user.id,now,now),...items.map(item=>env.DB.prepare('INSERT INTO order_items(id,order_id,variant_id,quantity,unit_price_cents) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),id,item.variant_id,Number(item.quantity),Number(item.unit_price_cents))),env.DB.prepare(`UPDATE quotes SET status='CONVERTED',updated_at=? WHERE id=?`).bind(now,quoteId),env.DB.prepare('INSERT INTO audit_events(id,actor_user_id,action,entity_type,entity_id,after_json,ip_address,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,'QUOTE_CONVERTED','QUOTE',quoteId,JSON.stringify(result),request.headers.get('cf-connecting-ip')??'CLOUDFLARE',(request.headers.get('user-agent')??'unknown').slice(0,500),now),env.DB.prepare('INSERT INTO audit_events(id,actor_user_id,action,entity_type,entity_id,after_json,ip_address,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,'ORDER_CREATED','ORDER',id,JSON.stringify(result),request.headers.get('cf-connecting-ip')??'CLOUDFLARE',(request.headers.get('user-agent')??'unknown').slice(0,500),now)];await env.DB.batch(statements);return json(result,201);
  }
  if (url.pathname === '/api/orders' && request.method === 'GET') return json({ orders: await list(env, 'SELECT * FROM orders ORDER BY created_at DESC'), items: await list(env, 'SELECT * FROM order_items'), reservations: await list(env, 'SELECT * FROM reservations'), shipments: await list(env, 'SELECT * FROM shipments'), inventory: await list(env, 'SELECT * FROM inventory_items') });
  if (url.pathname === '/api/settings' && request.method === 'GET') {
    if (user.role !== 'ADMIN') return json({ error: 'FORBIDDEN' }, 403);
    const rows = await list<Record<string, unknown>>(env, 'SELECT setting_key,setting_value,value_type,updated_at FROM settings ORDER BY setting_key');
    return json({ banner: DEMO_BANNER, environment: 'DEMO_ONLINE', settings: rows.filter(row => settingDefinitions[String(row.setting_key)]).map(row => ({ ...row, value_type: settingDefinitions[String(row.setting_key)].type, label: settingDefinitions[String(row.setting_key)].label, demo_only: true })) });
  }
  const settingRoute = url.pathname.match(/^\/api\/settings\/([^/]+)$/);
  if (settingRoute?.[1] && request.method === 'PATCH') {
    if (user.role !== 'ADMIN') return json({ error: 'FORBIDDEN' }, 403);
    const key = decodeURIComponent(settingRoute[1]);
    const definition = settingDefinitions[key];
    const input = await body(request);
    const value = typeof input.value === 'string' ? input.value.trim().slice(0, 10_000) : '';
    if (!definition || !value || !definition.validate(value)) return json({ error: 'INVALID_SETTING' }, 400);
    const existing = await env.DB.prepare('SELECT setting_value FROM settings WHERE setting_key=? LIMIT 1').bind(key).first<{ setting_value: string }>();
    if (!existing) return json({ error: 'SETTING_NOT_FOUND' }, 404);
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare('UPDATE settings SET setting_value=?,value_type=?,updated_by_user_id=?,updated_at=? WHERE setting_key=?').bind(value, definition.type, user.id, now, key),
      env.DB.prepare('INSERT INTO audit_events(id,actor_user_id,action,entity_type,entity_id,before_json,after_json,ip_address,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(), user.id, 'SETTINGS_CHANGE', 'SETTING', key, JSON.stringify({ value: existing.setting_value }), JSON.stringify({ value }), request.headers.get('cf-connecting-ip') ?? 'CLOUDFLARE', (request.headers.get('user-agent') ?? 'unknown').slice(0, 500), now)
    ]);
    return json({ key, value, valueType: definition.type, updatedAt: now });
  }
  if (url.pathname === '/api/reports' && request.method === 'GET') { const quoteRows=await list<Record<string,unknown>>(env,'SELECT status,COUNT(*) count FROM quotes GROUP BY status'); const total=quoteRows.reduce((sum,row)=>sum+Number(row.count),0); const converted=quoteRows.find(row=>row.status==='CONVERTED'); return json({ banner:DEMO_BANNER,scope:user.role==='WHOLESALE'?'COMPANY':'INTERNAL',companyId:user.company_id,conversionRate:total?Number((Number(converted?.count??0)*100/total).toFixed(2)):0,requests:await list(env,'SELECT status,COUNT(*) count FROM requests GROUP BY status'),quotes:quoteRows,orders:await list(env,'SELECT status,COUNT(*) count FROM orders GROUP BY status'),messages:await list(env,'SELECT c.status,COUNT(m.id) count FROM conversations c LEFT JOIN messages m ON m.conversation_id=c.id GROUP BY c.status'),shipments:await list(env,'SELECT status,COUNT(*) count FROM shipments GROUP BY status'),companies:user.role==='WHOLESALE'?[]:await list(env,'SELECT approval_status status,COUNT(*) count FROM companies GROUP BY approval_status'),employeeActivity:[],inventory:[],reservations:await list(env,'SELECT status,COUNT(*) count FROM reservations GROUP BY status'),audits:await list(env,'SELECT action status,COUNT(*) count FROM audit_events GROUP BY action'),environment:'DEMO_ONLINE' }); }
  if (url.pathname === '/api/account/sessions' && request.method === 'GET') return json({ sessions: await list(env, 'SELECT id,ip_address,user_agent,created_at,expires_at FROM sessions WHERE user_id=? AND revoked_at IS NULL AND expires_at>? ORDER BY created_at DESC', user.id, new Date().toISOString()) });
  if (url.pathname === '/api/account/mfa' && request.method === 'GET') return json({ enabled: false, recoveryCodesRemaining: 0 });
  if (url.pathname === '/api/inbox' && request.method === 'GET') return json({ cases: await list(env, `SELECT i.*,c.subject,(SELECT COUNT(*) FROM messages m WHERE m.conversation_id=c.id) message_count FROM inbox_cases i JOIN conversations c ON c.id=i.conversation_id ORDER BY i.updated_at DESC`) });
  if (url.pathname === '/api/documents' && request.method === 'GET') return json({ documents: await list(env, `SELECT id,company_id,entity_type,entity_id,original_name,mime_type,size_bytes,scan_status,expires_at,created_at FROM documents WHERE deleted_at IS NULL ORDER BY created_at DESC`) });
  if (url.pathname === '/api/returns' && request.method === 'GET') return json({ returns: await list(env, `SELECT r.*,o.order_number,COALESCE((SELECT SUM(i.quantity) FROM return_items i WHERE i.return_id=r.id),0) total_quantity FROM return_requests r JOIN orders o ON o.id=r.order_id ORDER BY r.created_at DESC`) });
  if (url.pathname === '/api/teams' && request.method === 'GET') return json({ teams: await list(env, 'SELECT * FROM teams WHERE active=1 ORDER BY name') });
  if (url.pathname === '/api/admin/users' && request.method === 'GET' && user.role === 'ADMIN') return json({ users: await list(env, `SELECT u.id,u.email,u.display_name,u.status,u.access_expires_at,GROUP_CONCAT(r.code) roles,(SELECT COUNT(*) FROM sessions s WHERE s.user_id=u.id AND s.revoked_at IS NULL AND s.expires_at>?) active_sessions FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id GROUP BY u.id ORDER BY u.display_name`, new Date().toISOString()) });
  if (url.pathname === '/api/admin/users/options' && request.method === 'GET' && user.role === 'ADMIN') return json({ roles: await list(env, 'SELECT id,code,name FROM roles ORDER BY name'), permissions: await list(env, 'SELECT id,code,description FROM permissions ORDER BY code') });
  if (url.pathname === '/api/admin/diagnostics' && request.method === 'GET' && user.role === 'ADMIN') return json({ status: { environment: 'DEMO_ONLINE', database: 'D1', features: { imports: false }, providers: { email: 'MOCK', whatsapp: 'MOCK', payment: 'MOCK', shipment: 'MOCK', storage: 'MOCK' } } });
  if (url.pathname === '/api/admin/jobs' && request.method === 'GET' && user.role === 'ADMIN') return json({ jobs: await list(env, 'SELECT * FROM job_queue ORDER BY created_at DESC LIMIT 100') });
  if (url.pathname === '/api/deliveries' && request.method === 'GET' && user.role === 'ADMIN') return json({ deliveries: await list(env, 'SELECT * FROM delivery_outbox ORDER BY created_at DESC LIMIT 100') });
  if (url.pathname === '/api/admin/privacy' && request.method === 'GET' && user.role === 'ADMIN') return json({ requests: await list(env, 'SELECT * FROM privacy_requests ORDER BY created_at DESC'), policies: await list(env, 'SELECT * FROM retention_policies ORDER BY data_category'), legalHolds: await list(env, 'SELECT * FROM legal_holds ORDER BY created_at DESC') });
  return json({ error: 'NOT_FOUND', path: url.pathname }, 404);
}

export { api, verifyAccess, verifyPassword };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try { await verifyAccess(request, env); }
    catch (error) { return json({ error: 'CLOUDFLARE_ACCESS_REQUIRED', reason: error instanceof Error ? error.message : 'ACCESS_DENIED' }, 403); }
    try {
      if (url.pathname === '/health' || url.pathname === '/ready' || url.pathname.startsWith('/api/')) return await api(request, env, url);
      return await env.ASSETS.fetch(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
      const status = message.startsWith('CSRF') ? 403 : message.endsWith('_REQUIRED') ? 400 : 500;
      if (url.pathname === '/api/auth/login' && status === 500) return json({ error: 'LOGIN_UNAVAILABLE', message: 'Não foi possível concluir o login. Tente novamente.' }, 500);
      return json({ error: status === 500 ? 'INTERNAL_ERROR' : message }, status);
    }
  }
};
