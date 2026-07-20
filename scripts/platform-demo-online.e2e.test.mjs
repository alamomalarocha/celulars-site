import test from 'node:test';
import assert from 'node:assert/strict';

test('Cloudflare Access intercepts unauthenticated requests', async () => {
  const response = await fetch('https://demo.celulars.com.br/', { redirect: 'manual' });
  assert.equal(response.status, 302);
  const location = response.headers.get('location');
  assert.match(location ?? '', /^https:\/\/black-hall-e4fd\.cloudflareaccess\.com\/cdn-cgi\/access\/login\//);
  assert.match(location ?? '', /kid=362043cdec4196415f61bd494b9f2a4bbb58f1cabb9a59aceb285eb38605894f/);
});

test('workers.dev cannot bypass Access', async () => {
  const response = await fetch('https://celulars-platform-demo.alamomalarocha.workers.dev/', { redirect: 'manual' });
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
