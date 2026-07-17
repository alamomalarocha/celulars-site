import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertDemoDatabasePath, loadConfig } from '../src/config.js';
import { openDatabase } from './db.js';
import { migrateDatabase } from './migrate.js';
import { seedDatabase } from './seed.js';

export function resetDemoDatabase(password: string): void {
  const config = loadConfig();
  assertDemoDatabasePath(config);
  if (existsSync(config.databasePath)) rmSync(config.databasePath);
  for (const suffix of ['-wal', '-shm']) {
    const journalPath = `${config.databasePath}${suffix}`;
    if (existsSync(journalPath)) rmSync(journalPath);
  }
  const database = openDatabase(config);
  try {
    migrateDatabase(database);
    const summary = seedDatabase(database, config, password);
    console.log(`Banco DEMO restaurado: ${JSON.stringify(summary)}`);
  } finally {
    database.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const password = process.env.PLATFORM_DEMO_PASSWORD?.trim();
  if (!password) throw new Error('Defina PLATFORM_DEMO_PASSWORD para executar o reset DEMO pela linha de comando.');
  resetDemoDatabase(password);
}

