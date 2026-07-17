import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import test from 'node:test';
import { openDatabase } from '../database/db.js';
import { migrateDatabase } from '../database/migrate.js';
import { seedDatabase } from '../database/seed.js';
import { createPlatformApplication } from '../server/app.js';
import { AuthService, AuthenticationError } from '../server/auth.js';
import { loadConfig } from '../src/config.js';

const demoPassword = 'Local-Demo-Auth-Test!';

function removeDatabase(filePath: string): void {
  for (const candidate of [filePath, `${filePath}-wal`, `${filePath}-shm`]) if (existsSync(candidate)) rmSync(candidate);
}

test('server auth enforces cookie sessions, origin, CSRF and RBAC', async () => {
  const base = loadConfig();
  const databasePath = path.join(base.platformRoot, 'data', `auth-http-test-${process.pid}.sqlite`);
  const config = loadConfig({
    databasePath,
    allowedOrigin: 'http://platform.demo.test',
    secureCookies: true,
    sessionSecret: 'auth-http-test-secret-that-is-long-enough'
  });
  removeDatabase(databasePath);
  const database = openDatabase(config);
  migrateDatabase(database);
  seedDatabase(database, config, demoPassword);
  const application = createPlatformApplication(database, config);
  await new Promise<void>((resolve) => application.server.listen(0, '127.0.0.1', resolve));
  const address = application.server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function login(email: string): Promise<{ cookie: string; csrf: string }> {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: config.allowedOrigin },
      body: JSON.stringify({ email, password: demoPassword })
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie ?? '', /HttpOnly/);
    assert.match(cookie ?? '', /SameSite=Strict/);
    assert.match(cookie ?? '', /Secure/);
    const payload = await response.json() as { user: { csrfToken: string } };
    return { cookie: (cookie ?? '').split(';')[0] ?? '', csrf: payload.user.csrfToken };
  }

  try {
    const shell = await fetch(`${baseUrl}/`);
    assert.equal(shell.status, 200);
    assert.match(shell.headers.get('content-type') ?? '', /text\/html/);
    assert.match(shell.headers.get('content-security-policy') ?? '', /default-src 'self'/);

    const admin = await login('admin@demo.invalid');
    const me = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: admin.cookie } });
    assert.equal(me.status, 200);
    const adminDashboard = await fetch(`${baseUrl}/api/dashboard`, { headers: { Cookie: admin.cookie } });
    assert.equal(adminDashboard.status, 200);
    const adminDashboardPayload = await adminDashboard.json() as { profile: string; metrics: { products: number; openRequests: number } };
    assert.equal(adminDashboardPayload.profile, 'ADMIN');
    assert.ok(adminDashboardPayload.metrics.products > 0);
    assert.ok(adminDashboardPayload.metrics.openRequests > 0);
    const adminUsers = await fetch(`${baseUrl}/api/admin/users`, { headers: { Cookie: admin.cookie } });
    assert.equal(adminUsers.status, 200);
    const withoutCsrf = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST', headers: { Cookie: admin.cookie, Origin: config.allowedOrigin }
    });
    assert.equal(withoutCsrf.status, 403);
    const wrongOrigin = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST', headers: { Cookie: admin.cookie, Origin: 'https://evil.invalid', 'X-CSRF-Token': admin.csrf }
    });
    assert.equal(wrongOrigin.status, 403);

    const wholesaler = await login('atacadista1@demo.invalid');
    const forbidden = await fetch(`${baseUrl}/api/admin/users`, { headers: { Cookie: wholesaler.cookie } });
    assert.equal(forbidden.status, 403);
    const catalog = await fetch(`${baseUrl}/api/catalog/products`, { headers: { Cookie: wholesaler.cookie } });
    assert.equal(catalog.status, 200);
    const forbiddenInventory = await fetch(`${baseUrl}/api/inventory`, { headers: { Cookie: wholesaler.cookie } });
    assert.equal(forbiddenInventory.status, 403);
    const forbiddenCustomers = await fetch(`${baseUrl}/api/customers`, { headers: { Cookie: wholesaler.cookie } });
    assert.equal(forbiddenCustomers.status, 403);
    const wholesaleRequests = await fetch(`${baseUrl}/api/requests`, { headers: { Cookie: wholesaler.cookie } });
    assert.equal(wholesaleRequests.status, 200);
    const wholesaleRequestPayload = await wholesaleRequests.json() as { requests: readonly { company_id: string }[] };
    assert.ok(wholesaleRequestPayload.requests.every((row) => row.company_id === 'company-demo-1'));
    const wholesaleConversations = await fetch(`${baseUrl}/api/conversations`, { headers: { Cookie: wholesaler.cookie } });
    assert.equal(wholesaleConversations.status, 200);
    const wholesaleConversationPayload = await wholesaleConversations.json() as {
      conversations: readonly { id: string; company_id: string }[];
      messages: readonly { message_type: string }[];
    };
    assert.ok(wholesaleConversationPayload.conversations.every((row) => row.company_id === 'company-demo-1'));
    assert.ok(wholesaleConversationPayload.messages.every((row) => row.message_type !== 'INTERNAL_NOTE'));
    const firstConversation = wholesaleConversationPayload.conversations[0];
    assert.ok(firstConversation?.id);
    const forbiddenInternalNote = await fetch(`${baseUrl}/api/messages`, {
      method: 'POST',
      headers: {
        Cookie: wholesaler.cookie,
        Origin: config.allowedOrigin,
        'X-CSRF-Token': wholesaler.csrf,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversationId: firstConversation?.id,
        body: 'Nota interna proibida no teste DEMO.',
        messageType: 'INTERNAL_NOTE'
      })
    });
    assert.equal(forbiddenInternalNote.status, 403);
    const ownCompany = await fetch(`${baseUrl}/api/companies`, { headers: { Cookie: wholesaler.cookie } });
    assert.equal(ownCompany.status, 200);
    const ownCompanyPayload = await ownCompany.json() as { companies: readonly { id: string }[] };
    assert.deepEqual(ownCompanyPayload.companies.map((row) => row.id), ['company-demo-1']);
    const forbiddenApproval = await fetch(`${baseUrl}/api/companies/company-demo-1/approval`, {
      method: 'POST', headers: { Cookie: wholesaler.cookie, Origin: config.allowedOrigin, 'X-CSRF-Token': wholesaler.csrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SUSPENDED', notes: 'Tentativa sem permissao DEMO.' })
    });
    assert.equal(forbiddenApproval.status, 403);
    const wholesaleDashboard = await fetch(`${baseUrl}/api/dashboard`, { headers: { Cookie: wholesaler.cookie } });
    assert.equal(wholesaleDashboard.status, 200);
    const wholesaleDashboardPayload = await wholesaleDashboard.json() as { profile: string; metrics: { products: number; quotes: number; orders: number } };
    assert.equal(wholesaleDashboardPayload.profile, 'WHOLESALE');
    assert.ok(wholesaleDashboardPayload.metrics.products > 0);
    assert.ok(wholesaleDashboardPayload.metrics.quotes > 0);
    assert.ok(wholesaleDashboardPayload.metrics.orders > 0);

    const logout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST', headers: { Cookie: admin.cookie, Origin: config.allowedOrigin, 'X-CSRF-Token': admin.csrf }
    });
    assert.equal(logout.status, 204);
    assert.match(logout.headers.get('set-cookie') ?? '', /Max-Age=0/);
    const expired = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: admin.cookie } });
    assert.equal(expired.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => application.server.close((error) => error ? reject(error) : resolve()));
    database.close();
    removeDatabase(databasePath);
  }
});

test('session rotation invalidates old token and login failures lock an account', () => {
  const base = loadConfig();
  const databasePath = path.join(base.platformRoot, 'data', `auth-service-test-${process.pid}.sqlite`);
  const config = loadConfig({
    databasePath,
    sessionSecret: 'auth-service-test-secret-that-is-long-enough',
    sessionRotationMinutes: 30
  });
  removeDatabase(databasePath);
  const database = openDatabase(config);
  migrateDatabase(database);
  seedDatabase(database, config, demoPassword);
  const auth = new AuthService(database, config);
  const loginAt = new Date('2026-07-17T13:00:00.000Z');

  try {
    const login = auth.login('funcionario1@demo.invalid', demoPassword, { ipAddress: '127.0.0.1', userAgent: 'test', now: loginAt });
    const rotated = auth.authenticate(login.token, new Date(loginAt.getTime() + 31 * 60 * 1000));
    assert.ok(rotated?.rotatedToken);
    assert.equal(auth.authenticate(login.token, new Date(loginAt.getTime() + 31 * 60 * 1000)), null);
    assert.equal(auth.authenticate(rotated.rotatedToken, new Date(loginAt.getTime() + 31 * 60 * 1000))?.userId, login.principal.userId);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.throws(() => auth.login('funcionario2@demo.invalid', 'Wrong-Password!', { ipAddress: '127.0.0.1', userAgent: 'test', now: loginAt }), AuthenticationError);
    }
    assert.throws(() => auth.login('funcionario2@demo.invalid', demoPassword, { ipAddress: '127.0.0.1', userAgent: 'test', now: loginAt }), AuthenticationError);
  } finally {
    database.close();
    removeDatabase(databasePath);
  }
});
