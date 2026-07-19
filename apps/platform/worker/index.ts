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

function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
}

function publicUser(user: Principal): object {
  return { id: user.id, email: user.email, displayName: user.display_name, companyId: user.company_id, roles: [user.role], csrfToken: user.csrfToken };
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

async function verifyPassword(password: string, salt: string, expected: string): Promise<boolean> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 210_000 }, material, 256);
  const actual = [...new Uint8Array(bits)].map(v => v.toString(16).padStart(2, '0')).join('');
  return actual === expected;
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
  if (url.pathname === '/api/audit' && request.method === 'GET') return json({ events: user.role === 'ADMIN' ? await list(env, 'SELECT a.*,u.display_name actor_name FROM audit_events a LEFT JOIN users u ON u.id=a.actor_user_id ORDER BY a.created_at DESC LIMIT 200') : await list(env, 'SELECT a.*,u.display_name actor_name FROM audit_events a LEFT JOIN users u ON u.id=a.actor_user_id WHERE a.actor_user_id=? ORDER BY a.created_at DESC LIMIT 100',user.id), limited:user.role!=='ADMIN' });
  if (url.pathname === '/api/catalog/products' && request.method === 'GET') return json({ products: await list<Record<string, unknown>>(env, `SELECT p.id,p.model_name,p.year,p.product_type,COUNT(v.id) variant_count,json_group_array(DISTINCT v.capacity) capacities,json_group_array(DISTINCT v.color) colors FROM products p JOIN product_variants v ON v.product_id=p.id WHERE p.demo_active=1 AND v.active=1 GROUP BY p.id ORDER BY p.model_name`).then(rows => rows.map(item => ({ ...item, capacities: JSON.parse(String(item.capacities)), colors: JSON.parse(String(item.colors)) }))) });
  if (url.pathname === '/api/price-lists' && request.method === 'GET') return json({ lists: await list(env, `SELECT * FROM price_lists WHERE status='ACTIVE' ORDER BY name`) });
  if (url.pathname === '/api/prices' && request.method === 'GET') return json({ prices: await list(env, `SELECT pr.*,pl.name list_name,v.capacity,v.color,p.model_name,p.product_type FROM prices pr JOIN price_lists pl ON pl.id=pr.price_list_id JOIN product_variants v ON v.id=pr.variant_id JOIN products p ON p.id=v.product_id WHERE pr.valid_until IS NULL ORDER BY p.model_name`), readOnly: user.role === 'WHOLESALE' });
  if (url.pathname === '/api/inventory' && request.method === 'GET') return json({ inventory: await list(env, `SELECT i.*,v.capacity,v.color,p.model_name,p.product_type,COALESCE(SUM(m.physical_delta),0) physical_quantity,COALESCE(SUM(m.reserved_delta),0) reserved_quantity,COALESCE(SUM(m.physical_delta+m.reserved_delta),0) available_quantity FROM inventory_items i JOIN product_variants v ON v.id=i.variant_id JOIN products p ON p.id=v.product_id LEFT JOIN inventory_movements m ON m.inventory_item_id=i.id GROUP BY i.id ORDER BY p.model_name`) });
  if (url.pathname === '/api/customers' && request.method === 'GET') return json({ customers: user.role === 'WHOLESALE' ? [] : await list(env, 'SELECT * FROM customers WHERE deleted_at IS NULL ORDER BY created_at DESC') });
  if (url.pathname === '/api/companies' && request.method === 'GET') return json({ companies: user.role === 'WHOLESALE' ? await list(env, 'SELECT * FROM companies WHERE id=?', user.company_id) : await list(env, 'SELECT * FROM companies WHERE deleted_at IS NULL ORDER BY name') });
  if (url.pathname === '/api/requests' && request.method === 'GET') return json({ requests: await list(env, `SELECT r.*,l.lead_type,l.priority FROM requests r LEFT JOIN leads l ON l.id=r.lead_id ORDER BY r.created_at DESC`), employees: await list(env, `SELECT u.id,u.display_name FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE r.code IN ('ADMIN','EMPLOYEE')`) });
  if (url.pathname === '/api/conversations' && request.method === 'GET') return json({ conversations: await list(env, 'SELECT * FROM conversations ORDER BY updated_at DESC'), messages: await list(env, 'SELECT * FROM messages ORDER BY created_at DESC'), allowInternalNotes: user.role !== 'WHOLESALE' });
  if (url.pathname === '/api/quotes' && request.method === 'GET') return json({ quotes: await list(env, 'SELECT q.*,c.name company_name FROM quotes q LEFT JOIN companies c ON c.id=q.company_id ORDER BY q.created_at DESC'), variants: await list(env, 'SELECT v.*,p.model_name,p.product_type FROM product_variants v JOIN products p ON p.id=v.product_id'), companies: await list(env, `SELECT * FROM companies WHERE approval_status='APPROVED'`), readOnlyInternalWorkflow: user.role === 'WHOLESALE' });
  if (url.pathname === '/api/orders' && request.method === 'GET') return json({ orders: await list(env, 'SELECT * FROM orders ORDER BY created_at DESC'), items: await list(env, 'SELECT * FROM order_items'), reservations: await list(env, 'SELECT * FROM reservations'), shipments: await list(env, 'SELECT * FROM shipments'), inventory: await list(env, 'SELECT * FROM inventory_items') });
  if (url.pathname === '/api/settings' && request.method === 'GET') return json({ settings: user.role === 'ADMIN' ? await list(env, 'SELECT * FROM settings ORDER BY setting_key') : [] });
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

export { verifyAccess };

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
      return json({ error: message }, status);
    }
  }
};
