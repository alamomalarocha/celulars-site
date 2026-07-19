import { mkdirSync, writeFileSync } from 'node:fs';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { dirname, resolve } from 'node:path';

const output = resolve('apps/platform/data/production-bootstrap.sql');
const credentials = resolve('apps/platform/data/production-admin-credentials.json');
const email = (process.env.PLATFORM_BOOTSTRAP_EMAIL || 'alamomalarocha@gmail.com').trim().toLowerCase();
const displayName = (process.env.PLATFORM_BOOTSTRAP_DISPLAY_NAME || 'Alamo').trim();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || displayName.length < 2) throw new Error('INVALID_BOOTSTRAP_ADMIN');
const temporaryPassword = ['Cel!', randomBytes(9).toString('base64url'), '9aA'].join('-');
const salt = randomBytes(16).toString('base64url');
const derived = scryptSync(temporaryPassword, salt, 32, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const passwordHash = `scrypt$v1$N=16384,r=8,p=1,l=32$${salt}$${derived.toString('hex')}`;
const now = new Date().toISOString();
const userId = randomUUID();
const auditId = randomUUID();
const permissions = ['users.read','users.write','settings.read','settings.write','audit.read','reports.read','catalog.read','catalog.write','prices.read','prices.write','inventory.read','inventory.write','customers.read','customers.write','companies.read','companies.approve','quotes.read','quotes.write','orders.read','orders.write','requests.read','requests.write','messages.read','messages.write'];
const q = value => `'${String(value).replaceAll("'", "''")}'`;
const statements = [
  'PRAGMA foreign_keys=ON',
  `INSERT INTO roles(id,code,name,created_at) VALUES('role-admin','ADMIN','Administrador',${q(now)}),('role-employee','EMPLOYEE','Funcionário',${q(now)}),('role-wholesale','WHOLESALE','Atacadista',${q(now)}) ON CONFLICT(code) DO NOTHING`,
  ...permissions.map((code, index) => `INSERT INTO permissions(id,code,description,created_at) VALUES('permission-production-${String(index + 1).padStart(4, '0')}',${q(code)},${q(`Permissão ${code}`)},${q(now)}) ON CONFLICT(code) DO NOTHING`),
  ...permissions.map(code => `INSERT INTO role_permissions(role_id,permission_id) SELECT 'role-admin',id FROM permissions WHERE code=${q(code)} ON CONFLICT DO NOTHING`),
  `INSERT INTO users(id,email,display_name,password_hash,password_salt,status,company_id,must_change_password,email_verified_at,created_at,updated_at) SELECT ${q(userId)},${q(email)},${q(displayName)},${q(passwordHash)},${q(salt)},'ACTIVE',NULL,1,${q(now)},${q(now)},${q(now)} WHERE NOT EXISTS(SELECT 1 FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE r.code='ADMIN')`,
  `INSERT INTO user_roles(user_id,role_id) SELECT id,'role-admin' FROM users WHERE id=${q(userId)} ON CONFLICT DO NOTHING`,
  `INSERT INTO audit_events(id,actor_user_id,action,entity_type,entity_id,after_json,ip_address,user_agent,created_at) SELECT ${q(auditId)},NULL,'BOOTSTRAP_ADMIN','USER',${q(userId)},${q(JSON.stringify({ email, mustChangePassword: true, mfaRequired: true }))},'CONTROLLED_CLI','platform:bootstrap:production',${q(now)} WHERE EXISTS(SELECT 1 FROM users WHERE id=${q(userId)})`,
  ...[
    ['operation_name','CELULARS Painel Operacional','STRING'],
    ['currency','USD','STRING'],
    ['brazil_cpo_shipping','125','NUMBER'],
    ['brazil_new_shipping','200','NUMBER'],
    ['default_language','pt-BR','STRING'],
    ['default_order_status','DRAFT','STRING'],
    ['quote_sequence_prefix','Q','STRING'],
    ['order_sequence_prefix','ORD','STRING'],
    ['notifications_enabled','true','BOOLEAN'],
    ['demo_mode','false','BOOLEAN']
  ].map(([key,value,type]) => `INSERT INTO settings(id,setting_key,setting_value,value_type,updated_by_user_id,created_at,updated_at) VALUES(${q(randomUUID())},${q(key)},${q(value)},${q(type)},${q(userId)},${q(now)},${q(now)}) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,value_type=excluded.value_type,updated_by_user_id=excluded.updated_by_user_id,updated_at=excluded.updated_at`),
  'PRAGMA foreign_key_check'
];
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, statements.join(';\n') + ';\n', { mode: 0o600 });
writeFileSync(credentials, JSON.stringify({ environment: 'PRODUCTION', email, displayName, temporaryPassword, mustChangePassword: true, mfaRequired: true, createdAt: now }, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify({ sql: output, credentials, email, mustChangePassword: true, mfaRequired: true }));
