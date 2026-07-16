import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, mkdtemp, mkdir, readFile, readdir, rename, rm, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  INVENTORY_CSV_COLUMNS,
  MAX_INVENTORY_CSV_BYTES,
  exportAvailabilityCsv,
  exportInventoryCsv,
  inventoryCsvRows,
  validateInventoryCsv
} from './inventory-csv.mjs';
import { createCatalogAdminServer, projectRoot } from './catalog-admin-server.mjs';
import {
  applyInventoryChanges,
  catalogInventoryRows,
  createInitialInventory,
  enrichInventory,
  inventoryAlerts,
  inventoryContentHash,
  validateInventory,
  validateInventoryChanges
} from './inventory-rules.mjs';
import {
  atomicWriteInventoryFile,
  initializeInventory,
  listInventoryBackups,
  readInventory,
  readInventoryHistory,
  restoreInventoryBackup,
  saveInventoryChanges
} from './inventory-service.mjs';
import { unsafeUnicodeOccurrences } from './unicode-rules.mjs';
import { privateArtifactViolation } from './artifact-privacy-rules.mjs';

function deferred() {
  let resolve;
  const promise = new Promise(resolvePromise => { resolve = resolvePromise; });
  return { promise, resolve };
}

function sha256(source) {
  return createHash('sha256').update(source).digest('hex');
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvFromRows(rows, columns = INVENTORY_CSV_COLUMNS) {
  const lines = [columns.join(';')];
  for (const row of rows) lines.push(columns.map(column => csvCell(row[column])).join(';'));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

function changedCsv(inventory, catalog, hash, patch, rowIndex = 0) {
  const row = { ...inventoryCsvRows(inventory, catalog, hash)[rowIndex], ...patch };
  return csvFromRows([row]);
}

const canonicalCatalogPath = path.join(projectRoot, 'data', 'catalog-public.json');
const canonicalSourceBefore = await readFile(canonicalCatalogPath, 'utf8');
const canonicalHashBefore = sha256(canonicalSourceBefore);
const catalog = JSON.parse(canonicalSourceBefore);
const privateInventoryPath = path.join(projectRoot, 'data', 'inventory-private.json');
let privateInventorySourceBefore = null;
try {
  privateInventorySourceBefore = await readFile(privateInventoryPath, 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const now = '2026-07-14T18:00:00.000Z';
const expectedCatalogRows = catalogInventoryRows(catalog);
const expectedNewRows = expectedCatalogRows.filter(row => row.group === 'new').length;
const expectedCpoRows = expectedCatalogRows.filter(row => row.group === 'cpo').length;
assert.equal(expectedCatalogRows.length, expectedNewRows + expectedCpoRows);

// A. Estrutura real inicial: todas as combinacoes, sem estoque inventado.
const inventory = createInitialInventory(catalog, { now });
assert.equal(inventory.items.length, expectedCatalogRows.length);
assert.equal(inventory.items.every(item => item.stock_on_hand === 0 && item.reserved === 0), true);
assert.equal(inventory.items.every(item => item.low_stock_threshold === 1 && item.status === 'active' && item.notes === '' && item.color === null), true);
assert.equal(inventory.items.every(item => Number.isFinite(Date.parse(item.updated_at))), true);
assert.equal(validateInventory(inventory, catalog).valid, true);
const inventorySource = jsonText(inventory);
const inventoryHash = inventoryContentHash(inventorySource);
const rows = inventoryCsvRows(inventory, catalog, inventoryHash);
assert.equal(rows.length, expectedCatalogRows.length);

// Exportacoes usam BOM, ponto e virgula e CRLF.
const exported = exportInventoryCsv(inventory, catalog, inventoryHash);
assert.equal(exported.csv.charCodeAt(0), 0xfeff);
assert.equal(exported.csv.endsWith('\r\n'), true);
assert.match(exported.csv, /;/);
const availability = exportAvailabilityCsv(inventory, catalog);
assert.equal(availability.rows.length, expectedCatalogRows.length);
assert.match(availability.csv, /price_status/);

// O scanner compartilhado bloqueia controles em fontes, sem rejeitar portugues legitimo.
assert.deepEqual(unsafeUnicodeOccurrences('Ação, preço, CPO e R$.'), []);
for (const [source, codePoint] of [
  ['\uFEFFfonte com BOM', 0xfeff],
  ['texto\u202Ebidirecional', 0x202e],
  ['texto\u2060formatado', 0x2060],
  ['texto\u0000controle', 0x0000]
]) {
  const occurrences = unsafeUnicodeOccurrences(source);
  assert.equal(occurrences.length, 1);
  assert.equal(occurrences[0].codePoint, codePoint);
  assert.equal(Number.isInteger(occurrences[0].line) && Number.isInteger(occurrences[0].column), true);
}
assert.equal(unsafeUnicodeOccurrences(exported.csv)[0].codePoint, 0xfeff, 'O BOM e intencional somente no CSV gerado.');

// A mesma regra usada pelo build deve rejeitar vazamentos intencionais por caminho e conteudo.
for (const leakedPath of [
  'data/inventory-private.example.json',
  'nested/tools/catalog-manager/index.html',
  'private/backups/inventory.json',
  'scripts/inventory-service.mjs'
]) {
  assert.ok(privateArtifactViolation(leakedPath), `Vazamento por caminho nao bloqueado: ${leakedPath}`);
}
for (const leakedSource of [
  '{"stock_on_hand":3}',
  'window.inventory_hash="segredo";',
  'fetch("/api/inventory/save")',
  'inventory-changes.jsonl'
]) {
  assert.equal(privateArtifactViolation('public/test.html', leakedSource)?.type, 'content');
}
assert.equal(privateArtifactViolation('iphones.html', 'Disponibilidade e precos sob consulta.'), null);

// B-C. Estoque e reserva validos.
let result = validateInventoryCsv(inventory, catalog, inventoryHash, changedCsv(inventory, catalog, inventoryHash, { stock_on_hand: '5' }));
assert.equal(result.valid, true);
assert.equal(result.changes[0].after.stock_on_hand, 5);
result = validateInventoryCsv(inventory, catalog, inventoryHash, changedCsv(inventory, catalog, inventoryHash, { stock_on_hand: '5', reserved: '2' }));
assert.equal(result.valid, true);
assert.equal(result.changes[0].after.reserved, 2);

// D-H. Regras numericas e status.
for (const [patch, message] of [
  [{ stock_on_hand: '1', reserved: '2' }, /reserved/i],
  [{ stock_on_hand: '-1' }, /formula|inteiro/i],
  [{ stock_on_hand: '1.5' }, /inteiro/i],
  [{ low_stock_threshold: '-1' }, /formula|inteiro/i],
  [{ status: 'vendido' }, /status/i]
]) {
  result = validateInventoryCsv(inventory, catalog, inventoryHash, changedCsv(inventory, catalog, inventoryHash, patch));
  assert.equal(result.valid, false);
  assert.match(JSON.stringify(result.errors), message);
}

// I. Combinacao inexistente.
result = validateInventoryCsv(inventory, catalog, inventoryHash, changedCsv(inventory, catalog, inventoryHash, { inventory_id: 'inexistente__1-tb' }));
assert.equal(result.valid, false);
assert.match(JSON.stringify(result.errors), /inexistente/i);

// J. ID duplicado.
const duplicate = { ...rows[0], stock_on_hand: '1' };
result = validateInventoryCsv(inventory, catalog, inventoryHash, csvFromRows([duplicate, duplicate]));
assert.equal(result.valid, false);
assert.match(JSON.stringify(result.errors), /duplicado/i);

// K. Hash antigo.
result = validateInventoryCsv(inventory, catalog, inventoryHash, changedCsv(inventory, catalog, 'hash-antigo', { stock_on_hand: '1' }));
assert.equal(result.valid, false);
assert.equal(result.summary.conflicts > 0, true);

// L. Formula/injecao CSV em qualquer coluna.
for (const patch of [
  { notes: '=1+1' },
  { notes: '+SUM(1;2)' },
  { notes: '-IMPORTXML("https://invalid")' },
  { notes: '@command' },
  { notes: '=HYPERLINK("https://invalid")' },
  { notes: "=cmd|' /C calc'!A0" },
  { model: '@command' }
]) {
  result = validateInventoryCsv(inventory, catalog, inventoryHash, changedCsv(inventory, catalog, inventoryHash, patch));
  assert.equal(result.valid, false);
  assert.match(JSON.stringify(result.errors), /formula|comando/i);
}
const formulaInventory = structuredClone(inventory);
formulaInventory.items[0].notes = '=1+1';
assert.match(exportInventoryCsv(formulaInventory, catalog).csv, /'=1\+1/, 'A exportacao deve neutralizar formulas textuais.');

// Campos estruturais sao imutaveis; linha ausente e campos editaveis vazios nao alteram.
for (const patch of [{ price_usd: '999.00' }, { available: '99' }, { capacity: 'inexistente' }, { product_id: 'outro-produto' }]) {
  result = validateInventoryCsv(inventory, catalog, inventoryHash, changedCsv(inventory, catalog, inventoryHash, patch));
  assert.equal(result.valid, false);
}
result = validateInventoryCsv(inventory, catalog, inventoryHash, changedCsv(inventory, catalog, inventoryHash, {
  stock_on_hand: '', reserved: '', low_stock_threshold: '', status: '', notes: ''
}));
assert.equal(result.valid, true);
assert.equal(result.changes.length, 0);

// M. Texto XSS e aceito como dado, mas a UI usa apenas textContent.
for (const xssNote of [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '"><svg onload=alert(1)>',
  '</textarea><script>alert(1)</script>'
]) {
  result = validateInventoryCsv(inventory, catalog, inventoryHash, changedCsv(inventory, catalog, inventoryHash, { notes: xssNote }));
  assert.equal(result.valid, true);
  assert.equal(result.changes[0].after.notes, xssNote);
}
const inventoryUi = await readFile(path.join(projectRoot, 'tools', 'catalog-manager', 'inventory.js'), 'utf8');
assert.doesNotMatch(inventoryUi, /\.innerHTML\s*=/);
assert.doesNotMatch(inventoryUi, /insertAdjacentHTML|\.outerHTML\s*=/);
assert.match(inventoryUi, /textContent/);

// Dados demonstrativos sao isolados e rejeitados como producao.
const demoInventory = createInitialInventory(catalog, { demo: true, now });
assert.deepEqual(demoInventory.items.slice(0, 3).map(item => item.stock_on_hand), [3, 2, 1]);
assert.equal(validateInventory(demoInventory, catalog, { allowDemo: true }).valid, true);
assert.equal(validateInventory(demoInventory, catalog).valid, false);
const demoExample = JSON.parse(await readFile(path.join(projectRoot, 'data', 'inventory-private.example.json'), 'utf8'));
assert.equal(demoExample.demo, true);
assert.equal(demoExample.items.every(item => /ficticio/i.test(item.notes)), true);
const managerHtml = await readFile(path.join(projectRoot, 'tools', 'catalog-manager', 'index.html'), 'utf8');
assert.match(managerHtml, /MODO DEMONSTRAÇÃO/);
if (privateInventorySourceBefore) {
  const privateInventory = JSON.parse(privateInventorySourceBefore);
  assert.equal(privateInventory.demo, false);
  assert.equal(validateInventory(privateInventory, catalog).valid, true);
}

// Arquivo acima de 2 MB.
const oversized = `x${'0'.repeat(MAX_INVENTORY_CSV_BYTES)}`;
result = validateInventoryCsv(inventory, catalog, inventoryHash, oversized);
assert.equal(result.valid, false);
assert.match(JSON.stringify(result.errors), /2 MB/);

// Disponibilidade e sempre derivada; reserved > stock continua sendo erro estrutural.
for (const [stock, reserved, expectedAvailable, expectedValid] of [
  [5, 0, 5, true],
  [5, 2, 3, true],
  [5, 5, 0, true],
  [5, 6, null, false],
  [0, 0, 0, true]
]) {
  const direct = applyInventoryChanges(inventory, catalog, [{
    inventory_id: inventory.items[0].inventory_id,
    stock_on_hand: stock,
    reserved,
    low_stock_threshold: 1,
    status: 'active',
    notes: 'teste'
  }], { now: '2026-07-14T18:01:00.000Z' });
  assert.equal(direct.valid, expectedValid);
  if (expectedValid) assert.equal(enrichInventory(direct.inventory, catalog)[0].available, expectedAvailable);
}

// Reserva maior que o estoque ainda livre e aviso, nao erro estrutural.
const reservedWarningInventory = structuredClone(inventory);
Object.assign(reservedWarningInventory.items[0], { stock_on_hand: 5, reserved: 3 });
assert.equal(validateInventory(reservedWarningInventory, catalog).valid, true);
const reservedWarning = inventoryAlerts(reservedWarningInventory, catalog).find(alert => alert.type === 'reserved_over_free_stock');
assert.ok(reservedWarning);
assert.match(reservedWarning.message, /estoque ainda livre/i);

// Estoque CPO sem preco exige confirmacao, sem sugerir ou alterar preco.
const cpoZeroRow = expectedCatalogRows.find(row => row.group === 'cpo' && row.price_usd === 0);
const newRow = expectedCatalogRows.find(row => row.group === 'new');
assert.ok(cpoZeroRow && newRow);
const editableChange = (row, stock_on_hand, reserved = 0) => ({
  inventory_id: row.inventory_id,
  stock_on_hand,
  reserved,
  low_stock_threshold: 1,
  status: 'active',
  notes: ''
});
for (const stock of [1, 4]) {
  const blocked = validateInventoryChanges(inventory, catalog, [editableChange(cpoZeroRow, stock)]);
  assert.equal(blocked.valid, false);
  assert.match(blocked.warnings[0].message, /ainda nao possui preco CPO publicado/i);
  const confirmed = validateInventoryChanges(inventory, catalog, [editableChange(cpoZeroRow, stock)], { confirmStockWithoutPrice: true });
  assert.equal(confirmed.valid, true);
  assert.equal(confirmed.warnings.length, 1);
}
assert.equal(validateInventoryChanges(inventory, catalog, [editableChange(cpoZeroRow, 0)]).warnings.length, 0);
assert.equal(validateInventoryChanges(inventory, catalog, [editableChange(newRow, 1)]).warnings.length, 0);
const positivePriceCatalog = structuredClone(catalog);
const positiveProduct = positivePriceCatalog.products.find(product => product.id === cpoZeroRow.product_id);
positiveProduct.capacities[cpoZeroRow.capacity].usd = 123;
assert.equal(validateInventoryChanges(inventory, positivePriceCatalog, [editableChange(cpoZeroRow, 1)]).warnings.length, 0);

// Criacao inicial ocorre somente em fixture, e uma segunda tentativa nao sobrescreve.
const initializationRoot = await mkdtemp(path.join(os.tmpdir(), 'celulars-inventory-initialize-'));
try {
  const initializationPath = path.join(initializationRoot, 'inventory-private.json');
  const initializationHistory = path.join(initializationRoot, 'history', 'inventory-changes.jsonl');
  const initialized = await initializeInventory({
    catalog,
    catalogHash: canonicalHashBefore,
    expectedCatalogHash: canonicalHashBefore,
    inventoryPath: initializationPath,
    backupDirectory: path.join(initializationRoot, 'backups'),
    historyFile: initializationHistory,
    now
  });
  assert.equal(initialized.ok, true);
  assert.equal(initialized.inventory.items.length, expectedCatalogRows.length);
  assert.equal(initialized.inventory.items.every(item => item.stock_on_hand === 0 && item.reserved === 0), true);
  const duplicateInitialization = await initializeInventory({
    catalog,
    catalogHash: canonicalHashBefore,
    expectedCatalogHash: canonicalHashBefore,
    inventoryPath: initializationPath,
    backupDirectory: path.join(initializationRoot, 'backups'),
    historyFile: initializationHistory,
    now
  });
  assert.equal(duplicateInitialization.ok, false);
  assert.equal(duplicateInitialization.status, 409);
} finally {
  await rm(initializationRoot, { recursive: true, force: true });
}

// Escrita atomica substitui arquivo existente no Windows e remove temporarios em falhas.
const atomicRoot = await mkdtemp(path.join(os.tmpdir(), 'celulars-inventory-atomic-'));
try {
  const atomicPath = path.join(atomicRoot, 'inventory-private.json');
  await writeFile(atomicPath, 'anterior', 'utf8');
  await atomicWriteInventoryFile(atomicPath, 'novo');
  assert.equal(await readFile(atomicPath, 'utf8'), 'novo');

  for (const failureStage of ['write', 'read', 'rename']) {
    await writeFile(atomicPath, 'anterior', 'utf8');
    let temporaryPath = null;
    await assert.rejects(() => atomicWriteInventoryFile(atomicPath, 'novo', {
      writeFile: async (filePath, contents, encoding) => {
        temporaryPath = filePath;
        if (failureStage === 'write') throw new Error('falha ao escrever temporario');
        return writeFile(filePath, contents, encoding);
      },
      readFile: async (filePath, encoding) => {
        if (failureStage === 'read') throw new Error('falha ao reler temporario');
        return readFile(filePath, encoding);
      },
      rename: async (source, destination) => {
        if (failureStage === 'rename') throw new Error('falha no rename');
        return rename(source, destination);
      },
      unlink
    }));
    assert.equal(await readFile(atomicPath, 'utf8'), 'anterior');
    if (temporaryPath) await assert.rejects(() => access(temporaryPath));
  }
} finally {
  await rm(atomicRoot, { recursive: true, force: true });
}

// Rollback, historico atomico, backups unicos e restore seguro em fixture.
const serviceRoot = await mkdtemp(path.join(os.tmpdir(), 'celulars-inventory-service-'));
try {
  const serviceInventoryPath = path.join(serviceRoot, 'inventory-private.json');
  const serviceBackups = path.join(serviceRoot, 'backups');
  const serviceHistory = path.join(serviceRoot, 'history', 'inventory-changes.jsonl');
  await writeFile(serviceInventoryPath, inventorySource, 'utf8');
  const newItem = inventory.items.find(item => item.inventory_id === newRow.inventory_id);
  assert.ok(newItem);
  const serviceChange = stock => editableChange(newRow, stock);

  let currentService = await readInventory(serviceInventoryPath, catalog);
  const beforeAfterWriteFailure = currentService.source;
  let serviceResult = await saveInventoryChanges({
    inventoryPath: serviceInventoryPath,
    catalog,
    changes: [serviceChange(1)],
    expectedInventoryHash: currentService.contentHash,
    backupDirectory: serviceBackups,
    historyFile: serviceHistory,
    afterWrite: async () => { throw new Error('falha apos escrita'); }
  });
  assert.equal(serviceResult.ok, false);
  assert.equal(serviceResult.rolledBack, true);
  assert.equal(await readFile(serviceInventoryPath, 'utf8'), beforeAfterWriteFailure);

  currentService = await readInventory(serviceInventoryPath, catalog);
  serviceResult = await saveInventoryChanges({
    inventoryPath: serviceInventoryPath,
    catalog,
    changes: [serviceChange(1)],
    expectedInventoryHash: currentService.contentHash,
    backupDirectory: serviceBackups,
    historyFile: serviceHistory,
    writeHistory: async () => { throw new Error('falha no historico'); }
  });
  assert.equal(serviceResult.ok, false);
  assert.equal(serviceResult.rolledBack, true);
  assert.equal(await readFile(serviceInventoryPath, 'utf8'), currentService.source);

  currentService = await readInventory(serviceInventoryPath, catalog);
  const firstSave = await saveInventoryChanges({
    inventoryPath: serviceInventoryPath,
    catalog,
    changes: [serviceChange(1)],
    expectedInventoryHash: currentService.contentHash,
    backupDirectory: serviceBackups,
    historyFile: serviceHistory,
    now: '2026-07-14T18:10:00.000Z'
  });
  assert.equal(firstSave.ok, true);
  currentService = await readInventory(serviceInventoryPath, catalog);
  const secondSave = await saveInventoryChanges({
    inventoryPath: serviceInventoryPath,
    catalog,
    changes: [serviceChange(2)],
    expectedInventoryHash: currentService.contentHash,
    backupDirectory: serviceBackups,
    historyFile: serviceHistory,
    now: '2026-07-14T18:10:00.000Z'
  });
  assert.equal(secondSave.ok, true);
  assert.notEqual(firstSave.backupName, secondSave.backupName);
  const backups = await listInventoryBackups(serviceBackups, catalog);
  assert.equal(backups.length >= 4, true);
  assert.equal(new Set(backups.map(backup => backup.name)).size, backups.length);

  currentService = await readInventory(serviceInventoryPath, catalog);
  assert.equal((await restoreInventoryBackup({
    inventoryPath: serviceInventoryPath,
    backupDirectory: serviceBackups,
    historyFile: serviceHistory,
    backupName: '../inventory-private.json',
    expectedInventoryHash: currentService.contentHash,
    catalog
  })).status, 400);
  assert.equal((await restoreInventoryBackup({
    inventoryPath: serviceInventoryPath,
    backupDirectory: serviceBackups,
    historyFile: serviceHistory,
    backupName: secondSave.backupName,
    expectedInventoryHash: 'hash-antigo',
    catalog
  })).status, 409);

  const corruptBackupName = 'inventory-private-20260714-181500-deadbeef.json';
  await writeFile(path.join(serviceBackups, corruptBackupName), '{invalido', 'utf8');
  assert.equal((await restoreInventoryBackup({
    inventoryPath: serviceInventoryPath,
    backupDirectory: serviceBackups,
    historyFile: serviceHistory,
    backupName: corruptBackupName,
    expectedInventoryHash: currentService.contentHash,
    catalog
  })).status, 400);

  const restored = await restoreInventoryBackup({
    inventoryPath: serviceInventoryPath,
    backupDirectory: serviceBackups,
    historyFile: serviceHistory,
    backupName: secondSave.backupName,
    expectedInventoryHash: currentService.contentHash,
    catalog,
    now: '2026-07-14T18:20:00.000Z'
  });
  assert.equal(restored.ok, true);
  assert.ok(restored.safetyBackup);
  assert.equal(restored.inventory.items.find(item => item.inventory_id === newRow.inventory_id).stock_on_hand, 1);
  assert.equal((await readInventoryHistory(serviceHistory)).some(entry => entry.type === 'restore'), true);
} finally {
  await rm(serviceRoot, { recursive: true, force: true });
}

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'celulars-inventory-'));
const catalogPath = path.join(temporaryRoot, 'catalog-public.json');
const inventoryPath = path.join(temporaryRoot, 'inventory-private.json');
const inventoryBackupDirectory = path.join(temporaryRoot, 'backups');
const inventoryHistoryFile = path.join(temporaryRoot, 'history', 'inventory-changes.jsonl');
const distDirectory = path.join(temporaryRoot, 'dist');
await writeFile(catalogPath, canonicalSourceBefore, 'utf8');
await writeFile(inventoryPath, inventorySource, 'utf8');
await mkdir(distDirectory, { recursive: true });
await writeFile(path.join(distDirectory, 'index.html'), '<!doctype html>', 'utf8');

let writeGate = null;
let writeStarted = null;
let failNextWrite = false;
const manager = createCatalogAdminServer({
  port: 0,
  catalogPath,
  catalogModulePath: null,
  inventoryPath,
  inventoryBackupDirectory,
  inventoryHistoryFile,
  backupDirectory: path.join(temporaryRoot, 'catalog-backups'),
  historyFile: path.join(temporaryRoot, 'history', 'catalog.jsonl'),
  distDirectory,
  validateProject: async () => ({ code: 0 }),
  buildProject: async () => ({ validate: { code: 0 }, build: { code: 0 } }),
  inventoryWriteFile: async (filePath, source) => {
    writeStarted?.resolve();
    if (writeGate) await writeGate.promise;
    if (failNextWrite) {
      failNextWrite = false;
      throw new Error('Falha de escrita simulada');
    }
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, source, 'utf8');
  }
});

try {
  const address = await manager.listen();
  const base = `http://127.0.0.1:${address.port}`;
  const postJson = async (route, body) => {
    const response = await fetch(`${base}${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { response, payload: await response.json() };
  };
  const postCsv = async (route, source, expectedHash = '', confirm = false) => {
    const response = await fetch(`${base}${route}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'X-Inventory-Hash': expectedHash,
        'X-Confirm-Stock-Without-Price': String(confirm),
        'X-Import-Filename': 'estoque-teste.csv'
      },
      body: source
    });
    return { response, payload: await response.json() };
  };
  const currentCsv = async (patch, rowIndex = 0) => {
    const source = await readFile(inventoryPath, 'utf8');
    const current = JSON.parse(source);
    const hash = inventoryContentHash(source);
    return { source: changedCsv(current, catalog, hash, patch, rowIndex), hash };
  };

  // Servidor local aplica cabecalhos privados e rejeita Origin externo.
  const inventoryResponse = await fetch(`${base}/api/inventory`);
  assert.equal(inventoryResponse.status, 200);
  assert.equal(inventoryResponse.headers.get('cache-control'), 'no-store');
  assert.equal(inventoryResponse.headers.get('x-content-type-options'), 'nosniff');
  assert.match(inventoryResponse.headers.get('content-security-policy') || '', /default-src 'none'/);
  assert.equal((await fetch(`${base}/api/inventory`, { headers: { Origin: 'https://invalid.example' } })).status, 403);

  // Rotas privadas de exportacao e validacao.
  for (const [route, filename] of [['/api/inventory/export.csv', 'estoque-privado-celulars.csv'], ['/api/inventory/availability.csv', 'disponibilidade-interna-celulars.csv']]) {
    const response = await fetch(`${base}${route}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-disposition'), new RegExp(filename.replace('.', '\\.')));
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer()).slice(0, 3)], [0xef, 0xbb, 0xbf]);
  }
  let sample = await currentCsv({ stock_on_hand: '4' });
  let checked = await postCsv('/api/inventory/validate.csv', sample.source);
  assert.equal(checked.response.status, 200);
  assert.equal(checked.payload.valid, true);

  // Aplicacao real ocorre somente na fixture temporaria.
  let applied = await postCsv('/api/inventory/import.csv', sample.source, sample.hash);
  assert.equal(applied.response.status, 200);
  assert.equal(applied.payload.ok, true);
  const history = (await readFile(inventoryHistoryFile, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  assert.equal(history.at(-1).type, 'spreadsheet_import');
  assert.equal(history.at(-1).filename, 'estoque-teste.csv');
  assert.equal(history.at(-1).changes[0].field, 'stock_on_hand');
  assert.equal(JSON.stringify(history).includes(temporaryRoot), false);

  // Hash antigo bloqueado.
  sample = await currentCsv({ stock_on_hand: '5' });
  assert.equal((await postCsv('/api/inventory/import.csv', sample.source, 'hash-antigo')).response.status, 409);

  // N. Gravacao manual e importacao usam o mesmo lock.
  let currentManagerSource = await readFile(inventoryPath, 'utf8');
  let currentManagerInventory = JSON.parse(currentManagerSource);
  let currentManagerItem = currentManagerInventory.items.find(item => item.inventory_id === newRow.inventory_id);
  writeGate = deferred(); writeStarted = deferred();
  const firstManualSave = postJson('/api/inventory/save', {
    changes: [editableChange(newRow, currentManagerItem.stock_on_hand + 1)],
    expectedInventoryHash: inventoryContentHash(currentManagerSource),
    confirmStockWithoutPrice: false
  });
  await writeStarted.promise;
  sample = await currentCsv({ stock_on_hand: String(currentManagerItem.stock_on_hand + 2) }, inventory.items.findIndex(item => item.inventory_id === newRow.inventory_id));
  const importDuringManualSave = await postCsv('/api/inventory/import.csv', sample.source, sample.hash);
  assert.equal(importDuringManualSave.response.status, 409);
  assert.match(importDuringManualSave.payload.error, /Outra operacao de gravacao ou build esta em andamento/i);
  writeGate.resolve();
  assert.equal((await firstManualSave).response.status, 200);
  writeGate = null; writeStarted = null;

  // O. Duas gravacoes simultaneas: a segunda recebe 409.
  sample = await currentCsv({ stock_on_hand: '6' }, 1);
  writeGate = deferred(); writeStarted = deferred();
  const firstConcurrent = postCsv('/api/inventory/import.csv', sample.source, sample.hash);
  await writeStarted.promise;
  assert.equal((await postCsv('/api/inventory/import.csv', sample.source, sample.hash)).response.status, 409);
  writeGate.resolve();
  assert.equal((await firstConcurrent).response.status, 200);
  writeGate = null; writeStarted = null;

  // P. Build durante gravacao recebe 409 pelo mesmo lock.
  sample = await currentCsv({ stock_on_hand: '7' }, 2);
  writeGate = deferred(); writeStarted = deferred();
  const writing = postCsv('/api/inventory/import.csv', sample.source, sample.hash);
  await writeStarted.promise;
  assert.equal((await postJson('/api/build', {})).response.status, 409);
  writeGate.resolve();
  assert.equal((await writing).response.status, 200);
  writeGate = null; writeStarted = null;

  // Q. Restore e gravacao usam o mesmo lock.
  const backupPayload = await (await fetch(`${base}/api/inventory/backups`)).json();
  assert.equal(backupPayload.backups.length > 0, true);
  currentManagerSource = await readFile(inventoryPath, 'utf8');
  writeGate = deferred(); writeStarted = deferred();
  const restoring = postJson('/api/inventory/restore', {
    confirm: true,
    backupName: backupPayload.backups.find(backup => backup.valid).name,
    expectedInventoryHash: inventoryContentHash(currentManagerSource)
  });
  await writeStarted.promise;
  const saveDuringRestore = await postJson('/api/inventory/save', {});
  assert.equal(saveDuringRestore.response.status, 409);
  assert.match(saveDuringRestore.payload.error, /Outra operacao de gravacao ou build esta em andamento/i);
  writeGate.resolve();
  assert.equal((await restoring).response.status, 200);
  writeGate = null; writeStarted = null;

  // R. Falha de escrita restaura byte a byte e libera o lock para a proxima operacao.
  sample = await currentCsv({ stock_on_hand: '8' }, 3);
  const beforeFailure = await readFile(inventoryPath, 'utf8');
  failNextWrite = true;
  const failed = await postCsv('/api/inventory/import.csv', sample.source, sample.hash);
  assert.equal(failed.response.status, 500);
  assert.equal(failed.payload.rolledBack, true);
  assert.equal(await readFile(inventoryPath, 'utf8'), beforeFailure);
  sample = await currentCsv({ stock_on_hand: '9' }, 4);
  assert.equal((await postCsv('/api/inventory/import.csv', sample.source, sample.hash)).response.status, 200);

  // S. Limite HTTP de 2 MB tambem e aplicado.
  assert.equal((await postCsv('/api/inventory/validate.csv', oversized)).response.status, 413);
} finally {
  writeGate?.resolve();
  await manager.close();
  await rm(temporaryRoot, { recursive: true, force: true });
}

// O modo demonstracao permanece em fixture temporaria e nunca executa build.
const demoRoot = await mkdtemp(path.join(os.tmpdir(), 'celulars-inventory-demo-'));
const demoCatalogPath = path.join(demoRoot, 'catalog-public.json');
const demoInventoryPath = path.join(demoRoot, 'inventory-private.json');
let demoBuildCalled = false;
await writeFile(demoCatalogPath, canonicalSourceBefore, 'utf8');
await writeFile(demoInventoryPath, jsonText(demoInventory), 'utf8');
const demoManager = createCatalogAdminServer({
  port: 0,
  demoMode: true,
  catalogPath: demoCatalogPath,
  catalogModulePath: null,
  inventoryPath: demoInventoryPath,
  backupDirectory: path.join(demoRoot, 'backups'),
  historyFile: path.join(demoRoot, 'history', 'catalog.jsonl'),
  inventoryBackupDirectory: path.join(demoRoot, 'backups'),
  inventoryHistoryFile: path.join(demoRoot, 'history', 'inventory.jsonl'),
  distDirectory: path.join(demoRoot, 'dist'),
  buildProject: async () => { demoBuildCalled = true; return {}; }
});
try {
  const address = await demoManager.listen();
  const base = `http://127.0.0.1:${address.port}`;
  const loadedDemo = await (await fetch(`${base}/api/inventory`)).json();
  assert.equal(loadedDemo.demoMode, true);
  assert.equal(loadedDemo.inventory.demo, true);
  const blockedBuild = await fetch(`${base}/api/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  assert.equal(blockedBuild.status, 403);
  assert.equal(demoBuildCalled, false);
  if (privateInventorySourceBefore) {
    assert.equal(await readFile(privateInventoryPath, 'utf8'), privateInventorySourceBefore);
  } else {
    await assert.rejects(() => access(privateInventoryPath));
  }
} finally {
  await demoManager.close();
  await rm(demoRoot, { recursive: true, force: true });
}

const canonicalSourceAfter = await readFile(canonicalCatalogPath, 'utf8');
assert.equal(sha256(canonicalSourceAfter), canonicalHashBefore, 'Os testes nao podem modificar o catalogo real.');
console.log('Testes de estoque A-T concluidos com sucesso.');
console.log(`Catalogo real preservado: ${canonicalHashBefore}`);
