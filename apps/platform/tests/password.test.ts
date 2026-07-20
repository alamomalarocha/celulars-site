import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, verifyPassword } from '../server/password.js';

test('password hashes use bounded versioned scrypt and constant-time verification', () => {
  const password = 'Strong-Demo-Password-2026!';
  const value = hashPassword(password);
  assert.match(value.hash, /^scrypt\$v1\$N=16384,r=8,p=1,l=32\$[A-Za-z0-9_-]{22,128}\$[a-f0-9]{64}$/);
  assert.equal(verifyPassword(password, value.salt, value.hash), true);
  assert.equal(verifyPassword('wrong-password', value.salt, value.hash), false);
  assert.equal(verifyPassword(password, 'bad salt!', value.hash), false);
  assert.equal(verifyPassword(password, value.salt, value.hash.replace('scrypt$v1$', 'scrypt$v2$')), false);
  assert.equal(verifyPassword(password, value.salt, value.hash.replace('N=16384', 'N=1048576')), false);
  assert.equal(verifyPassword(password, value.salt, 'unknown$v1$params$salt$hash'), false);
});