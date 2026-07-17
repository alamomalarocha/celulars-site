import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { assertDemoDatabasePath, loadConfig } from '../src/config.js';
import { openDatabase } from '../database/db.js';
import { migrateDatabase } from '../database/migrate.js';
import { seedDatabase } from '../database/seed.js';

function sha256(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function removeDatabase(filePath: string): void {
  for (const candidate of [filePath, `${filePath}-wal`, `${filePath}-shm`]) {
    if (existsSync(candidate)) rmSync(candidate);
  }
}

test('migration and seed create a complete isolated DEMO database', () => {
  const base = loadConfig();
  const databasePath = path.join(base.platformRoot, 'data', `platform-test-${process.pid}.sqlite`);
  const config = loadConfig({ databasePath, credentialsPath: path.join(base.platformRoot, 'data', `credentials-test-${process.pid}.json`) });
  const protectedFiles = [
    path.join(config.repositoryRoot, 'data', 'catalog-public.json'),
    path.join(config.repositoryRoot, 'data', 'wholesale-inventory.json')
  ];
  const before = protectedFiles.map(sha256);
  removeDatabase(databasePath);
  const database = openDatabase(config);

  try {
    assert.deepEqual(migrateDatabase(database), ['001_initial.sql']);
    assert.deepEqual(migrateDatabase(database), []);
    const summary = seedDatabase(database, config, 'Local-Demo-Test-Only!');
    assert.deepEqual(summary, {
      admin: 1,
      employees: 3,
      wholesalers: 5,
      companies: 5,
      customers: 15,
      requests: 20,
      quotes: 10,
      orders: 8,
      messages: 30,
      products: 31,
      variants: 424
    });
    assert.equal(Number(database.prepare("SELECT COUNT(*) AS count FROM users WHERE email = 'admin@demo.invalid'").get()?.count), 1);
    assert.equal(Number(database.prepare('SELECT COUNT(*) AS count FROM inventory_movements').get()?.count), 36);
    assert.equal(Number(database.prepare('SELECT COUNT(*) AS count FROM notifications').get()?.count), 12);
    assert.equal(Number(database.prepare('SELECT COUNT(*) AS count FROM audit_events').get()?.count), 12);
    assert.equal(Number(database.prepare("SELECT COUNT(*) AS count FROM companies WHERE demo_identifier LIKE 'DEMO-%'").get()?.count), 6);
  } finally {
    database.close();
    removeDatabase(databasePath);
  }

  assert.deepEqual(protectedFiles.map(sha256), before);
});

test('database safety rejects paths outside apps/platform/data', () => {
  const base = loadConfig();
  const unsafe = loadConfig({ databasePath: path.join(base.repositoryRoot, 'unsafe.sqlite') });
  assert.throws(() => assertDemoDatabasePath(unsafe), /Caminho de banco DEMO inseguro/);
});
