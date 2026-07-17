import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { openDatabase, withTransaction, type PlatformDatabase } from './db.js';

const migrationsDirectory = path.join(loadConfig().platformRoot, 'database', 'migrations');

export function migrateDatabase(database: PlatformDatabase = openDatabase()): string[] {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
  const applied = new Set(
    database.prepare('SELECT version FROM schema_migrations').all().map((row) => String(row.version))
  );
  const migrations = readdirSync(migrationsDirectory)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();
  const executed: string[] = [];

  for (const migration of migrations) {
    if (applied.has(migration)) continue;
    const sql = readFileSync(path.join(migrationsDirectory, migration), 'utf8');
    withTransaction(database, () => {
      database.exec(sql);
      database.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
        .run(migration, new Date().toISOString());
    });
    executed.push(migration);
  }
  return executed;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const database = openDatabase();
  try {
    const executed = migrateDatabase(database);
    console.log(executed.length ? `Migrations aplicadas: ${executed.join(', ')}` : 'Banco DEMO ja esta atualizado.');
  } finally {
    database.close();
  }
}
