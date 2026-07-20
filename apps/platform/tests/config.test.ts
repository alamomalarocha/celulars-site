import assert from 'node:assert/strict';
import test from 'node:test';
import { doctorReport } from '../src/doctor.js';
import { loadConfig } from '../src/config.js';

const cleanEnvironment: NodeJS.ProcessEnv = {};

test('multi-environment config isolates demo and test resources', () => {
  const demo = loadConfig({}, cleanEnvironment);
  const testConfig = loadConfig({}, { PLATFORM_ENVIRONMENT: 'TEST' });
  assert.equal(demo.environment, 'DEMO');
  assert.equal(demo.databaseDriver, 'sqlite');
  assert.equal(demo.storageMode, 'mock');
  assert.equal(demo.features.publicPlatform, false);
  assert.notEqual(demo.databasePath, testConfig.databasePath);
  assert.notEqual(demo.sessionCookieName, testConfig.sessionCookieName);
  assert.notEqual(demo.logPath, testConfig.logPath);
  assert.equal(doctorReport(demo).status, 'READY');
});

test('staging and production fail closed without protected resources', () => {
  assert.throws(() => loadConfig({}, { PLATFORM_ENVIRONMENT: 'STAGING' }), /PLATFORM_SESSION_SECRET/);
  assert.throws(() => loadConfig({}, {
    PLATFORM_ENVIRONMENT: 'PRODUCTION',
    PLATFORM_SESSION_SECRET: 'production-secret-with-at-least-32-characters',
    PLATFORM_ALLOWED_ORIGIN: 'https://platform.example.invalid',
    PLATFORM_SECURE_COOKIES: '1'
  }), /banco persistente externo/);
});

test('production accepts explicit external adapters and keeps real features disabled', () => {
  const config = loadConfig({}, {
    PLATFORM_ENVIRONMENT: 'PRODUCTION',
    PLATFORM_SESSION_SECRET: 'production-secret-with-at-least-32-characters',
    PLATFORM_ALLOWED_ORIGIN: 'https://platform.example.invalid',
    PLATFORM_PUBLIC_URL: 'https://platform.example.invalid',
    PLATFORM_SECURE_COOKIES: '1',
    PLATFORM_DATABASE_DRIVER: 'postgresql',
    PLATFORM_DATABASE_URL: 'postgresql://configured-at-runtime.invalid/database',
    PLATFORM_STORAGE_MODE: 'external',
    PLATFORM_EMAIL_MODE: 'disabled',
    PLATFORM_WHATSAPP_MODE: 'disabled'
  });
  assert.equal(config.demo, false);
  assert.equal(config.databaseDriver, 'external');
  assert.equal(config.features.publicPlatform, false);
  assert.equal(config.features.realEmail, false);
  assert.equal(config.features.realWhatsApp, false);
  assert.equal(doctorReport(config).status, 'READY');
});

test('public platform and inconsistent real providers fail closed', () => {
  assert.throws(() => loadConfig({}, { PLATFORM_FEATURE_PUBLIC: 'true' }), /deve permanecer false/);
  assert.throws(() => loadConfig({}, { PLATFORM_FEATURE_REAL_EMAIL: 'true' }), /E-mail real exige/);
  assert.throws(() => loadConfig({}, { PLATFORM_FEATURE_REAL_WHATSAPP: 'true' }), /WhatsApp real exige/);
});