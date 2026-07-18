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

test('advanced frontend modules remain wired without unsafe HTML rendering', () => {
  for (const route of ['/api/account/sessions','/api/inbox','/api/documents','/api/returns','/api/admin/diagnostics','/api/admin/jobs']) {
    assert.ok(clientSource.includes(route), `missing frontend route ${route}`);
  }
  for (const view of ['accountView','inboxView','documentsView','returnsView','advancedView']) {
    assert.match(clientSource, new RegExp(`function ${view}\\(`));
  }
  assert.doesNotMatch(clientSource, /innerHTML\s*=|insertAdjacentHTML|document\.write/);
  assert.match(clientSource, /node\.textContent=text/);
});