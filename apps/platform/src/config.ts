import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type PlatformEnvironment = 'DEMO' | 'TEST' | 'STAGING' | 'PRODUCTION';
export type ProviderMode = 'mock' | 'disabled' | 'external';

export interface PlatformFeatureFlags {
  readonly publicPlatform: boolean;
  readonly wholesaleLogin: boolean;
  readonly employeeLogin: boolean;
  readonly externalMessages: boolean;
  readonly realEmail: boolean;
  readonly realWhatsApp: boolean;
  readonly documents: boolean;
  readonly mfa: boolean;
  readonly reports: boolean;
  readonly returns: boolean;
  readonly imports: boolean;
  readonly integrations: boolean;
}

const platformRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const repositoryRoot = path.resolve(platformRoot, '..', '..');
const allowedEnvironments = new Set<PlatformEnvironment>(['DEMO', 'TEST', 'STAGING', 'PRODUCTION']);

function integerEnvironment(source: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const value = Number.parseInt(source[name] ?? '', 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function booleanEnvironment(source: NodeJS.ProcessEnv, name: string, fallback: boolean): boolean {
  const value = source[name]?.trim().toLowerCase();
  if (value === undefined || value === '') return fallback;
  if (value === '1' || value === 'true') return true;
  if (value === '0' || value === 'false') return false;
  throw new Error(`${name} deve ser true ou false.`);
}

function requiredEnvironment(source: NodeJS.ProcessEnv, name: string): string {
  const value = source[name]?.trim();
  if (!value) throw new Error(`Variavel obrigatoria ausente: ${name}.`);
  return value;
}

function providerMode(source: NodeJS.ProcessEnv, name: string, fallback: ProviderMode): ProviderMode {
  const value = (source[name]?.trim().toLowerCase() || fallback) as ProviderMode;
  if (!['mock', 'disabled', 'external'].includes(value)) throw new Error(`${name} possui modo invalido.`);
  return value;
}

function environmentName(source: NodeJS.ProcessEnv): PlatformEnvironment {
  const legacyDemo = source.CELULARS_PLATFORM_DEMO;
  const value = (source.PLATFORM_ENVIRONMENT?.trim().toUpperCase() || (legacyDemo === '0' ? 'PRODUCTION' : 'DEMO')) as PlatformEnvironment;
  if (!allowedEnvironments.has(value)) throw new Error('PLATFORM_ENVIRONMENT deve ser DEMO, TEST, STAGING ou PRODUCTION.');
  return value;
}

export interface PlatformConfig {
  readonly environment: PlatformEnvironment;
  readonly demo: boolean;
  readonly host: string;
  readonly port: number;
  readonly databaseDriver: 'sqlite' | 'external';
  readonly databasePath: string;
  readonly databaseUrl?: string;
  readonly credentialsPath: string;
  readonly platformRoot: string;
  readonly repositoryRoot: string;
  readonly sessionSecret: string;
  readonly sessionCookieName: string;
  readonly sessionTtlMinutes: number;
  readonly sessionRotationMinutes: number;
  readonly allowedOrigin: string;
  readonly publicUrl: string;
  readonly secureCookies: boolean;
  readonly storageMode: ProviderMode;
  readonly storagePath: string;
  readonly emailMode: ProviderMode;
  readonly whatsappMode: ProviderMode;
  readonly mfaRequiredRoles: readonly string[];
  readonly logPath: string;
  readonly features: PlatformFeatureFlags;
}

export function loadConfig(overrides: Partial<PlatformConfig> = {}, source: NodeJS.ProcessEnv = process.env): PlatformConfig {
  const environment = environmentName(source);
  const demo = environment === 'DEMO' || environment === 'TEST';
  const host = source.PLATFORM_HOST ?? '127.0.0.1';
  const port = integerEnvironment(source, 'PLATFORM_PORT', environment === 'TEST' ? 4179 : 4178);
  const databasePath = source.PLATFORM_DATABASE_PATH
    ? path.resolve(repositoryRoot, source.PLATFORM_DATABASE_PATH)
    : path.join(platformRoot, 'data', `platform-${environment.toLowerCase()}.sqlite`);
  const databaseDriver = (source.PLATFORM_DATABASE_DRIVER ?? 'sqlite').toLowerCase() === 'sqlite' ? 'sqlite' : 'external';
  const sessionSecret = demo
    ? source.PLATFORM_SESSION_SECRET ?? 'demo-local-secret-must-be-replaced-before-any-shared-preview'
    : requiredEnvironment(source, 'PLATFORM_SESSION_SECRET');
  const allowedOrigin = source.PLATFORM_ALLOWED_ORIGIN ?? `http://${host}:${port}`;
  const secureCookies = booleanEnvironment(source, 'PLATFORM_SECURE_COOKIES', !demo);
  if (!demo && !secureCookies) throw new Error('Cookies Secure sao obrigatorios em STAGING e PRODUCTION.');
  if (!demo && !allowedOrigin.startsWith('https://')) throw new Error('HTTPS e obrigatorio em STAGING e PRODUCTION.');
  const storageMode = providerMode(source, 'PLATFORM_STORAGE_MODE', demo ? 'mock' : 'external');
  const emailMode = providerMode(source, 'PLATFORM_EMAIL_MODE', demo ? 'mock' : 'disabled');
  const whatsappMode = providerMode(source, 'PLATFORM_WHATSAPP_MODE', demo ? 'mock' : 'disabled');
  const features: PlatformFeatureFlags = {
    publicPlatform: booleanEnvironment(source, 'PLATFORM_FEATURE_PUBLIC', false),
    wholesaleLogin: booleanEnvironment(source, 'PLATFORM_FEATURE_WHOLESALE_LOGIN', true),
    employeeLogin: booleanEnvironment(source, 'PLATFORM_FEATURE_EMPLOYEE_LOGIN', true),
    externalMessages: booleanEnvironment(source, 'PLATFORM_FEATURE_EXTERNAL_MESSAGES', false),
    realEmail: booleanEnvironment(source, 'PLATFORM_FEATURE_REAL_EMAIL', false),
    realWhatsApp: booleanEnvironment(source, 'PLATFORM_FEATURE_REAL_WHATSAPP', false),
    documents: booleanEnvironment(source, 'PLATFORM_FEATURE_DOCUMENTS', demo),
    mfa: booleanEnvironment(source, 'PLATFORM_FEATURE_MFA', false),
    reports: booleanEnvironment(source, 'PLATFORM_FEATURE_REPORTS', true),
    returns: booleanEnvironment(source, 'PLATFORM_FEATURE_RETURNS', demo),
    imports: booleanEnvironment(source, 'PLATFORM_FEATURE_IMPORTS', false),
    integrations: booleanEnvironment(source, 'PLATFORM_FEATURE_INTEGRATIONS', false)
  };
  if (features.publicPlatform) throw new Error('PLATFORM_FEATURE_PUBLIC deve permanecer false nesta fase.');
  if (features.realEmail && emailMode !== 'external') throw new Error('E-mail real exige PLATFORM_EMAIL_MODE=external.');
  if (features.realWhatsApp && whatsappMode !== 'external') throw new Error('WhatsApp real exige PLATFORM_WHATSAPP_MODE=external.');
  const config: PlatformConfig = {
    environment,
    demo,
    host,
    port,
    databaseDriver,
    databasePath,
    ...(source.PLATFORM_DATABASE_URL ? { databaseUrl: source.PLATFORM_DATABASE_URL } : {}),
    credentialsPath: path.join(platformRoot, 'data', 'demo-credentials.json'),
    platformRoot,
    repositoryRoot,
    sessionSecret,
    sessionCookieName: source.PLATFORM_SESSION_COOKIE_NAME ?? `celulars_platform_${environment.toLowerCase()}_session`,
    sessionTtlMinutes: integerEnvironment(source, 'PLATFORM_SESSION_TTL_MINUTES', 480),
    sessionRotationMinutes: integerEnvironment(source, 'PLATFORM_SESSION_ROTATION_MINUTES', 30),
    allowedOrigin,
    publicUrl: source.PLATFORM_PUBLIC_URL ?? allowedOrigin,
    secureCookies,
    storageMode,
    storagePath: path.resolve(repositoryRoot, source.PLATFORM_STORAGE_PATH ?? `apps/platform/data/storage-${environment.toLowerCase()}`),
    emailMode,
    whatsappMode,
    mfaRequiredRoles: (source.PLATFORM_MFA_REQUIRED_ROLES ?? '').split(',').map((value) => value.trim().toUpperCase()).filter(Boolean),
    logPath: path.resolve(repositoryRoot, source.PLATFORM_LOG_PATH ?? `apps/platform/data/logs-${environment.toLowerCase()}`),
    features,
    ...overrides
  };
  validatePlatformConfig(config);
  return config;
}

export function validatePlatformConfig(config: PlatformConfig): void {
  if (config.sessionSecret.length < 32) throw new Error('PLATFORM_SESSION_SECRET deve ter pelo menos 32 caracteres.');
  if (config.databaseDriver === 'external' && !config.databaseUrl) throw new Error('PLATFORM_DATABASE_URL e obrigatoria para banco externo.');
  if (!config.demo && config.databaseDriver === 'sqlite') throw new Error('STAGING e PRODUCTION exigem banco persistente externo.');
  if (!config.demo && config.storageMode !== 'external') throw new Error('STAGING e PRODUCTION exigem storage externo.');
}

export function assertDemoDatabasePath(config: PlatformConfig): void {
  if (!config.demo || config.databaseDriver !== 'sqlite') throw new Error('Operacao permitida somente em banco SQLite DEMO ou TEST.');
  const expectedRoot = path.join(config.platformRoot, 'data');
  const relative = path.relative(expectedRoot, config.databasePath);
  if (relative.startsWith('..') || path.isAbsolute(relative) || !config.databasePath.endsWith('.sqlite')) {
    throw new Error(`Caminho de banco DEMO inseguro: ${config.databasePath}`);
  }
}