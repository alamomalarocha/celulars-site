import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadConfig, type PlatformConfig } from './config.js';

export interface DoctorReport {
  readonly status: 'READY' | 'NOT_READY';
  readonly environment: string;
  readonly database: { readonly driver: string; readonly configured: boolean };
  readonly storage: { readonly mode: string; readonly configured: boolean };
  readonly email: { readonly mode: string; readonly simulated: boolean };
  readonly whatsapp: { readonly mode: string; readonly simulated: boolean };
  readonly cookies: { readonly secure: boolean; readonly isolatedName: boolean };
  readonly domain: { readonly url: string; readonly https: boolean };
  readonly migrations: { readonly directory: string };
  readonly logs: { readonly isolated: boolean };
  readonly features: PlatformConfig['features'];
  readonly missing: readonly string[];
  readonly simulatedResources: readonly string[];
  readonly realResources: readonly string[];
}

export function doctorReport(config: PlatformConfig): DoctorReport {
  const missing: string[] = [];
  if (!config.demo && config.databaseDriver !== 'external') missing.push('external database');
  if (!config.demo && config.storageMode !== 'external') missing.push('external storage');
  if (!config.demo && !config.secureCookies) missing.push('secure cookies');
  if (!config.demo && !config.allowedOrigin.startsWith('https://')) missing.push('https origin');
  const providers = [['email', config.emailMode], ['whatsapp', config.whatsappMode], ['storage', config.storageMode]] as const;
  return {
    status: missing.length === 0 ? 'READY' : 'NOT_READY',
    environment: config.environment,
    database: { driver: config.databaseDriver, configured: config.databaseDriver === 'sqlite' || Boolean(config.databaseUrl) },
    storage: { mode: config.storageMode, configured: config.storageMode !== 'disabled' },
    email: { mode: config.emailMode, simulated: config.emailMode === 'mock' },
    whatsapp: { mode: config.whatsappMode, simulated: config.whatsappMode === 'mock' },
    cookies: { secure: config.secureCookies, isolatedName: config.sessionCookieName.includes(config.environment.toLowerCase()) },
    domain: { url: config.publicUrl, https: config.publicUrl.startsWith('https://') },
    migrations: { directory: path.join(config.platformRoot, 'database', 'migrations') },
    logs: { isolated: config.logPath.includes(config.environment.toLowerCase()) },
    features: config.features,
    missing,
    simulatedResources: providers.filter(([, mode]) => mode === 'mock').map(([name]) => name),
    realResources: providers.filter(([, mode]) => mode === 'external').map(([name]) => name)
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(doctorReport(loadConfig()), null, 2));
  } catch (error) {
    console.error(JSON.stringify({ status: 'NOT_READY', error: error instanceof Error ? error.message : 'configuracao invalida' }, null, 2));
    process.exitCode = 1;
  }
}