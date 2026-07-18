import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const clientSource = readFileSync(resolve(process.cwd(), 'apps/platform/public/app.js'), 'utf8');

test('frontend clears privileged module state across authentication boundaries', () => {
  assert.match(clientSource, /function resetSessionState\(\)/);
  assert.match(clientSource, /\/api\/auth\/login[\s\S]*?resetSessionState\(\);state\.user=/);
  assert.match(clientSource, /async function logout\(\)[\s\S]*?resetSessionState\(\);loginView\(\)/);
  assert.match(clientSource, /async function boot\(\)[\s\S]*?resetSessionState\(\);state\.user=/);
});
