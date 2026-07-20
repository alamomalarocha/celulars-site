import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 32;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
const SCRYPT_PARAMETERS = `N=${SCRYPT_COST},r=${SCRYPT_BLOCK_SIZE},p=${SCRYPT_PARALLELIZATION},l=${SCRYPT_KEY_LENGTH}`;

function validSalt(value: string): boolean { return /^[A-Za-z0-9_-]{22,128}$/.test(value); }

export function hashPassword(password: string, salt = randomBytes(18).toString('base64url')): { hash: string; salt: string } {
  if (password.length < 12) throw new Error('INVALID_PASSWORD_POLICY');
  if (!validSalt(salt)) throw new Error('INVALID_PASSWORD_SALT');
  const derived = scryptSync(password, salt, SCRYPT_KEY_LENGTH, { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELIZATION, maxmem: SCRYPT_MAX_MEMORY });
  return { hash: `scrypt$v1$${SCRYPT_PARAMETERS}$${salt}$${derived.toString('hex')}`, salt };
}

export function verifyPassword(password: string, salt: string, stored: string): boolean {
  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    if (parts.length !== 5 || parts[0] !== 'scrypt' || parts[1] !== 'v1' || parts[2] !== SCRYPT_PARAMETERS || parts[3] !== salt || !validSalt(salt) || !/^[a-f0-9]{64}$/i.test(parts[4] ?? '')) return false;
    const actual = scryptSync(password, salt, SCRYPT_KEY_LENGTH, { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELIZATION, maxmem: SCRYPT_MAX_MEMORY });
    const expected = Buffer.from(parts[4]!, 'hex');
    return expected.length === actual.length && timingSafeEqual(actual, expected);
  }
  if (!/^[a-f0-9]{128}$/i.test(stored)) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(stored, 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}