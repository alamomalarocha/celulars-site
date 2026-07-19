import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { homedir } from 'node:os';


const config = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
const required = [
  '"name": "celulars-platform-demo"', '"workers_dev": false', '"preview_urls": false',
  '"binding": "DB"', '"database_name": "celulars-platform-demo-db"',
  '"PLATFORM_DEMO": "true"', '"REAL_EMAIL_ENABLED": "false"',
  '"REAL_WHATSAPP_ENABLED": "false"', '"REAL_PAYMENTS_ENABLED": "false"',
  '"REAL_SHIPMENTS_ENABLED": "false"', '"REAL_DATA_IMPORT_ENABLED": "false"',
  '"PUBLIC_SIGNUP_ENABLED": "false"', '"PRODUCTION_MODE": "false"'
];
for (const item of required) if (!config.includes(item)) throw new Error(`CONFIG_INVALID:${item}`);

const demo = await fetch('https://demo.celulars.com.br/', { redirect: 'manual' });
if (demo.status !== 302 || !demo.headers.get('location')?.startsWith('https://black-hall-e4fd.cloudflareaccess.com/')) throw new Error(`ACCESS_NOT_ENFORCED:${demo.status}`);
const bypass = await fetch('https://celulars-platform-demo.alamomalarocha.workers.dev/', { redirect: 'manual' });
if (bypass.status !== 404) throw new Error(`WORKERS_DEV_BYPASS:${bypass.status}`);
const publicSite = await fetch('https://celulars.com.br/', { redirect: 'manual' });
if (publicSite.status !== 200) throw new Error(`PUBLIC_SITE_UNAVAILABLE:${publicSite.status}`);
const certs = await fetch('https://black-hall-e4fd.cloudflareaccess.com/cdn-cgi/access/certs');
if (!certs.ok) throw new Error(`ACCESS_CERTS_UNAVAILABLE:${certs.status}`);

const sql = 'SELECT (SELECT COUNT(*) FROM users) users,(SELECT COUNT(*) FROM companies) companies,(SELECT COUNT(*) FROM products) products,(SELECT COUNT(*) FROM orders) orders; PRAGMA foreign_key_check;';
const wranglerCache = join(homedir(), '.cache', 'codex-wrangler-npm', '_npx');
const wranglerEntry = readdirSync(wranglerCache, { recursive: true, withFileTypes: true }).find(entry => entry.isFile() && entry.name === 'wrangler.js');
if (!wranglerEntry) throw new Error('WRANGLER_CACHE_NOT_FOUND');
const wranglerBin = join(wranglerEntry.parentPath, wranglerEntry.name);
const query = spawnSync(process.execPath, [wranglerBin,'d1','execute','DB','--remote','--json','--command',sql], { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8', env: { ...process.env, npm_config_cache: 'C:\\Users\\alamo\\.cache\\codex-wrangler-npm' } });
if (query.status !== 0) throw new Error(`D1_QUERY_FAILED:${query.error?.message ?? query.stderr ?? 'unknown'}`);
const output = JSON.parse(query.stdout.slice(query.stdout.indexOf('[')));
const counts = output[0]?.results?.[0];
if (counts?.users !== 9 || counts?.companies !== 6 || counts?.products !== 31 || counts?.orders !== 8) throw new Error(`D1_COUNTS_INVALID:${JSON.stringify(counts)}`);
if (output[1]?.results?.length) throw new Error('D1_FOREIGN_KEY_VIOLATION');
console.log(JSON.stringify({ status: 'READY', access: 'ENFORCED', database: 'D1_READY', providers: 'MOCK', workersDev: 'DISABLED', publicSite: 'INTACT', counts }));
