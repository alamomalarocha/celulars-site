import path from 'node:path';
import { fileURLToPath } from 'node:url';

const platformRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const repositoryRoot = path.resolve(platformRoot, '..', '..');

function integerEnvironment(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export interface PlatformConfig {
  readonly demo: true;
  readonly host: string;
  readonly port: number;
  readonly databasePath: string;
  readonly credentialsPath: string;
  readonly platformRoot: string;
  readonly repositoryRoot: string;
  readonly sessionSecret: string;
}

export function loadConfig(overrides: Partial<PlatformConfig> = {}): PlatformConfig {
  if ((process.env.CELULARS_PLATFORM_DEMO ?? '1') !== '1') {
    throw new Error('A plataforma local exige CELULARS_PLATFORM_DEMO=1.');
  }

  const configuredDatabase = process.env.PLATFORM_DATABASE_PATH;
  const databasePath = configuredDatabase
    ? path.resolve(repositoryRoot, configuredDatabase)
    : path.join(platformRoot, 'data', 'platform-demo.sqlite');
  const sessionSecret = process.env.PLATFORM_SESSION_SECRET ?? 'demo-local-secret-must-be-replaced-before-any-shared-preview';

  return {
    demo: true,
    host: process.env.PLATFORM_HOST ?? '127.0.0.1',
    port: integerEnvironment('PLATFORM_PORT', 4178),
    databasePath,
    credentialsPath: path.join(platformRoot, 'data', 'demo-credentials.json'),
    platformRoot,
    repositoryRoot,
    sessionSecret,
    ...overrides
  };
}

export function assertDemoDatabasePath(config: PlatformConfig): void {
  const expectedRoot = path.join(config.platformRoot, 'data');
  const relative = path.relative(expectedRoot, config.databasePath);
  if (relative.startsWith('..') || path.isAbsolute(relative) || !config.databasePath.endsWith('.sqlite')) {
    throw new Error(`Caminho de banco DEMO inseguro: ${config.databasePath}`);
  }
}

