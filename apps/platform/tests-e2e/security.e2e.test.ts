import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import test from 'node:test';
import { openDatabase } from '../database/db.js';
import { migrateDatabase } from '../database/migrate.js';
import { seedDatabase } from '../database/seed.js';
import { createPlatformApplication } from '../server/app.js';
import { loadConfig } from '../src/config.js';

const demoPassword = 'Local-Demo-E2E-Security!';

interface Session {
  readonly cookie: string;
  readonly csrf: string;
}

function removeDatabase(filePath: string): void {
  for (const candidate of [filePath, `${filePath}-wal`, `${filePath}-shm`]) {
    if (existsSync(candidate)) rmSync(candidate);
  }
}

test('E2E security protects sessions, writes, tenant scope and browser rendering', async () => {
  const base = loadConfig();
  const databasePath = path.join(base.platformRoot, 'data', `security-e2e-${process.pid}.sqlite`);
  const config = loadConfig({
    databasePath,
    allowedOrigin: 'http://platform.demo.test',
    secureCookies: true,
    sessionSecret: 'security-e2e-secret-that-is-long-enough'
  });
  removeDatabase(databasePath);
  const database = openDatabase(config);
  migrateDatabase(database);
  seedDatabase(database, config, demoPassword);
  const application = createPlatformApplication(database, config);
  await new Promise<void>((resolve) => application.server.listen(0, '127.0.0.1', resolve));
  const address = application.server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function login(email: string): Promise<Session> {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: config.allowedOrigin },
      body: JSON.stringify({ email, password: demoPassword })
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie') ?? '';
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    assert.match(cookie, /Secure/);
    const payload = await response.json() as { user: { csrfToken: string } };
    return { cookie: cookie.split(';')[0] ?? '', csrf: payload.user.csrfToken };
  }

  async function write(session: Session, pathname: string, body: unknown, csrf = session.csrf, origin = config.allowedOrigin): Promise<Response> {
    return fetch(`${baseUrl}${pathname}`, {
      method: 'POST',
      headers: {
        Cookie: session.cookie,
        Origin: origin,
        'X-CSRF-Token': csrf,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  }

  try {
    const shell = await fetch(`${baseUrl}/`);
    assert.equal(shell.status, 200);
    assert.match(shell.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
    assert.equal(shell.headers.get('cache-control'), 'no-store');
    assert.equal(shell.headers.get('x-frame-options'), 'DENY');
    assert.equal(shell.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(shell.headers.get('x-permitted-cross-domain-policies'), 'none');

    const unauthenticated = await fetch(`${baseUrl}/api/dashboard`);
    assert.equal(unauthenticated.status, 401);

    const wrongMedia = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', Origin: config.allowedOrigin },
      body: '{}'
    });
    assert.equal(wrongMedia.status, 415);

    const userCountBefore = Number(database.prepare('SELECT COUNT(*) AS count FROM users').get()?.count ?? 0);
    const injection = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: config.allowedOrigin },
      body: JSON.stringify({ email: "admin@demo.invalid' OR 1=1 --", password: demoPassword })
    });
    assert.equal(injection.status, 401);
    assert.equal(Number(database.prepare('SELECT COUNT(*) AS count FROM users').get()?.count ?? 0), userCountBefore);

    const admin = await login('admin@demo.invalid');
    const wholesalerOne = await login('atacadista1@demo.invalid');
    const wholesalerTwo = await login('atacadista2@demo.invalid');
    const employee = await login('funcionario1@demo.invalid');

    const missingCsrf = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: admin.cookie, Origin: config.allowedOrigin, 'Content-Type': 'application/json' },
      body: '{}'
    });
    assert.equal(missingCsrf.status, 403);

    const crossSessionCsrf = await write(admin, '/api/notifications/read-all', {}, wholesalerOne.csrf);
    assert.equal(crossSessionCsrf.status, 403);
    const wrongOrigin = await write(admin, '/api/notifications/read-all', {}, admin.csrf, 'https://evil.invalid');
    assert.equal(wrongOrigin.status, 403);

    const adminSettings = await fetch(`${baseUrl}/api/settings`, { headers: { Cookie: admin.cookie } });
    assert.equal(adminSettings.status, 200);
    const wholesaleSettings = await fetch(`${baseUrl}/api/settings`, { headers: { Cookie: wholesalerOne.cookie } });
    assert.equal(wholesaleSettings.status, 403);

    const conversationResponse = await write(wholesalerOne, '/api/conversations', { subject: 'Conversa E2E segura' });
    assert.equal(conversationResponse.status, 201);
    const conversation = await conversationResponse.json() as { id: string };

    const idor = await write(wholesalerTwo, '/api/messages', {
      conversationId: conversation.id,
      body: 'Tentativa de acesso cruzado',
      messageType: 'MESSAGE'
    });
    assert.equal(idor.status, 404);

    const hostileText = '<img src=x onerror=alert(1)><script>throw 1</script>';
    const stored = await write(wholesalerOne, '/api/messages', {
      conversationId: conversation.id,
      body: hostileText,
      messageType: 'MESSAGE'
    });
    assert.equal(stored.status, 201);
    const conversations = await fetch(`${baseUrl}/api/conversations`, { headers: { Cookie: wholesalerOne.cookie } });
    assert.equal(conversations.status, 200);
    const conversationPayload = await conversations.json() as { messages: readonly { body: string }[] };
    assert.ok(conversationPayload.messages.some((message) => message.body === hostileText));

    const client = await fetch(`${baseUrl}/app.js`);
    const clientSource = await client.text();
    assert.doesNotMatch(clientSource, /\.innerHTML\s*=/);
    assert.doesNotMatch(clientSource, /\beval\s*\(/);
    assert.match(clientSource, /textContent/);
    assert.match(clientSource, /skip-link/);
    assert.match(clientSource, /aria-live/);

    let limitedStatus = 0;
    for (let attempt = 0; attempt < 31; attempt += 1) {
      const response = await write(employee, '/api/messages', {});
      limitedStatus = response.status;
      if (attempt < 30) assert.notEqual(response.status, 429);
    }
    assert.equal(limitedStatus, 429);
  } finally {
    await new Promise<void>((resolve, reject) => application.server.close((error) => error ? reject(error) : resolve()));
    database.close();
    removeDatabase(databasePath);
  }
});
