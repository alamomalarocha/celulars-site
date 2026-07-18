import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { openDatabase } from '../database/db.js';
import { migrateDatabase } from '../database/migrate.js';
import { loadConfig } from '../src/config.js';
import { createPlatformApplication } from './app.js';

export function startPlatform(): void {
  const config = loadConfig();
  const database = openDatabase(config);
  migrateDatabase(database);
  const userCount = Number(database.prepare('SELECT COUNT(*) AS count FROM users').get()?.count ?? 0);
  if (userCount === 0) {
    database.close();
    throw new Error('Banco DEMO sem usuarios. Execute platform:seed ou platform:reset antes de iniciar.');
  }
  const application = createPlatformApplication(database, config);
  application.server.on('close', () => database.close());
  application.server.listen(config.port, config.host, () => {
    console.log(`CELULARS Plataforma ${config.environment} em ${config.allowedOrigin}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) startPlatform();
