import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const WRANGLER_VERSION = '4.112.0';
export const TARGET_DATABASE = 'celulars-platform-prod-db';

export function validateDatabaseList(rawOutput) {
  let databases;
  try {
    databases = JSON.parse(rawOutput);
  } catch {
    throw new Error('Cloudflare D1 preflight returned invalid JSON.');
  }
  if (!Array.isArray(databases)) {
    throw new Error('Cloudflare D1 preflight returned an unexpected response.');
  }
  const target = databases.find((database) => database?.name === TARGET_DATABASE);
  if (!target) {
    throw new Error('D1 database ' + TARGET_DATABASE + ' is not accessible in the configured account.');
  }
  return target;
}

export function sanitizeDiagnostic(value, environment = process.env) {
  let diagnostic = String(value ?? '');
  for (const secret of [environment.CLOUDFLARE_API_TOKEN, environment.CLOUDFLARE_ACCOUNT_ID]) {
    if (secret) diagnostic = diagnostic.replaceAll(secret, '[REDACTED]');
  }
  return diagnostic.trim().slice(0, 4000);
}

export function runPreflight({ spawn = spawnSync, environment = process.env } = {}) {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawn(
    command,
    ['--yes', 'wrangler@' + WRANGLER_VERSION, 'd1', 'list', '--json', '--config', 'wrangler.production.jsonc'],
    { encoding: 'utf8', env: environment, shell: false },
  );
  if (result.error || result.status !== 0) {
    const diagnostic = sanitizeDiagnostic(result.stderr || result.error?.message, environment);
    const suffix = diagnostic ? ' Diagnostic: ' + diagnostic : '';
    throw new Error(
      'Cloudflare authentication or D1 access validation failed (Wrangler exit ' +
        (result.status ?? 'not-started') + ').' + suffix,
    );
  }
  validateDatabaseList(result.stdout);
  console.log('Cloudflare account can access D1 database ' + TARGET_DATABASE + '.');
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  try {
    runPreflight();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Cloudflare D1 preflight failed.');
    process.exitCode = 1;
  }
}
