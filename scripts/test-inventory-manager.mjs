import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
  createInitialInventory,
  inventoryContentHash,
  validateInventory
} from './inventory-rules.mjs';

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
const now = '2026-07-14T18:00:00.000Z';

// A. Estrutura real inicial: todas as combinacoes, sem estoque inventado.
const inventory = createInitialInventory(catalog, { now });
assert.equal(inventory.items.length, 97);
assert.equal(inventory.items.every(item => item.stock_on_hand === 0 && item.reserved === 0), true);
assert.equal(validateInventory(inventory, catalog).valid, true);
const inventorySource = jsonText(inventory);
const inventoryHash = inventoryContentHash(inventorySource);
const rows = inventoryCsvRows(inventory, catalog, inventoryHash);
assert.equal(rows.length, 97);

// Exportacoes usam BOM, ponto e virgula e CRLF.
const exported = exportInventoryCsv(inventory, catalog, inventoryHash);
assert.equal(exported.csv.charCodeAt(0), 0xfeff);
assert.equal(exported.csv.endsWith('\r\n'), true);
assert.match(exported.csv, /;/);
const availability = exportAvailabilityCsv(inventory, catalog);
assert.equal(availability.rows.length, 97);
assert.match(availability.csv, /price_status/);

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
for (const patch of [{ notes: '=HYPERLINK("https://invalid")' }, { stock_on_hand: '+SUM(1;2)' }, { model: '@command' }]) {
  result = validateInventoryCsv(inventory, catalog, inventoryHash, changedCsv(inventory, catalog, inventoryHash, patch));
  assert.equal(result.valid, false);
  assert.match(JSON.stringify(result.errors), /formula|comando/i);
}

// M. Texto XSS e aceito como dado, mas a UI usa apenas textContent.
const xssNote = '<img src=x onerror=alert(1)>';
result = validateInventoryCsv(inventory, catalog, inventoryHash, changedCsv(inventory, catalog, inventoryHash, { notes: xssNote }));
assert.equal(result.valid, true);
assert.equal(result.changes[0].after.notes, xssNote);
const inventoryUi = await readFile(path.join(projectRoot, 'tools', 'catalog-manager', 'inventory.js'), 'utf8');
assert.doesNotMatch(inventoryUi, /\.innerHTML\s*=/);
assert.match(inventoryUi, /textContent/);

// Dados demonstrativos sao isolados e rejeitados como producao.
const demoInventory = createInitialInventory(catalog, { demo: true, now });
assert.deepEqual(demoInventory.items.slice(0, 3).map(item => item.stock_on_hand), [3, 2, 1]);
assert.equal(validateInventory(demoInventory, catalog, { allowDemo: true }).valid, true);
assert.equal(validateInventory(demoInventory, catalog).valid, false);

// Arquivo acima de 2 MB.
const oversized = `x${'0'.repeat(MAX_INVENTORY_CSV_BYTES)}`;
result = validateInventoryCsv(inventory, catalog, inventoryHash, oversized);
assert.equal(result.valid, false);
assert.match(JSON.stringify(result.errors), /2 MB/);

// Aplicacao direta preserva calculo e valida disponibilidade.
const direct = applyInventoryChanges(inventory, catalog, [{
  inventory_id: inventory.items[0].inventory_id,
  stock_on_hand: 5,
  reserved: 2,
  low_stock_threshold: 1,
  status: 'active',
  notes: 'teste'
}], { now: '2026-07-14T18:01:00.000Z' });
assert.equal(direct.valid, true);
assert.equal(direct.inventory.items[0].stock_on_hand - direct.inventory.items[0].reserved, 3);

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

  // N. Duas gravacoes simultaneas: a segunda recebe 409.
  sample = await currentCsv({ stock_on_hand: '6' }, 1);
  writeGate = deferred(); writeStarted = deferred();
  const firstConcurrent = postCsv('/api/inventory/import.csv', sample.source, sample.hash);
  await writeStarted.promise;
  assert.equal((await postCsv('/api/inventory/import.csv', sample.source, sample.hash)).response.status, 409);
  writeGate.resolve();
  assert.equal((await firstConcurrent).response.status, 200);
  writeGate = null; writeStarted = null;

  // O. Build durante gravacao recebe 409 pelo mesmo lock.
  sample = await currentCsv({ stock_on_hand: '7' }, 2);
  writeGate = deferred(); writeStarted = deferred();
  const writing = postCsv('/api/inventory/import.csv', sample.source, sample.hash);
  await writeStarted.promise;
  assert.equal((await postJson('/api/build', {})).response.status, 409);
  writeGate.resolve();
  assert.equal((await writing).response.status, 200);
  writeGate = null; writeStarted = null;

  // P. Falha de escrita restaura byte a byte o inventario anterior.
  sample = await currentCsv({ stock_on_hand: '8' }, 3);
  const beforeFailure = await readFile(inventoryPath, 'utf8');
  failNextWrite = true;
  const failed = await postCsv('/api/inventory/import.csv', sample.source, sample.hash);
  assert.equal(failed.response.status, 500);
  assert.equal(failed.payload.rolledBack, true);
  assert.equal(await readFile(inventoryPath, 'utf8'), beforeFailure);

  // T. Limite HTTP de 2 MB tambem e aplicado.
  assert.equal((await postCsv('/api/inventory/validate.csv', oversized)).response.status, 413);
} finally {
  writeGate?.resolve();
  await manager.close();
  await rm(temporaryRoot, { recursive: true, force: true });
}

const canonicalSourceAfter = await readFile(canonicalCatalogPath, 'utf8');
assert.equal(sha256(canonicalSourceAfter), canonicalHashBefore, 'Os testes nao podem modificar o catalogo real.');
console.log('Testes de estoque A-T concluidos com sucesso.');
console.log(`Catalogo real preservado: ${canonicalHashBefore}`);
