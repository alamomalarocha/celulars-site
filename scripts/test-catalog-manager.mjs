import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { catalogModuleSource } from './catalog-rules.mjs';
import { createCatalogAdminServer, projectRoot, saveCatalogChanges } from './catalog-admin-server.mjs';

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'celulars-catalog-manager-'));
const catalogPath = path.join(temporaryRoot, 'catalog-public.json');
const catalogModulePath = path.join(temporaryRoot, 'catalog-public.js');
const backupDirectory = path.join(temporaryRoot, 'backups');
const historyFile = path.join(temporaryRoot, 'history', 'catalog-changes.jsonl');
const originalSource = await readFile(path.join(projectRoot, 'data', 'catalog-public.json'), 'utf8');
const originalCatalog = JSON.parse(originalSource);
await writeFile(catalogPath, originalSource, 'utf8');
await writeFile(catalogModulePath, catalogModuleSource(originalCatalog), 'utf8');

const manager = createCatalogAdminServer({
  port: 0,
  catalogPath,
  catalogModulePath,
  backupDirectory,
  historyFile,
  validateProject: async () => ({ code: 0 }),
  buildProject: async () => ({ validate: { code: 0 }, build: { code: 0 } })
});

try {
  const address = await manager.listen();
  const base = `http://127.0.0.1:${address.port}`;
  const getJson = async route => {
    const response = await fetch(`${base}${route}`);
    return { response, payload: await response.json() };
  };
  const postJson = async (route, body) => {
    const response = await fetch(`${base}${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { response, payload: await response.json() };
  };

  const home = await fetch(base);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Gerenciador de cat.logo CELULARS/i);

  const loaded = await getJson('/api/catalog');
  assert.equal(loaded.response.status, 200);
  assert.equal(loaded.payload.stats.newModels, 5);
  assert.equal(loaded.payload.stats.cpoModels, 26);
  assert.equal(loaded.payload.stats.cpoRegisteredCapacities, 83);

  const cpoProduct = loaded.payload.catalog.products.find(product => product.group === 'cpo');
  const capacity = Object.keys(cpoProduct.capacities)[0];
  const firstSave = await postJson('/api/save', { changes: [{ id: cpoProduct.id, capacity, usd: 625 }] });
  assert.equal(firstSave.response.status, 200);
  assert.equal(firstSave.payload.ok, true);
  assert.equal((await readdir(backupDirectory)).length, 1);
  assert.match(await readFile(historyFile, 'utf8'), /"newUsd":625/);

  const savedCatalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  assert.equal(savedCatalog.products.find(product => product.id === cpoProduct.id).capacities[capacity].usd, 625);

  const exported = await fetch(`${base}/api/export/current`);
  assert.equal(exported.status, 200);
  assert.match(exported.headers.get('content-disposition'), /catalog-public\.json/);

  const invalidImport = structuredClone(savedCatalog);
  invalidImport.products[0].wholesaleCost = 10;
  const rejected = await postJson('/api/validate-import', { catalog: invalidImport });
  assert.equal(rejected.response.status, 400);
  assert.match(JSON.stringify(rejected.payload), /proibido/i);

  const validImport = structuredClone(savedCatalog);
  const secondCpo = validImport.products.find(product => product.group === 'cpo' && product.id !== cpoProduct.id);
  const secondCapacity = Object.keys(secondCpo.capacities)[0];
  secondCpo.capacities[secondCapacity].usd = 515;
  const accepted = await postJson('/api/validate-import', { catalog: validImport });
  assert.equal(accepted.response.status, 200);
  assert.equal(accepted.payload.changes.length, 1);

  const beforeRollback = await readFile(catalogPath, 'utf8');
  const rolledBack = await saveCatalogChanges({
    changes: [{ id: secondCpo.id, capacity: secondCapacity, usd: 515 }],
    catalogPath,
    catalogModulePath,
    backupDirectory,
    historyFile,
    validateProject: async () => { throw new Error('Falha de validacao simulada'); }
  });
  assert.equal(rolledBack.ok, false);
  assert.equal(rolledBack.rolledBack, true);
  assert.equal(await readFile(catalogPath, 'utf8'), beforeRollback);

  const negative = await postJson('/api/save', { changes: [{ id: cpoProduct.id, capacity, usd: -1 }] });
  assert.equal(negative.response.status, 400);
  const traversal = await fetch(`${base}/package.json`);
  assert.equal(traversal.status, 404);

  console.log('Teste do gerenciador concluido sem alterar o catalogo real.');
  console.log('Leitura, fixture, diff/import, backup, historico, rollback e exportacao aprovados.');
} finally {
  await manager.close();
  await rm(temporaryRoot, { recursive: true, force: true });
}
