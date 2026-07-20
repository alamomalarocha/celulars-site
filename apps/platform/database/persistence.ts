import type { PlatformConfig } from '../src/config.js';
import { openDatabase, type PlatformDatabase } from './db.js';

export interface PersistenceHealth {
  readonly ok: boolean;
  readonly driver: string;
  readonly migrations: number;
  readonly detail: string;
}

export interface PersistenceAdapter {
  readonly kind: 'sqlite' | 'external';
  open(): PlatformDatabase;
  health(): PersistenceHealth;
}

export class SqlitePersistenceAdapter implements PersistenceAdapter {
  readonly kind = 'sqlite' as const;
  constructor(private readonly config: PlatformConfig) {}
  open(): PlatformDatabase { return openDatabase(this.config); }
  health(): PersistenceHealth {
    const database = this.open();
    try {
      const integrity = String(database.prepare('PRAGMA integrity_check').get()?.integrity_check ?? 'unknown');
      const migrations = Number(database.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='schema_migrations'").get()?.count ?? 0) > 0
        ? Number(database.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get()?.count ?? 0) : 0;
      return { ok: integrity === 'ok', driver: 'sqlite', migrations, detail: integrity };
    } finally { database.close(); }
  }
}

export class ExternalPersistenceAdapter implements PersistenceAdapter {
  readonly kind = 'external' as const;
  constructor(private readonly config: PlatformConfig) {}
  open(): PlatformDatabase {
    throw new Error(`Adaptador externo ${this.config.databaseUrl ? 'configurado' : 'nao configurado'}; runtime deve ser provisionado antes da ativacao.`);
  }
  health(): PersistenceHealth {
    return { ok: false, driver: 'external', migrations: 0, detail: 'Recurso externo nao provisionado nesta fase.' };
  }
}

export function persistenceAdapter(config: PlatformConfig): PersistenceAdapter {
  return config.databaseDriver === 'sqlite' ? new SqlitePersistenceAdapter(config) : new ExternalPersistenceAdapter(config);
}