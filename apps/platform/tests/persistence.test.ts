import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createDemoBackup, testDemoRestore } from '../database/backup.js';
import { openDatabase } from '../database/db.js';
import { migrateDatabase } from '../database/migrate.js';
import { persistenceAdapter } from '../database/persistence.js';
import { seedDatabase } from '../database/seed.js';
import { loadConfig } from '../src/config.js';

function remove(file: string): void { for (const candidate of [file, `${file}-wal`, `${file}-shm`]) if (existsSync(candidate)) rmSync(candidate); }

test('persistence health and backup restore remain isolated and verified', () => {
  const base = loadConfig();
  const databasePath = path.join(base.platformRoot, 'data', `backup-test-${process.pid}.sqlite`);
  const config = loadConfig({ databasePath, credentialsPath: path.join(base.platformRoot, 'data', `backup-credentials-${process.pid}.json`) });
  remove(databasePath);
  const database = openDatabase(config);
  try { migrateDatabase(database); seedDatabase(database, config, 'Backup-Demo-Test-Only!'); } finally { database.close(); }
  const health = persistenceAdapter(config).health();
  assert.equal(health.ok, true);
  assert.equal(health.migrations, 7);
  const backup = createDemoBackup(config, new Date('2026-07-18T16:00:00.000Z'));
  try {
    assert.equal(backup.manifest.productionBackup, false);
    assert.equal(testDemoRestore(backup.directory, config).ok, true);
  } finally {
    rmSync(backup.directory, { recursive: true, force: true });
    remove(databasePath);
  }
});

test('external persistence adapter fails closed before provisioning', () => {
  const config = loadConfig({}, {
    PLATFORM_ENVIRONMENT: 'STAGING', PLATFORM_SESSION_SECRET: 'staging-secret-with-at-least-32-characters',
    PLATFORM_ALLOWED_ORIGIN: 'https://staging.example.invalid', PLATFORM_SECURE_COOKIES: '1',
    PLATFORM_DATABASE_DRIVER: 'postgresql', PLATFORM_DATABASE_URL: 'postgresql://runtime.invalid/database',
    PLATFORM_STORAGE_MODE: 'external'
  });
  const adapter = persistenceAdapter(config);
  assert.equal(adapter.health().ok, false);
  assert.throws(() => adapter.open(), /runtime deve ser provisionado/);
});