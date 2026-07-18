import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { assertDemoDatabasePath, loadConfig, type PlatformConfig } from '../src/config.js';
import { openDatabase } from './db.js';

export interface BackupManifest {
  readonly environment: string;
  readonly createdAt: string;
  readonly databaseFile: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly productionBackup: false;
}

function sha256(file: string): string { return createHash('sha256').update(readFileSync(file)).digest('hex'); }

export function createDemoBackup(config: PlatformConfig = loadConfig(), now = new Date()): { directory: string; manifest: BackupManifest } {
  assertDemoDatabasePath(config);
  if (!existsSync(config.databasePath)) throw new Error('Banco DEMO inexistente para backup.');
  const database = openDatabase(config);
  try { database.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } finally { database.close(); }
  const stamp = now.toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const directory = path.join(config.platformRoot, 'data', 'backups', stamp);
  mkdirSync(directory, { recursive: true });
  const databaseFile = path.join(directory, 'platform-demo.sqlite');
  copyFileSync(config.databasePath, databaseFile);
  const manifest: BackupManifest = {
    environment: config.environment,
    createdAt: now.toISOString(),
    databaseFile: path.basename(databaseFile),
    sha256: sha256(databaseFile),
    bytes: readFileSync(databaseFile).byteLength,
    productionBackup: false
  };
  writeFileSync(path.join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  return { directory, manifest };
}

export function testDemoRestore(directory: string, config: PlatformConfig = loadConfig()): { ok: boolean; sha256: string } {
  assertDemoDatabasePath(config);
  const manifest = JSON.parse(readFileSync(path.join(directory, 'manifest.json'), 'utf8')) as BackupManifest;
  const source = path.join(directory, manifest.databaseFile);
  if (sha256(source) !== manifest.sha256) throw new Error('Checksum do backup DEMO invalido.');
  const restorePath = path.join(config.platformRoot, 'data', `restore-test-${process.pid}.sqlite`);
  copyFileSync(source, restorePath);
  try {
    const database = new DatabaseSync(restorePath, { readOnly: true });
    try {
      const integrity = String(database.prepare('PRAGMA integrity_check').get()?.integrity_check ?? 'unknown');
      return { ok: integrity === 'ok', sha256: sha256(restorePath) };
    } finally { database.close(); }
  } finally { if (existsSync(restorePath)) rmSync(restorePath); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const backup = createDemoBackup();
  console.log(JSON.stringify({ directory: backup.directory, manifest: backup.manifest, restoreTest: testDemoRestore(backup.directory) }, null, 2));
}