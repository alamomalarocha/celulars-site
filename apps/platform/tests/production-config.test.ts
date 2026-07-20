import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const productionConfig = readFileSync('wrangler.production.jsonc', 'utf8');

test('production configuration blocks imports and real integrations', () => {
  for (const flag of [
    'REAL_DATA_IMPORT_ENABLED',
    'REAL_EMAIL_ENABLED',
    'REAL_WHATSAPP_ENABLED',
    'REAL_PAYMENTS_ENABLED',
    'REAL_SHIPMENTS_ENABLED',
    'REAL_STORAGE_ENABLED'
  ]) {
    assert.match(productionConfig, new RegExp(`"${flag}"\\s*:\\s*"false"`));
  }
  assert.match(productionConfig, /"PLATFORM_DEMO"\s*:\s*"false"/);
  assert.match(productionConfig, /"PRODUCTION_MODE"\s*:\s*"true"/);
});
