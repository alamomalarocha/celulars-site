import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import test from 'node:test';
import { openDatabase, type PlatformDatabase } from '../database/db.js';
import { migrateDatabase } from '../database/migrate.js';
import { seedDatabase } from '../database/seed.js';
import { createPlatformApplication } from '../server/app.js';
import { AuthService } from '../server/auth.js';
import {
  auditData,
  createNotification,
  markAllNotificationsRead,
  markNotificationRead,
  notificationData,
  notifyCompany,
  recordAudit,
  reportsCsv,
  reportsData,
  settingsData,
  updateSetting
} from '../server/governance.js';
import type { Principal } from '../server/types.js';
import { loadConfig, type PlatformConfig } from '../src/config.js';

const password = 'Local-Demo-Governance-Test!';

function removeDatabase(filePath: string): void {
  for (const candidate of [filePath, `${filePath}-wal`, `${filePath}-shm`]) {
    if (existsSync(candidate)) rmSync(candidate);
  }
}

function fixture(name: string): {
  readonly database: PlatformDatabase;
  readonly config: PlatformConfig;
  readonly admin: Principal;
  readonly employee: Principal;
  readonly wholesale1: Principal;
  readonly wholesale2: Principal;
  readonly close: () => void;
} {
  const base = loadConfig();
  const databasePath = path.join(base.platformRoot, 'data', `${name}-${process.pid}.sqlite`);
  const config = loadConfig({ databasePath, allowedOrigin: 'http://platform.demo.test', sessionSecret: `${name}-secret-that-is-long-enough` });
  removeDatabase(databasePath);
  const database = openDatabase(config);
  migrateDatabase(database);
  seedDatabase(database, config, password);
  const auth = new AuthService(database, config);
  const context = { ipAddress: '127.0.0.1', userAgent: 'governance-test' };
  return {
    database,
    config,
    admin: auth.login('admin@demo.invalid', password, context).principal,
    employee: auth.login('funcionario1@demo.invalid', password, context).principal,
    wholesale1: auth.login('atacadista1@demo.invalid', password, context).principal,
    wholesale2: auth.login('atacadista2@demo.invalid', password, context).principal,
    close: () => {
      database.close();
      removeDatabase(databasePath);
    }
  };
}

test('audit records role and context without secrets', () => {
  const setup = fixture('governance-audit-test');
  try {
    const id = recordAudit(setup.database, setup.admin, 'UPDATE', 'USER', 'user-demo-admin', {
      before: { displayName: 'Antes', password: 'never-store-me', nested: { token: 'also-secret' } },
      after: { displayName: 'Depois', sessionId: 'private-session' },
      companyId: 'company-demo-internal', ipAddress: '127.0.0.1', userAgent: 'test-agent'
    });
    const row = setup.database.prepare('SELECT * FROM audit_events WHERE id=?').get(id);
    assert.equal(row?.actor_role, 'ADMIN');
    assert.equal(row?.company_id, 'company-demo-internal');
    const serialized = `${String(row?.before_json)}${String(row?.after_json)}`;
    assert.doesNotMatch(serialized, /never-store-me|also-secret|private-session/);
    assert.match(serialized, /\[REDACTED\]/);
    const filtered = auditData(setup.database, setup.admin, { action: 'UPDATE', entityType: 'USER' }) as { events: readonly object[] };
    assert.ok(filtered.events.length >= 1);
  } finally {
    setup.close();
  }
});

test('notifications stay scoped, deduplicated and readable only by their owner', () => {
  const setup = fixture('governance-notifications-test');
  try {
    notifyCompany(setup.database, 'company-demo-1', {
      type: 'ORDER_UPDATED', title: 'Pedido DEMO', body: 'Atualizacao ficticia.', entityType: 'ORDER', entityId: 'order-demo-0001', dedupeKey: 'ORDER:1'
    });
    notifyCompany(setup.database, 'company-demo-1', {
      type: 'ORDER_UPDATED', title: 'Pedido DEMO', body: 'Atualizacao ficticia.', entityType: 'ORDER', entityId: 'order-demo-0001', dedupeKey: 'ORDER:1'
    });
    const first = notificationData(setup.database, setup.wholesale1) as { notifications: readonly Record<string, unknown>[]; unread: number };
    const second = notificationData(setup.database, setup.wholesale2) as { notifications: readonly Record<string, unknown>[] };
    const created = first.notifications.find((item) => item.entity_id === 'order-demo-0001');
    assert.ok(created);
    assert.equal(second.notifications.some((item) => item.entity_id === 'order-demo-0001'), false);
    assert.throws(() => markNotificationRead(setup.database, setup.wholesale2, String(created.id)), /NOTIFICATION_NOT_FOUND/);
    const read = markNotificationRead(setup.database, setup.wholesale1, String(created.id)) as { readAt: string };
    assert.ok(read.readAt);
    const all = markAllNotificationsRead(setup.database, setup.wholesale1) as { updated: number };
    assert.ok(all.updated >= 0);
    const duplicateCount = Number(setup.database.prepare("SELECT COUNT(*) AS count FROM notifications WHERE user_id=? AND dedupe_key='ORDER:1'").get(setup.wholesale1.userId)?.count);
    assert.equal(duplicateCount, 1);
    createNotification(setup.database, { userId: setup.employee.userId, type: 'TEST', title: 'DEMO', body: 'DEMO' });
  } finally {
    setup.close();
  }
});

test('settings remain DEMO-only and validate protected commercial defaults', () => {
  const setup = fixture('governance-settings-test');
  try {
    const before = settingsData(setup.database) as { settings: readonly Record<string, unknown>[] };
    assert.ok(before.settings.some((item) => item.setting_key === 'demo_mode' && item.setting_value === 'true'));
    const updated = updateSetting(setup.database, setup.admin, 'reservation_minutes', '90') as { value: string; previousValue: string };
    assert.equal(updated.value, '90');
    assert.equal(updated.previousValue, '60');
    assert.throws(() => updateSetting(setup.database, setup.admin, 'demo_mode', 'false'), /INVALID_SETTING/);
    assert.throws(() => updateSetting(setup.database, setup.admin, 'celulares_adjustment', '99'), /INVALID_SETTING/);
  } finally {
    setup.close();
  }
});

test('reports are explicitly DEMO and isolate wholesale companies', () => {
  const setup = fixture('governance-reports-test');
  try {
    const admin = reportsData(setup.database, setup.admin) as Record<string, unknown>;
    const wholesale = reportsData(setup.database, setup.wholesale1) as Record<string, unknown>;
    assert.equal(admin.banner, 'AMBIENTE DE DEMONSTRACAO - DADOS FICTICIOS');
    assert.equal(wholesale.scope, 'COMPANY');
    assert.equal(wholesale.companyId, 'company-demo-1');
    assert.equal('employeeActivity' in wholesale, false);
    assert.ok(Array.isArray(admin.employeeActivity));
    const csv = reportsCsv(setup.database, setup.wholesale1);
    assert.match(csv, /^"environment","section"/);
    assert.match(csv, /"DEMO"/);
    assert.doesNotMatch(csv, /company-demo-2/);
  } finally {
    setup.close();
  }
});

test('governance HTTP routes enforce RBAC and company report scope', async () => {
  const setup = fixture('governance-http-test');
  const application = createPlatformApplication(setup.database, setup.config);
  await new Promise<void>((resolve) => application.server.listen(0, '127.0.0.1', resolve));
  const address = application.server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function login(email: string): Promise<{ cookie: string; csrf: string }> {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: setup.config.allowedOrigin },
      body: JSON.stringify({ email, password })
    });
    assert.equal(response.status, 200);
    const payload = await response.json() as { user: { csrfToken: string } };
    return { cookie: (response.headers.get('set-cookie') ?? '').split(';')[0] ?? '', csrf: payload.user.csrfToken };
  }

  try {
    const admin = await login('admin@demo.invalid');
    const employee = await login('funcionario1@demo.invalid');
    const wholesale = await login('atacadista1@demo.invalid');
    assert.equal((await fetch(`${baseUrl}/api/settings`, { headers: { Cookie: admin.cookie } })).status, 200);
    assert.equal((await fetch(`${baseUrl}/api/settings`, { headers: { Cookie: employee.cookie } })).status, 403);
    const employeeAudit = await fetch(`${baseUrl}/api/audit`, { headers: { Cookie: employee.cookie } });
    assert.equal(employeeAudit.status, 200);
    assert.equal((await employeeAudit.json() as { limited: boolean }).limited, true);
    assert.equal((await fetch(`${baseUrl}/api/audit`, { headers: { Cookie: wholesale.cookie } })).status, 403);
    const reportResponse = await fetch(`${baseUrl}/api/reports`, { headers: { Cookie: wholesale.cookie } });
    assert.equal(reportResponse.status, 200);
    assert.equal((await reportResponse.json() as { companyId: string }).companyId, 'company-demo-1');
    const updateResponse = await fetch(`${baseUrl}/api/settings/reservation_minutes`, {
      method: 'PATCH',
      headers: { Cookie: admin.cookie, Origin: setup.config.allowedOrigin, 'X-CSRF-Token': admin.csrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: '120' })
    });
    assert.equal(updateResponse.status, 200);
    assert.equal(Number(setup.database.prepare("SELECT COUNT(*) AS count FROM audit_events WHERE action='SETTINGS_CHANGE'").get()?.count), 1);
  } finally {
    await new Promise<void>((resolve, reject) => application.server.close((error) => error ? reject(error) : resolve()));
    setup.close();
  }
});
