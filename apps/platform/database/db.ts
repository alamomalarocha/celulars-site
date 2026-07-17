import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { assertDemoDatabasePath, loadConfig, type PlatformConfig } from '../src/config.js';

export type PlatformDatabase = DatabaseSync;

export function openDatabase(config: PlatformConfig = loadConfig()): PlatformDatabase {
  assertDemoDatabasePath(config);
  mkdirSync(path.dirname(config.databasePath), { recursive: true });
  const database = new DatabaseSync(config.databasePath);
  database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  return database;
}

export function withTransaction<T>(database: PlatformDatabase, operation: () => T): T {
  database.exec('BEGIN IMMEDIATE');
  try {
    const result = operation();
    database.exec('COMMIT');
    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

