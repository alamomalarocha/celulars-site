import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { migrateDatabase } from '../apps/platform/build/database/migrate.js';
import { seedDatabase } from '../apps/platform/build/database/seed.js';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(repositoryRoot, 'apps', 'platform', 'data');
const databasePath = path.join(dataDir, 'platform-demo-online-seed.sqlite');
const sqlPath = path.join(dataDir, 'demo-online-seed.sql');
const credentialsPath = path.join(dataDir, 'demo-online-credentials.json');
const password = process.env.PLATFORM_DEMO_ONLINE_PASSWORD?.trim();
if (!password || password.length < 18) throw new Error('Defina PLATFORM_DEMO_ONLINE_PASSWORD com pelo menos 18 caracteres.');
if (existsSync(databasePath)) rmSync(databasePath);

const database = new DatabaseSync(databasePath);
const config = {
  environment: 'DEMO', demo: true, host: '127.0.0.1', port: 4178, databaseDriver: 'sqlite', databasePath,
  credentialsPath, platformRoot: path.join(repositoryRoot, 'apps', 'platform'), repositoryRoot,
  sessionSecret: 'demo-online-export-only-secret-64-characters-minimum-not-deployed', sessionCookieName: 'unused',
  sessionTtlMinutes: 480, sessionRotationMinutes: 30, allowedOrigin: 'https://demo.celulars.com.br', publicUrl: 'https://demo.celulars.com.br',
  secureCookies: true, storageMode: 'mock', storagePath: path.join(dataDir, 'storage-demo-online'), emailMode: 'mock', whatsappMode: 'mock',
  mfaRequiredRoles: [], logPath: path.join(dataDir, 'logs-demo-online'),
  features: { publicPlatform: false, wholesaleLogin: true, employeeLogin: true, externalMessages: false, realEmail: false, realWhatsApp: false, documents: true, mfa: false, reports: true, returns: true, imports: false, integrations: false }
};
migrateDatabase(database);
const summary = seedDatabase(database, config, password);
for (const row of database.prepare('SELECT id,email FROM users ORDER BY id').all()) {
  const salt = randomBytes(18).toString('base64url');
  const derived = scryptSync(password, salt, 32, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  const hash = 'scrypt$v1$N=16384,r=8,p=1,l=32$' + salt + '$' + derived.toString('hex');
  database.prepare('UPDATE users SET password_hash=?,password_salt=? WHERE id=?').run(hash, salt, row.id);
}
function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (value instanceof Uint8Array) return `X'${Buffer.from(value).toString('hex')}'`;
  return `'${String(value).replaceAll("'", "''")}'`;
}
const tables = database.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name!='schema_migrations' ORDER BY name`).all().map(row => row.name);
const lines = ['PRAGMA foreign_keys=OFF;'];
for (const table of [...tables].reverse()) lines.push(`DELETE FROM "${table}";`);
for (const table of tables) {
  for (const row of database.prepare(`SELECT * FROM "${table}"`).all()) {
    const columns = Object.keys(row);
    lines.push(`INSERT INTO "${table}" (${columns.map(v => `"${v}"`).join(',')}) VALUES (${columns.map(v => sqlValue(row[v])).join(',')});`);
  }
}
lines.push('PRAGMA foreign_keys=ON;');
writeFileSync(sqlPath, `${lines.join('\n')}\n`, { encoding: 'utf8', mode: 0o600 });
writeFileSync(credentialsPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), warning: 'CREDENCIAIS EXCLUSIVAS DO AMBIENTE DEMO ONLINE', password, accounts: ['admin@demo.invalid','funcionario1@demo.invalid','atacadista1@demo.invalid','atacadista2@demo.invalid'] }, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
database.close();
console.log(JSON.stringify({ status: 'SEED_SQL_READY', summary, sqlPath, credentialsPath }));
