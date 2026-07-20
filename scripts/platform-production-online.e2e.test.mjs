import test from 'node:test';
import assert from 'node:assert/strict';

test('Cloudflare Access protects the operational panel', async () => {
  const response = await fetch('https://painel.celulars.com.br/', { redirect: 'manual' });
  assert.equal(response.status, 302);
  assert.match(response.headers.get('location') ?? '', /^https:\/\/black-hall-e4fd\.cloudflareaccess\.com\/cdn-cgi\/access\/login\//);
});

test('workers.dev cannot bypass Access', async () => {
  const response = await fetch('https://celulars-platform.alamomalarocha.workers.dev/', { redirect: 'manual' });
  assert.equal(response.status, 404);
});

test('public CELULARS site remains available', async () => {
  for (const path of ['/', '/iphones', '/sobre', '/acessos', '/contato']) {
    const response = await fetch(`https://celulars.com.br${path}`);
    assert.equal(response.status, 200, path);
  }
});

test('Access publishes JWT verification keys', async () => {
  const response = await fetch('https://black-hall-e4fd.cloudflareaccess.com/cdn-cgi/access/certs');
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(Array.isArray(payload.keys) || Array.isArray(payload.public_certs));
});
