import assert from 'node:assert/strict';
import test from 'node:test';
import { TARGET_DATABASE, sanitizeDiagnostic, validateDatabaseList } from './platform-cloudflare-preflight.mjs';

test('accepts the production D1 database in a Wrangler JSON list', () => {
  const database = validateDatabaseList(JSON.stringify([
    { name: 'unrelated-db' },
    { name: TARGET_DATABASE, uuid: 'safe-placeholder' },
  ]));
  assert.equal(database.name, TARGET_DATABASE);
});

test('rejects an account without the production D1 database', () => {
  assert.throws(() => validateDatabaseList(JSON.stringify([{ name: 'unrelated-db' }])), /is not accessible/);
});

test('rejects invalid Wrangler JSON', () => {
  assert.throws(() => validateDatabaseList('not-json'), /invalid JSON/);
});

test('redacts Cloudflare credentials from diagnostics', () => {
  const diagnostic = sanitizeDiagnostic('token-value account-value error 10000', {
    CLOUDFLARE_API_TOKEN: 'token-value',
    CLOUDFLARE_ACCOUNT_ID: 'account-value',
  });
  assert.equal(diagnostic, '[REDACTED] [REDACTED] error 10000');
});
