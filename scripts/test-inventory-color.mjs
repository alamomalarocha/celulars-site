import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  INVENTORY_COLOR_CSV_COLUMNS,
  MAX_INVENTORY_COLOR_CSV_BYTES,
  exportInventoryColorCsv,
  inventoryColorCsvErrorReport,
  inventoryColorCsvRows,
  validateInventoryColorCsv
} from './inventory-color-csv.mjs';
import {
  applyInventoryColorOperations,
  createDemoColorInventory
} from './inventory-color-rules.mjs';
import {
  INVENTORY_CSV_COLUMNS,
  inventoryCsvRows,
  validateInventoryCsv
} from './inventory-csv.mjs';
import {
  applyInventoryChanges,
  catalogInventoryRows,
  createInitialInventory,
  inventoryAlerts,
  inventoryContentHash,
  inventoryStats,
  inventoryTrackingMode,
  validateInventory
} from './inventory-rules.mjs';
import {
  readInventory,
  readInventoryHistory,
  saveInventoryColorChanges
} from './inventory-service.mjs';
import { createCatalogAdminServer, projectRoot } from './catalog-admin-server.mjs';
import { privateArtifactViolation } from './artifact-privacy-rules.mjs';

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

function csvFromRows(rows, columns) {
  const lines = [columns.join(';')];
  for (const row of rows) lines.push(columns.map(column => csvCell(row[column])).join(';'));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

function deferred() {
  let resolve;
  const promise = new Promise(resolvePromise => { resolve = resolvePromise; });
  return { promise, resolve };
}

function itemFor(inventory, row) {
  return inventory.items.find(item => item.inventory_id === row.inventory_id);
}

function withAggregateTotals(inventory, row, stockOnHand, reserved) {
  const next = structuredClone(inventory);
  const item = itemFor(next, row);
  item.stock_on_hand = stockOnHand;
  item.reserved = reserved;
  return next;
}

function enableOperation(row, variants) {
  return {
    action: 'enable',
    inventory_id: row.inventory_id,
    color_variants: variants
  };
}

function updateOperation(row, variants) {
  return {
    action: 'update',
    inventory_id: row.inventory_id,
    color_variants: variants
  };
}

function assertInvalid(result, pattern) {
  assert.equal(result.valid, false);
  assert.match(JSON.stringify(result.errors), pattern);
}

const canonicalCatalogPath = path.join(projectRoot, 'data', 'catalog-public.json');
const canonicalCatalogBefore = await readFile(canonicalCatalogPath, 'utf8');
const canonicalCatalogHashBefore = sha256(canonicalCatalogBefore);
const catalog = JSON.parse(canonicalCatalogBefore);
const privateInventoryPath = path.join(projectRoot, 'data', 'inventory-private.json');
let privateInventoryBefore = null;
try {
  privateInventoryBefore = await readFile(privateInventoryPath, 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const privateInventoryHashBefore = privateInventoryBefore ? sha256(privateInventoryBefore) : null;
const now = '2026-07-16T12:00:00.000Z';
const later = '2026-07-16T13:00:00.000Z';
const rows = catalogInventoryRows(catalog);
const aggregateRow = rows.find(row => row.group === 'new' && row.colors.length >= 3);
const cpoRow = rows.find(row => row.group === 'cpo' && row.colors.length >= 3 && row.price_usd === 0);
assert.ok(aggregateRow);
assert.ok(cpoRow);

// A-B. Inventarios antigos continuam agregados sem reescrita obrigatoria.
const legacyInventory = createInitialInventory(catalog, { now });
assert.equal(legacyInventory.items.every(item => item.tracking_mode === undefined), true);
assert.equal(legacyInventory.items.every(item => inventoryTrackingMode(item) === 'aggregate'), true);
assert.equal(validateInventory(legacyInventory, catalog).valid, true);
const explicitAggregate = structuredClone(legacyInventory);
itemFor(explicitAggregate, aggregateRow).tracking_mode = 'aggregate';
itemFor(explicitAggregate, aggregateRow).color_variants = [];
assert.equal(validateInventory(explicitAggregate, catalog).valid, true);

// C-D. Ativacao zerada e distribuicao exata preservam os totais anteriores.
let result = applyInventoryColorOperations(
  legacyInventory,
  catalog,
  [enableOperation(aggregateRow, aggregateRow.colors.slice(0, 2).map(color => ({ color, stock_on_hand: 0, reserved: 0 })))],
  { now }
);
assert.equal(result.valid, true);
assert.equal(itemFor(result.inventory, aggregateRow).stock_on_hand, 0);
assert.equal(itemFor(result.inventory, aggregateRow).reserved, 0);

const stockedAggregate = withAggregateTotals(legacyInventory, aggregateRow, 5, 1);
result = applyInventoryColorOperations(stockedAggregate, catalog, [
  enableOperation(aggregateRow, [
    { color: aggregateRow.colors[0], stock_on_hand: 3, reserved: 1 },
    { color: aggregateRow.colors[1], stock_on_hand: 2, reserved: 0 }
  ])
], { now });
assert.equal(result.valid, true);
const byColorInventory = result.inventory;
const byColorItem = itemFor(byColorInventory, aggregateRow);
assert.equal(byColorItem.tracking_mode, 'by_color');
assert.equal(byColorItem.stock_on_hand, 5);
assert.equal(byColorItem.reserved, 1);
assert.equal(byColorItem.color, null);
assert.equal(byColorItem.color_variants.length, 2);

// E-H. Distribuicoes divergentes e valores numericos invalidos sao bloqueados.
for (const [variants, pattern] of [
  [
    [
      { color: aggregateRow.colors[0], stock_on_hand: 2, reserved: 1 },
      { color: aggregateRow.colors[1], stock_on_hand: 2, reserved: 0 }
    ],
    /soma do estoque.*5/i
  ],
  [
    [
      { color: aggregateRow.colors[0], stock_on_hand: 4, reserved: 1 },
      { color: aggregateRow.colors[1], stock_on_hand: 2, reserved: 0 }
    ],
    /soma do estoque.*5/i
  ],
  [
    [
      { color: aggregateRow.colors[0], stock_on_hand: 3, reserved: 0 },
      { color: aggregateRow.colors[1], stock_on_hand: 2, reserved: 0 }
    ],
    /soma do reservado.*1/i
  ],
  [
    [
      { color: aggregateRow.colors[0], stock_on_hand: 0, reserved: 1 },
      { color: aggregateRow.colors[1], stock_on_hand: 5, reserved: 0 }
    ],
    /reserved nao pode superar/i
  ]
]) {
  assertInvalid(
    applyInventoryColorOperations(stockedAggregate, catalog, [enableOperation(aggregateRow, variants)], { now }),
    pattern
  );
}

// I-L. Duplicatas, cores fora do catalogo e schemas inconsistentes sao rejeitados.
assertInvalid(applyInventoryColorOperations(stockedAggregate, catalog, [
  enableOperation(aggregateRow, [
    { color: aggregateRow.colors[0], stock_on_hand: 3, reserved: 1 },
    { color: aggregateRow.colors[0], stock_on_hand: 2, reserved: 0 }
  ])
], { now }), /duplicada/i);
assertInvalid(applyInventoryColorOperations(stockedAggregate, catalog, [
  enableOperation(aggregateRow, [
    { color: 'Cor inventada', stock_on_hand: 3, reserved: 1 },
    { color: aggregateRow.colors[1], stock_on_hand: 2, reserved: 0 }
  ])
], { now }), /cor oficial/i);
const emptyByColor = structuredClone(legacyInventory);
Object.assign(itemFor(emptyByColor, aggregateRow), { tracking_mode: 'by_color', color_variants: [] });
assertInvalid(validateInventory(emptyByColor, catalog), /pelo menos uma variante/i);
const aggregateWithVariants = structuredClone(legacyInventory);
Object.assign(itemFor(aggregateWithVariants, aggregateRow), {
  tracking_mode: 'aggregate',
  color_variants: [{ color: aggregateRow.colors[0], stock_on_hand: 0, reserved: 0, updated_at: now }]
});
assertInvalid(validateInventory(aggregateWithVariants, catalog), /aggregate nao pode possuir/i);
const topLevelColor = structuredClone(byColorInventory);
itemFor(topLevelColor, aggregateRow).color = aggregateRow.colors[0];
assertInvalid(validateInventory(topLevelColor, catalog), /color deve permanecer nulo/i);

// M. Edicao por cor deriva os totais; a edicao generica mantem totais somente leitura.
result = applyInventoryColorOperations(byColorInventory, catalog, [
  updateOperation(aggregateRow, [
    { color: aggregateRow.colors[0], stock_on_hand: 4, reserved: 2 },
    { color: aggregateRow.colors[1], stock_on_hand: 3, reserved: 0 }
  ])
], { now: later });
assert.equal(result.valid, true);
assert.equal(itemFor(result.inventory, aggregateRow).stock_on_hand, 7);
assert.equal(itemFor(result.inventory, aggregateRow).reserved, 2);
const editedByColorInventory = result.inventory;
let generic = applyInventoryChanges(editedByColorInventory, catalog, [{
  inventory_id: aggregateRow.inventory_id,
  stock_on_hand: 8,
  reserved: 2,
  low_stock_threshold: 1,
  status: 'active',
  notes: ''
}]);
assertInvalid(generic, /somente leitura no modo por cor/i);
generic = applyInventoryChanges(editedByColorInventory, catalog, [{
  inventory_id: aggregateRow.inventory_id,
  stock_on_hand: 7,
  reserved: 2,
  low_stock_threshold: 3,
  status: 'paused',
  notes: 'Observacao agregada.'
}], { now: later });
assert.equal(generic.valid, true);

// N-P. Adicao inicia zerada; remocao exige variante zerada e nunca remove a ultima.
result = applyInventoryColorOperations(editedByColorInventory, catalog, [{
  action: 'add',
  inventory_id: aggregateRow.inventory_id,
  color: aggregateRow.colors[2]
}], { now: later });
assert.equal(result.valid, true);
assert.deepEqual(itemFor(result.inventory, aggregateRow).color_variants.at(-1), {
  color: aggregateRow.colors[2],
  stock_on_hand: 0,
  reserved: 0,
  updated_at: later
});
const withAddedColor = result.inventory;
assertInvalid(applyInventoryColorOperations(withAddedColor, catalog, [{
  action: 'remove',
  inventory_id: aggregateRow.inventory_id,
  color: aggregateRow.colors[0]
}], { now: later }), /estoque e reservado zerados/i);
result = applyInventoryColorOperations(withAddedColor, catalog, [{
  action: 'remove',
  inventory_id: aggregateRow.inventory_id,
  color: aggregateRow.colors[2]
}], { now: later });
assert.equal(result.valid, true);
const singleVariant = structuredClone(result.inventory);
itemFor(singleVariant, aggregateRow).color_variants = [{
  color: aggregateRow.colors[0],
  stock_on_hand: 0,
  reserved: 0,
  updated_at: later
}];
itemFor(singleVariant, aggregateRow).stock_on_hand = 0;
itemFor(singleVariant, aggregateRow).reserved = 0;
assertInvalid(applyInventoryColorOperations(singleVariant, catalog, [{
  action: 'remove',
  inventory_id: aggregateRow.inventory_id,
  color: aggregateRow.colors[0]
}], { now: later }), /ultima cor nao pode ser removida/i);

// Q-R. Consolidacao preserva totais e os campos agregados.
const beforeConsolidation = structuredClone(editedByColorInventory);
Object.assign(itemFor(beforeConsolidation, aggregateRow), {
  low_stock_threshold: 3,
  status: 'paused',
  notes: 'Preservar ao consolidar.'
});
result = applyInventoryColorOperations(beforeConsolidation, catalog, [{
  action: 'consolidate',
  inventory_id: aggregateRow.inventory_id
}], { now: later });
assert.equal(result.valid, true);
const consolidated = itemFor(result.inventory, aggregateRow);
assert.equal(consolidated.tracking_mode, 'aggregate');
assert.equal(consolidated.color_variants, undefined);
assert.equal(consolidated.stock_on_hand, 7);
assert.equal(consolidated.reserved, 2);
assert.equal(consolidated.low_stock_threshold, 3);
assert.equal(consolidated.status, 'paused');
assert.equal(consolidated.notes, 'Preservar ao consolidar.');

// Alertas e dashboard distinguem registros de unidades.
const stats = inventoryStats(editedByColorInventory, catalog);
assert.equal(stats.byColorRecords, 1);
assert.equal(stats.aggregateRecords, editedByColorInventory.items.length - 1);
assert.equal(stats.colorVariants, 2);
assert.equal(stats.colorStockOnHand, 7);
assert.equal(stats.colorReserved, 2);
const alerts = inventoryAlerts(editedByColorInventory, catalog, { now: Date.parse(later) });
assert.equal(alerts.some(alert => alert.type === 'color_reserved' && alert.color === aggregateRow.colors[0]), true);

// CPO por cor com preco zero exige confirmacao explicita.
const cpoAggregate = withAggregateTotals(legacyInventory, cpoRow, 1, 0);
const cpoOperation = enableOperation(cpoRow, [
  { color: cpoRow.colors[0], stock_on_hand: 1, reserved: 0 },
  { color: cpoRow.colors[1], stock_on_hand: 0, reserved: 0 }
]);
assertInvalid(applyInventoryColorOperations(cpoAggregate, catalog, [cpoOperation], { now }), /confirme explicitamente/i);
result = applyInventoryColorOperations(cpoAggregate, catalog, [cpoOperation], {
  now,
  confirmStockWithoutPrice: true
});
assert.equal(result.valid, true);
assert.equal(result.warnings.some(warning => warning.type === 'stock_without_price'), true);

// S. CSV por cor usa BOM, ponto e virgula, CRLF e altera somente estoque/reservado.
const colorHash = inventoryContentHash(jsonText(editedByColorInventory));
const exported = exportInventoryColorCsv(editedByColorInventory, catalog, colorHash);
assert.equal(exported.csv.charCodeAt(0), 0xfeff);
assert.equal(exported.csv.endsWith('\r\n'), true);
assert.deepEqual(Object.keys(exported.rows[0]), INVENTORY_COLOR_CSV_COLUMNS);
assert.equal(exported.rows.length, 2);
const changedColorRows = exported.rows.map((row, index) => index === 0
  ? { ...row, stock_on_hand: '5', reserved: '2' }
  : row);
let csvResult = validateInventoryColorCsv(
  editedByColorInventory,
  catalog,
  colorHash,
  csvFromRows(changedColorRows, INVENTORY_COLOR_CSV_COLUMNS)
);
assert.equal(csvResult.valid, true);
assert.equal(csvResult.changes.length, 1);
assert.equal(csvResult.operations.length, 1);
assert.equal(csvResult.operations[0].color_variants.length, 2);

// T-U. Cor alterada, variante inexistente ou linha removida devem ser corrigidas na interface.
const alteredColorRows = structuredClone(exported.rows);
alteredColorRows[0].color = aggregateRow.colors[2];
assertInvalid(validateInventoryColorCsv(
  editedByColorInventory,
  catalog,
  colorHash,
  csvFromRows(alteredColorRows, INVENTORY_COLOR_CSV_COLUMNS)
), /variante inexistente|cor alterada/i);
const extraColorRows = [
  ...exported.rows,
  { ...exported.rows[0], color: aggregateRow.colors[2] }
];
assertInvalid(validateInventoryColorCsv(
  editedByColorInventory,
  catalog,
  colorHash,
  csvFromRows(extraColorRows, INVENTORY_COLOR_CSV_COLUMNS)
), /variante inexistente|cor alterada/i);
assertInvalid(validateInventoryColorCsv(
  editedByColorInventory,
  catalog,
  colorHash,
  csvFromRows(exported.rows.slice(0, 1), INVENTORY_COLOR_CSV_COLUMNS)
), /foi removida da planilha/i);

// V-W. Formula, XSS, CSV malformado e tamanho maximo sao bloqueados.
for (const malicious of ['=1+1', '+SUM(1;2)', '-IMPORTXML("x")', '@comando']) {
  const maliciousRows = structuredClone(exported.rows);
  maliciousRows[0].stock_on_hand = malicious;
  assertInvalid(validateInventoryColorCsv(
    editedByColorInventory,
    catalog,
    colorHash,
    csvFromRows(maliciousRows, INVENTORY_COLOR_CSV_COLUMNS)
  ), /formula|comando/i);
}
const xssRows = structuredClone(exported.rows);
xssRows[0].color = '<img src=x onerror=alert(1)>';
assertInvalid(validateInventoryColorCsv(
  editedByColorInventory,
  catalog,
  colorHash,
  csvFromRows(xssRows, INVENTORY_COLOR_CSV_COLUMNS)
), /variante inexistente|cor alterada/i);
assertInvalid(validateInventoryColorCsv(editedByColorInventory, catalog, colorHash, '"nao fechado'), /malformado/i);
assertInvalid(
  validateInventoryColorCsv(editedByColorInventory, catalog, colorHash, 'x'.repeat(MAX_INVENTORY_COLOR_CSV_BYTES + 1)),
  /2 MB/i
);
const protectedReport = inventoryColorCsvErrorReport([{ line: 2, inventory_id: '=ID', message: '=ERRO' }]);
assert.match(protectedReport, /'=ID/);
assert.match(protectedReport, /'=ERRO/);
const inventoryUiSource = await readFile(path.join(projectRoot, 'tools', 'catalog-manager', 'inventory.js'), 'utf8');
assert.doesNotMatch(inventoryUiSource, /\b(?:innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b/);
assert.doesNotMatch(inventoryUiSource, /state\.colorSaveConfirm/);

// X. Hash antigo bloqueia validacao e gravacao.
const oldHashRows = exported.rows.map(row => ({ ...row, inventory_hash: 'hash-antigo' }));
assertInvalid(validateInventoryColorCsv(
  editedByColorInventory,
  catalog,
  colorHash,
  csvFromRows(oldHashRows, INVENTORY_COLOR_CSV_COLUMNS)
), /desatualizada/i);

// O CSV agregado exporta totais derivados, mas bloqueia sua edicao no modo por cor.
const aggregateRows = inventoryCsvRows(editedByColorInventory, catalog, colorHash);
const aggregateCsvRow = aggregateRows.find(row => row.inventory_id === aggregateRow.inventory_id);
let aggregateCsv = validateInventoryCsv(
  editedByColorInventory,
  catalog,
  colorHash,
  csvFromRows([{ ...aggregateCsvRow, stock_on_hand: '99' }], INVENTORY_CSV_COLUMNS)
);
assertInvalid(aggregateCsv, /estoque-por-cor-celulars\.csv/i);
aggregateCsv = validateInventoryCsv(
  editedByColorInventory,
  catalog,
  colorHash,
  csvFromRows([{ ...aggregateCsvRow, notes: 'Nota agregada via CSV.' }], INVENTORY_CSV_COLUMNS)
);
assert.equal(aggregateCsv.valid, true);
assert.equal(aggregateCsv.changes[0].after.notes, 'Nota agregada via CSV.');

// Y-Z. Servico cria backup/historico, bloqueia hash antigo e restaura byte a byte em falha.
const serviceRoot = await mkdtemp(path.join(os.tmpdir(), 'celulars-color-service-'));
try {
  const inventoryPath = path.join(serviceRoot, 'inventory-private.json');
  const backupDirectory = path.join(serviceRoot, 'backups');
  const historyFile = path.join(serviceRoot, 'history', 'inventory-changes.jsonl');
  await writeFile(inventoryPath, jsonText(byColorInventory), 'utf8');
  let current = await readInventory(inventoryPath, catalog);
  let saved = await saveInventoryColorChanges({
    inventoryPath,
    catalog,
    operations: [updateOperation(aggregateRow, [
      { color: aggregateRow.colors[0], stock_on_hand: 4, reserved: 1 },
      { color: aggregateRow.colors[1], stock_on_hand: 2, reserved: 0 }
    ])],
    expectedInventoryHash: 'hash-antigo',
    backupDirectory,
    historyFile,
    now: later
  });
  assert.equal(saved.status, 409);

  const beforeFailure = current.source;
  saved = await saveInventoryColorChanges({
    inventoryPath,
    catalog,
    operations: [updateOperation(aggregateRow, [
      { color: aggregateRow.colors[0], stock_on_hand: 4, reserved: 1 },
      { color: aggregateRow.colors[1], stock_on_hand: 2, reserved: 0 }
    ])],
    expectedInventoryHash: current.contentHash,
    backupDirectory,
    historyFile,
    now: later,
    afterWrite: async () => { throw new Error('falha controlada apos escrita'); }
  });
  assert.equal(saved.ok, false);
  assert.equal(saved.rolledBack, true);
  assert.equal(await readFile(inventoryPath, 'utf8'), beforeFailure);

  current = await readInventory(inventoryPath, catalog);
  saved = await saveInventoryColorChanges({
    inventoryPath,
    catalog,
    operations: [updateOperation(aggregateRow, [
      { color: aggregateRow.colors[0], stock_on_hand: 4, reserved: 1 },
      { color: aggregateRow.colors[1], stock_on_hand: 2, reserved: 0 }
    ])],
    expectedInventoryHash: current.contentHash,
    backupDirectory,
    historyFile,
    historyType: 'update_color_inventory',
    now: later
  });
  assert.equal(saved.ok, true);
  assert.ok(saved.backupName);
  const history = await readInventoryHistory(historyFile);
  assert.equal(history[0].type, 'update_color_inventory');
  assert.equal(history[0].changes.some(change => change.field === 'color_variants'), true);
  assert.equal(JSON.stringify(history).includes(serviceRoot), false);
} finally {
  await rm(serviceRoot, { recursive: true, force: true });
}

// Y adicional. Rotas CSV compartilham lock, cabecalhos privados e rollback.
const serverRoot = await mkdtemp(path.join(os.tmpdir(), 'celulars-color-server-'));
const serverCatalogPath = path.join(serverRoot, 'catalog-public.json');
const serverInventoryPath = path.join(serverRoot, 'inventory-private.json');
const serverHistoryFile = path.join(serverRoot, 'history', 'inventory.jsonl');
await writeFile(serverCatalogPath, canonicalCatalogBefore, 'utf8');
await writeFile(serverInventoryPath, jsonText(editedByColorInventory), 'utf8');
let writeGate = null;
let writeStarted = null;
let failNextWrite = false;
const manager = createCatalogAdminServer({
  port: 0,
  catalogPath: serverCatalogPath,
  catalogModulePath: null,
  inventoryPath: serverInventoryPath,
  inventoryBackupDirectory: path.join(serverRoot, 'backups'),
  inventoryHistoryFile: serverHistoryFile,
  backupDirectory: path.join(serverRoot, 'catalog-backups'),
  historyFile: path.join(serverRoot, 'history', 'catalog.jsonl'),
  distDirectory: path.join(serverRoot, 'dist'),
  validateProject: async () => ({ code: 0 }),
  buildProject: async () => ({ code: 0 }),
  inventoryWriteFile: async (filePath, source) => {
    writeStarted?.resolve();
    if (writeGate) await writeGate.promise;
    if (failNextWrite) {
      failNextWrite = false;
      throw new Error('falha simulada');
    }
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, source, 'utf8');
  }
});
try {
  const address = await manager.listen();
  const base = `http://127.0.0.1:${address.port}`;
  const colorExportResponse = await fetch(`${base}/api/inventory/color/export.csv`);
  assert.equal(colorExportResponse.status, 200);
  assert.match(colorExportResponse.headers.get('content-disposition') || '', /estoque-por-cor-celulars\.csv/);
  assert.equal(colorExportResponse.headers.get('cache-control'), 'no-store');
  assert.equal(colorExportResponse.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await fetch(`${base}/api/inventory/color/export.csv`, {
    headers: { Origin: 'https://invalid.example' }
  })).status, 403);

  const currentColorCsv = async increment => {
    const source = await readFile(serverInventoryPath, 'utf8');
    const inventory = JSON.parse(source);
    const hash = inventoryContentHash(source);
    const exportedRows = inventoryColorCsvRows(inventory, catalog, hash);
    exportedRows[0] = {
      ...exportedRows[0],
      stock_on_hand: String(Number(exportedRows[0].stock_on_hand) + increment)
    };
    return { hash, csv: csvFromRows(exportedRows, INVENTORY_COLOR_CSV_COLUMNS) };
  };
  const postColorCsv = async (route, sample, filename = '../../estoque-teste.csv') => {
    const response = await fetch(`${base}${route}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'X-Inventory-Hash': sample.hash,
        'X-Confirm-Stock-Without-Price': 'true',
        'X-Import-Filename': filename
      },
      body: sample.csv
    });
    return { response, payload: await response.json() };
  };

  let sample = await currentColorCsv(1);
  const preview = await postColorCsv('/api/inventory/color/validate.csv', sample);
  assert.equal(preview.response.status, 200);
  assert.equal(preview.payload.valid, true);

  writeGate = deferred();
  writeStarted = deferred();
  const firstImport = postColorCsv('/api/inventory/color/import.csv', sample);
  await writeStarted.promise;
  const concurrentImport = await postColorCsv('/api/inventory/color/import.csv', sample);
  assert.equal(concurrentImport.response.status, 409);
  assert.match(concurrentImport.payload.error, /Outra operacao/i);
  writeGate.resolve();
  assert.equal((await firstImport).response.status, 200);
  writeGate = null;
  writeStarted = null;
  const serverHistory = await readInventoryHistory(serverHistoryFile);
  assert.equal(serverHistory[0].type, 'color_spreadsheet_import');
  assert.equal(serverHistory[0].filename, 'estoque-teste.csv');

  sample = await currentColorCsv(1);
  const beforeFailure = await readFile(serverInventoryPath, 'utf8');
  failNextWrite = true;
  const failedImport = await postColorCsv('/api/inventory/color/import.csv', sample);
  assert.equal(failedImport.response.status, 500);
  assert.equal(failedImport.payload.rolledBack, true);
  assert.equal(await readFile(serverInventoryPath, 'utf8'), beforeFailure);

  const oversizedResponse = await fetch(`${base}/api/inventory/color/validate.csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/csv; charset=utf-8' },
    body: 'x'.repeat(MAX_INVENTORY_COLOR_CSV_BYTES + 1)
  });
  assert.equal(oversizedResponse.status, 413);
} finally {
  writeGate?.resolve();
  await manager.close();
  await rm(serverRoot, { recursive: true, force: true });
}

// AA-AB. Demo e isolado, possui um Novo e dois CPO por cor e e rejeitado em producao.
const demoCatalog = structuredClone(catalog);
let demoPriceIndex = 0;
for (const product of demoCatalog.products) {
  if (product.group !== 'cpo') continue;
  for (const capacity of Object.keys(product.capacities)) {
    product.capacities[capacity].usd = [111.11, 222.22, 333.33][demoPriceIndex++ % 3];
  }
}
const demoInventory = createDemoColorInventory(demoCatalog, { now });
const demoStats = inventoryStats(demoInventory, demoCatalog);
assert.equal(demoInventory.demo, true);
assert.equal(demoStats.byColorRecords, 3);
assert.equal(demoInventory.items.filter(item => inventoryTrackingMode(item) === 'by_color').length, 3);
assert.equal(validateInventory(demoInventory, demoCatalog, { allowDemo: true }).valid, true);
assertInvalid(validateInventory(demoInventory, demoCatalog), /demonstracao nao pode ser usado/i);
const demoRows = catalogInventoryRows(demoCatalog);
assert.equal(demoRows.some(row => row.group === 'cpo' && row.price_usd === 111.11), true);
assert.equal(demoRows.some(row => row.group === 'cpo' && row.price_usd === 222.22), true);
assert.equal(demoRows.some(row => row.group === 'cpo' && row.price_usd === 333.33), true);

// AE. O artefato publico nao contem ferramenta, inventario, campos privados ou rotas internas.
const distDirectory = path.join(projectRoot, 'dist');
try {
  const pending = [distDirectory];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of await (await import('node:fs/promises')).readdir(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(absolute);
        continue;
      }
      const relative = path.relative(distDirectory, absolute).replaceAll('\\', '/');
      const source = await readFile(absolute);
      assert.equal(privateArtifactViolation(relative, source), null, `Conteudo privado em dist/${relative}`);
    }
  }
  for (const internalPath of [
    'inventory/index.html',
    'inventory-private.json',
    'data/inventory-private.json',
    'estoque-por-cor-celulars.csv',
    'tools/catalog-manager/index.html',
    'internal/index.html',
    'catalog-manager/index.html',
    'fixtures/index.html',
    'scripts/inventory-color-rules.mjs',
    'scripts/test-inventory-color.mjs',
    'docs/ESTOQUE-POR-COR.md'
  ]) {
    await assert.rejects(() => access(path.join(distDirectory, internalPath)));
  }
} catch (error) {
  if (error.code === 'ENOENT' && error.path === distDirectory) {
    throw new Error('Execute npm run build antes de inventory:color-test para validar o artefato publico.');
  }
  throw error;
}

// AC-AD. Nenhum teste toca o inventario privado real nem o catalogo canonico.
const canonicalCatalogAfter = await readFile(canonicalCatalogPath, 'utf8');
assert.equal(sha256(canonicalCatalogAfter), canonicalCatalogHashBefore);
if (privateInventoryBefore === null) {
  await assert.rejects(() => access(privateInventoryPath));
} else {
  const privateInventoryAfter = await readFile(privateInventoryPath, 'utf8');
  assert.equal(sha256(privateInventoryAfter), privateInventoryHashBefore);
  assert.equal(privateInventoryAfter, privateInventoryBefore);
}

console.log('Testes de estoque por cor A-AE concluidos com sucesso.');
console.log(`Catalogo real preservado: ${canonicalCatalogHashBefore}`);
console.log(`Inventario real preservado: ${privateInventoryHashBefore || 'ausente'}`);
