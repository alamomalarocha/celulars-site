import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { catalogModuleSource, validateCatalog } from './catalog-rules.mjs';
import { createCatalogAdminServer, projectRoot, saveCatalogChanges } from './catalog-admin-server.mjs';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'celulars-catalog-manager-'));
const catalogPath = path.join(temporaryRoot, 'catalog-public.json');
const catalogModulePath = path.join(temporaryRoot, 'catalog-public.js');
const backupDirectory = path.join(temporaryRoot, 'backups');
const historyFile = path.join(temporaryRoot, 'history', 'catalog-changes.jsonl');
const distDirectory = path.join(temporaryRoot, 'dist');
const canonicalCatalogPath = path.join(projectRoot, 'data', 'catalog-public.json');
const originalSource = await readFile(canonicalCatalogPath, 'utf8');
const originalCatalog = JSON.parse(originalSource);
await writeFile(catalogPath, originalSource, 'utf8');
await writeFile(catalogModulePath, catalogModuleSource(originalCatalog), 'utf8');
await mkdir(distDirectory, { recursive: true });
await writeFile(path.join(distDirectory, 'index.html'), '<!doctype html>', 'utf8');

let validationGate = null;
let validationStarted = null;
let failNextValidation = false;
let buildGate = null;
let buildStarted = null;

const manager = createCatalogAdminServer({
  port: 0,
  catalogPath,
  catalogModulePath,
  backupDirectory,
  historyFile,
  distDirectory,
  validateProject: async () => {
    validationStarted?.resolve();
    if (validationGate) await validationGate.promise;
    if (failNextValidation) {
      failNextValidation = false;
      throw new Error('Falha de validacao simulada');
    }
    return { code: 0 };
  },
  buildProject: async () => {
    buildStarted?.resolve();
    if (buildGate) await buildGate.promise;
    return { validate: { code: 0 }, build: { code: 0 } };
  }
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
  const rejectedOrigin = await fetch(base, { headers: { Origin: 'https://example.invalid' } });
  assert.equal(rejectedOrigin.status, 403);

  const loaded = await getJson('/api/catalog');
  assert.equal(loaded.response.status, 200);
  assert.equal(loaded.payload.stats.newModels, 5);
  assert.equal(loaded.payload.stats.cpoModels, 26);
  assert.equal(loaded.payload.stats.cpoRegisteredCapacities, 83);

  const cpoProducts = loaded.payload.catalog.products.filter(product => product.group === 'cpo');
  const cpoProduct = cpoProducts[0];
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
  const exportedCatalog = await exported.json();
  assert.deepEqual(exportedCatalog, savedCatalog);
  assert.doesNotMatch(JSON.stringify(exportedCatalog), /(?:wholesale|supplier|vendor|margin|cost|customer|client|password|secret|token|backupPath|historyFile)/i);

  const invalidImport = structuredClone(savedCatalog);
  invalidImport.products[0].wholesaleCost = 10;
  const rejected = await postJson('/api/validate-import', { catalog: invalidImport });
  assert.equal(rejected.response.status, 400);
  assert.match(JSON.stringify(rejected.payload), /proibido/i);

  const changedMetadata = structuredClone(savedCatalog);
  changedMetadata.version = `${changedMetadata.version}-alterada`;
  const metadataRejected = await postJson('/api/validate-import', { catalog: changedMetadata });
  assert.equal(metadataRejected.response.status, 400);
  assert.match(JSON.stringify(metadataRejected.payload), /somente precos USD/i);

  const changedNewPrice = structuredClone(savedCatalog);
  const newProduct = changedNewPrice.products.find(product => product.group === 'new');
  const newCapacity = Object.keys(newProduct.capacities)[0];
  newProduct.capacities[newCapacity].usd += 1;
  const newPriceRejected = await postJson('/api/validate-import', { catalog: changedNewPrice });
  assert.equal(newPriceRejected.response.status, 400);
  assert.match(JSON.stringify(newPriceRejected.payload), /somente precos USD/i);

  for (const attack of ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '"><svg onload=alert(1)>']) {
    const malicious = structuredClone(savedCatalog);
    malicious.products[0].model = attack;
    const maliciousRejected = await postJson('/api/validate-import', { catalog: malicious });
    assert.equal(maliciousRejected.response.status, 400);
  }
  const appSource = await readFile(path.join(projectRoot, 'tools', 'catalog-manager', 'app.js'), 'utf8');
  assert.doesNotMatch(appSource, /\.(?:innerHTML|outerHTML)\s*=|insertAdjacentHTML\s*\(/);

  const validImport = structuredClone(savedCatalog);
  const secondCpo = validImport.products.find(product => product.group === 'cpo' && product.id !== cpoProduct.id);
  const secondCapacity = Object.keys(secondCpo.capacities)[0];
  secondCpo.capacities[secondCapacity].usd = 515;
  const beforeImportValidation = await readFile(catalogPath, 'utf8');
  const accepted = await postJson('/api/validate-import', { catalog: validImport });
  assert.equal(accepted.response.status, 200);
  assert.equal(accepted.payload.changes.length, 1);
  assert.equal(await readFile(catalogPath, 'utf8'), beforeImportValidation);

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
  assert.equal(await readFile(catalogModulePath, 'utf8'), catalogModuleSource(JSON.parse(beforeRollback)));

  const concurrentProduct = cpoProducts[2];
  const concurrentCapacity = Object.keys(concurrentProduct.capacities)[0];
  validationGate = deferred();
  validationStarted = deferred();
  const firstConcurrentSave = postJson('/api/save', { changes: [{ id: concurrentProduct.id, capacity: concurrentCapacity, usd: 630 }] });
  await validationStarted.promise;
  const readDuringSave = await getJson('/api/catalog');
  assert.equal(readDuringSave.response.status, 200);
  const secondConcurrentSave = await postJson('/api/save', { changes: [{ id: concurrentProduct.id, capacity: concurrentCapacity, usd: 640 }] });
  assert.equal(secondConcurrentSave.response.status, 409);
  assert.match(secondConcurrentSave.payload.error, /Outra operacao de gravacao ou build/i);
  validationGate.resolve();
  validationGate = null;
  validationStarted = null;
  const firstConcurrentResult = await firstConcurrentSave;
  assert.equal(firstConcurrentResult.response.status, 200);
  const afterConcurrent = JSON.parse(await readFile(catalogPath, 'utf8'));
  assert.equal(afterConcurrent.products.find(product => product.id === concurrentProduct.id).capacities[concurrentCapacity].usd, 630);
  assert.equal(validateCatalog(afterConcurrent).valid, true);

  buildGate = deferred();
  buildStarted = deferred();
  const beforeBuild = await readFile(catalogPath, 'utf8');
  const buildRequest = postJson('/api/build', {});
  await buildStarted.promise;
  const saveDuringBuild = await postJson('/api/save', { changes: [{ id: cpoProducts[3].id, capacity: Object.keys(cpoProducts[3].capacities)[0], usd: 650 }] });
  assert.equal(saveDuringBuild.response.status, 409);
  assert.equal(await readFile(catalogPath, 'utf8'), beforeBuild);
  buildGate.resolve();
  buildGate = null;
  buildStarted = null;
  const buildResult = await buildRequest;
  assert.equal(buildResult.response.status, 200);
  assert.equal(buildResult.payload.distFiles, 1);

  const recoveryProduct = cpoProducts[4];
  const recoveryCapacity = Object.keys(recoveryProduct.capacities)[0];
  failNextValidation = true;
  const failedSave = await postJson('/api/save', { changes: [{ id: recoveryProduct.id, capacity: recoveryCapacity, usd: 700 }] });
  assert.equal(failedSave.response.status, 500);
  assert.equal(failedSave.payload.rolledBack, true);
  const recoveredSave = await postJson('/api/save', { changes: [{ id: recoveryProduct.id, capacity: recoveryCapacity, usd: 701 }] });
  assert.equal(recoveredSave.response.status, 200);

  const rapidProduct = cpoProducts[5];
  const rapidCapacity = Object.keys(rapidProduct.capacities)[0];
  const backupsBeforeRapidSaves = await readdir(backupDirectory);
  const rapidOne = await postJson('/api/save', { changes: [{ id: rapidProduct.id, capacity: rapidCapacity, usd: 710 }] });
  const rapidTwo = await postJson('/api/save', { changes: [{ id: rapidProduct.id, capacity: rapidCapacity, usd: 711 }] });
  assert.equal(rapidOne.response.status, 200);
  assert.equal(rapidTwo.response.status, 200);
  const backupsAfterRapidSaves = await readdir(backupDirectory);
  assert.equal(backupsAfterRapidSaves.length, backupsBeforeRapidSaves.length + 2);
  assert.equal(new Set(backupsAfterRapidSaves).size, backupsAfterRapidSaves.length);

  const finalFixtureCatalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  assert.equal(validateCatalog(finalFixtureCatalog).valid, true);
  assert.equal(await readFile(catalogModulePath, 'utf8'), catalogModuleSource(finalFixtureCatalog));
  const historyLines = (await readFile(historyFile, 'utf8')).trim().split('\n');
  assert.equal(historyLines.length, 5);
  assert.equal(historyLines.every(line => {
    const entry = JSON.parse(line);
    return entry.previousUsd !== undefined && entry.newUsd !== undefined && entry.beforeHash && entry.afterHash;
  }), true);

  const negative = await postJson('/api/save', { changes: [{ id: cpoProduct.id, capacity, usd: -1 }] });
  assert.equal(negative.response.status, 400);
  const beforeHighValue = await readFile(catalogPath, 'utf8');
  const highValueWithoutConfirmation = await postJson('/api/save', { changes: [{ id: cpoProduct.id, capacity, usd: 10000.01 }] });
  assert.equal(highValueWithoutConfirmation.response.status, 400);
  assert.match(JSON.stringify(highValueWithoutConfirmation.payload), /confirmacao adicional/i);
  assert.equal(await readFile(catalogPath, 'utf8'), beforeHighValue);
  const wrongContentType = await fetch(`${base}/api/save`, { method: 'POST', body: '{}' });
  assert.equal(wrongContentType.status, 415);
  const oversizedPayload = await fetch(`${base}/api/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ padding: 'x'.repeat((2 * 1024 * 1024) + 1) })
  });
  assert.equal(oversizedPayload.status, 413);
  const healthyAfterRejectedRequest = await getJson('/api/catalog');
  assert.equal(healthyAfterRejectedRequest.response.status, 200);
  const traversal = await fetch(`${base}/package.json`);
  assert.equal(traversal.status, 404);
  assert.equal(await readFile(canonicalCatalogPath, 'utf8'), originalSource);

  console.log('Teste do gerenciador concluido sem alterar o catalogo real.');
  console.log('Leitura, importacao restrita, XSS, exportacao, lock, backup, historico, rollback e build aprovados.');
} finally {
  await manager.close();
  await rm(temporaryRoot, { recursive: true, force: true });
}
