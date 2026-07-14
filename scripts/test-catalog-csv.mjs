import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CPO_CSV_COLUMNS, MAX_CPO_CSV_BYTES, cpoCsvErrorReport, cpoCsvRows, exportCpoCsv, validateCpoCsv } from './catalog-csv.mjs';
import { createCatalogAdminServer, projectRoot } from './catalog-admin-server.mjs';
import { catalogModuleSource, contentHash } from './catalog-rules.mjs';

function deferred() {
  let resolve;
  const promise = new Promise(resolvePromise => { resolve = resolvePromise; });
  return { promise, resolve };
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvFromRows(rows, columns = CPO_CSV_COLUMNS) {
  const lines = [columns.join(';')];
  for (const row of rows) lines.push(columns.map(column => csvCell(row[column])).join(';'));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

function changedCsv(catalog, hash, amount, rowIndex = 0) {
  const row = { ...cpoCsvRows(catalog, hash)[rowIndex], new_usd: String(amount) };
  return csvFromRows([row]);
}

function sha256(source) {
  return createHash('sha256').update(source).digest('hex');
}

const canonicalCatalogPath = path.join(projectRoot, 'data', 'catalog-public.json');
const canonicalSourceBefore = await readFile(canonicalCatalogPath, 'utf8');
const canonicalFileHashBefore = sha256(canonicalSourceBefore);
const catalog = JSON.parse(canonicalSourceBefore);
const hash = contentHash(canonicalSourceBefore);
const rows = cpoCsvRows(catalog, hash);
assert.equal(rows.length, 83, 'O catálogo de teste deve ter 83 combinações CPO.');

// A. Catálogo completo válido.
const complete = exportCpoCsv(catalog, hash, { mode: 'complete' });
let result = validateCpoCsv(catalog, hash, complete.csv);
assert.equal(result.valid, true);
assert.equal(result.summary.rowsRead, 83);
assert.equal(result.summary.unchangedRows, 83);
assert.equal(result.summary.changedRows, 0);
assert.equal(complete.csv.charCodeAt(0), 0xfeff);
assert.match(complete.csv, /;/);

// B. Importação parcial válida.
result = validateCpoCsv(catalog, hash, changedCsv(catalog, hash, 625));
assert.equal(result.valid, true);
assert.deepEqual(result.changes.map(change => change.after), [625]);

// C. Exportação apenas de preços zerados.
const zeroOnly = exportCpoCsv(catalog, hash, { mode: 'zero' });
assert.equal(zeroOnly.rows.length, 83);
result = validateCpoCsv(catalog, hash, zeroOnly.csv);
assert.equal(result.valid, true);
assert.equal(result.summary.blankRows, 83);

// D-E. Decimais com vírgula e ponto.
result = validateCpoCsv(catalog, hash, changedCsv(catalog, hash, '625,50'));
assert.equal(result.valid, true);
assert.equal(result.changes[0].after, 625.5);
result = validateCpoCsv(catalog, hash, changedCsv(catalog, hash, '625.50'));
assert.equal(result.valid, true);
assert.equal(result.changes[0].after, 625.5);

// F-H. Valores negativos, três casas e fórmulas são bloqueados.
for (const value of ['-1', '625.555', '=1+1', '+SUM(A1:A2)', '@cmd']) {
  result = validateCpoCsv(catalog, hash, changedCsv(catalog, hash, value));
  assert.equal(result.valid, false, `${value} deveria ser rejeitado.`);
}

// I. Duplicidade da mesma combinação.
const duplicateRow = { ...rows[0], new_usd: '625' };
result = validateCpoCsv(catalog, hash, csvFromRows([duplicateRow, duplicateRow]));
assert.equal(result.valid, false);
assert.match(JSON.stringify(result.errors), /duplicada/i);

// J-K. Produto e capacidade desconhecidos.
result = validateCpoCsv(catalog, hash, csvFromRows([{ ...rows[0], product_id: 'produto-inexistente', new_usd: '625' }]));
assert.equal(result.valid, false);
assert.match(JSON.stringify(result.errors), /não encontrado|nÃ£o encontrado/i);
result = validateCpoCsv(catalog, hash, csvFromRows([{ ...rows[0], capacity: '99 TB', new_usd: '625' }]));
assert.equal(result.valid, false);
assert.match(JSON.stringify(result.errors), /capacidade/i);

// L. Colunas estruturais protegidas.
for (const mutation of [
  { model: 'Outro modelo' },
  { year: '1999' },
  { grade: 'Grade alterado' },
  { current_usd: '1.00' }
]) {
  result = validateCpoCsv(catalog, hash, csvFromRows([{ ...rows[0], ...mutation, new_usd: '625' }]));
  assert.equal(result.valid, false);
}

// M. Hash antigo bloqueado.
result = validateCpoCsv(catalog, hash, csvFromRows([{ ...rows[0], catalog_hash: 'hash-antigo', new_usd: '625' }]));
assert.equal(result.valid, false);
assert.equal(result.summary.conflicts > 0, true);

// N-O. Arquivo vazio e CSV malformado.
assert.equal(validateCpoCsv(catalog, hash, '').valid, false);
assert.equal(validateCpoCsv(catalog, hash, '\uFEFFcatalog_hash;product_id\r\n"não fechado').valid, false);

// P. Arquivo acima de 2 MB.
const oversized = `x${'0'.repeat(MAX_CPO_CSV_BYTES)}`;
result = validateCpoCsv(catalog, hash, oversized);
assert.equal(result.valid, false);
assert.match(JSON.stringify(result.errors), /2 MB/);

// Valores ambíguos, símbolos e texto também são inválidos.
for (const value of ['US$ 625', '1.234,56', '625 reais', ' 625 50 ']) {
  assert.equal(validateCpoCsv(catalog, hash, changedCsv(catalog, hash, value)).valid, false);
}

// O campo status opcional é aceito, e células perigosas são neutralizadas na exportação/relatório.
const withStatus = { ...rows[0], new_usd: '625', status: 'revisado' };
assert.equal(validateCpoCsv(catalog, hash, csvFromRows([withStatus], [...CPO_CSV_COLUMNS, 'status'])).valid, true);
const injectionCatalog = structuredClone(catalog);
injectionCatalog.products.find(product => product.group === 'cpo').model = '=HYPERLINK("https://invalid")';
assert.match(exportCpoCsv(injectionCatalog, hash).csv, /'=HYPERLINK/);
assert.match(cpoCsvErrorReport([{ line: 2, product_id: '=2+2', message: '+SUM(A1:A2)' }]), /'=2\+2/);

// U. Conteúdo XSS é tratado como texto inválido e a UI não usa innerHTML.
result = validateCpoCsv(catalog, hash, csvFromRows([{ ...rows[0], model: '<img src=x onerror=alert(1)>', new_usd: '625' }]));
assert.equal(result.valid, false);
const managerAppSource = await readFile(path.join(projectRoot, 'tools', 'catalog-manager', 'app.js'), 'utf8');
assert.doesNotMatch(managerAppSource, /\.innerHTML\s*=/);
assert.match(managerAppSource, /textContent/);

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'celulars-cpo-csv-'));
const catalogPath = path.join(temporaryRoot, 'catalog-public.json');
const catalogModulePath = path.join(temporaryRoot, 'catalog-public.js');
const backupDirectory = path.join(temporaryRoot, 'backups');
const historyFile = path.join(temporaryRoot, 'history', 'catalog-changes.jsonl');
const distDirectory = path.join(temporaryRoot, 'dist');
await writeFile(catalogPath, canonicalSourceBefore, 'utf8');
await writeFile(catalogModulePath, catalogModuleSource(catalog), 'utf8');
await mkdir(distDirectory, { recursive: true });
await writeFile(path.join(distDirectory, 'index.html'), '<!doctype html>', 'utf8');

let validationGate = null;
let validationStarted = null;
let buildGate = null;
let buildStarted = null;
let failNextValidation = false;
let failNextWrite = false;

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
      throw new Error('Falha de validação simulada');
    }
    return { code: 0 };
  },
  buildProject: async () => {
    buildStarted?.resolve();
    if (buildGate) await buildGate.promise;
    return { validate: { code: 0 }, build: { code: 0 } };
  },
  writeCatalogFiles: async entries => {
    if (failNextWrite) {
      failNextWrite = false;
      await writeFile(entries[0].filePath, '{"gravação":"interrompida"', 'utf8');
      throw new Error('Falha de escrita simulada');
    }
    for (const entry of entries) {
      await mkdir(path.dirname(entry.filePath), { recursive: true });
      await writeFile(entry.filePath, entry.contents, 'utf8');
    }
  }
});

try {
  const address = await manager.listen();
  const base = `http://127.0.0.1:${address.port}`;
  const postJson = async (route, body) => {
    const response = await fetch(`${base}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return { response, payload: await response.json() };
  };
  const postCsv = async (route, source, expectedHash = '', confirmHighValues = false, filename = 'precos-cpo-teste.csv') => {
    const response = await fetch(`${base}${route}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'X-Catalog-Hash': expectedHash,
        'X-Confirm-High-Values': String(confirmHighValues),
        'X-Import-Filename': filename
      },
      body: source
    });
    return { response, payload: await response.json() };
  };
  const currentCsv = async (amount, rowIndex = 0) => {
    const source = await readFile(catalogPath, 'utf8');
    const currentCatalog = JSON.parse(source);
    const currentHash = contentHash(source);
    return { source: changedCsv(currentCatalog, currentHash, amount, rowIndex), hash: currentHash };
  };

  // Rotas de exportação e validação.
  for (const [mode, filename] of [['template', 'precos-cpo-celulars.csv'], ['zero', 'precos-cpo-celulars-zerados.csv'], ['complete', 'catalogo-cpo-celulars-completo.csv']]) {
    const response = await fetch(`${base}/api/export/cpo.csv?mode=${mode}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-disposition'), new RegExp(filename.replace('.', '\\.')));
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer()).slice(0, 3)], [0xef, 0xbb, 0xbf]);
  }
  let sample = await currentCsv(625);
  let checked = await postCsv('/api/validate/cpo.csv', sample.source);
  assert.equal(checked.response.status, 200);
  assert.equal(checked.payload.valid, true);
  assert.equal(checked.payload.summary.changedRows, 1);

  const oversizedResponse = await postCsv('/api/validate/cpo.csv', oversized);
  assert.equal(oversizedResponse.response.status, 413);

  // Aplicação real apenas na cópia temporária.
  let applied = await postCsv('/api/import/cpo.csv', sample.source, sample.hash);
  assert.equal(applied.response.status, 200);
  assert.equal(applied.payload.ok, true);
  const firstHistory = (await readFile(historyFile, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  assert.equal(firstHistory.at(-1).type, 'spreadsheet_import');
  assert.equal(firstHistory.at(-1).filename, 'precos-cpo-teste.csv');
  assert.equal(firstHistory.at(-1).rowsRead, 1);
  assert.equal(firstHistory.at(-1).changeCount, 1);
  assert.equal(JSON.stringify(firstHistory).includes(temporaryRoot), false);

  // Hash divergente entre prévia e aplicação é bloqueado.
  sample = await currentCsv(626);
  const staleApply = await postCsv('/api/import/cpo.csv', sample.source, 'hash-antigo');
  assert.equal(staleApply.response.status, 409);

  // Confirmação adicional para preço acima de US$ 10.000.
  sample = await currentCsv(10001);
  const highBlocked = await postCsv('/api/import/cpo.csv', sample.source, sample.hash, false);
  assert.equal(highBlocked.response.status, 400);
  const highApplied = await postCsv('/api/import/cpo.csv', sample.source, sample.hash, true);
  assert.equal(highApplied.response.status, 200);

  // Q. Duas importações simultâneas: a segunda recebe 409.
  sample = await currentCsv(627, 1);
  validationGate = deferred();
  validationStarted = deferred();
  const firstConcurrent = postCsv('/api/import/cpo.csv', sample.source, sample.hash);
  await validationStarted.promise;
  const secondConcurrent = await postCsv('/api/import/cpo.csv', sample.source, sample.hash);
  assert.equal(secondConcurrent.response.status, 409);
  validationGate.resolve();
  assert.equal((await firstConcurrent).response.status, 200);
  validationGate = null;
  validationStarted = null;

  // R. Importação durante build também recebe 409.
  sample = await currentCsv(628, 2);
  buildGate = deferred();
  buildStarted = deferred();
  const buildRequest = postJson('/api/build', {});
  await buildStarted.promise;
  const duringBuild = await postCsv('/api/import/cpo.csv', sample.source, sample.hash);
  assert.equal(duringBuild.response.status, 409);
  buildGate.resolve();
  assert.equal((await buildRequest).response.status, 200);
  buildGate = null;
  buildStarted = null;

  // S. Falha após backup/validação restaura byte a byte a cópia temporária.
  sample = await currentCsv(629, 3);
  const beforeValidationFailure = await readFile(catalogPath, 'utf8');
  failNextValidation = true;
  const validationFailure = await postCsv('/api/import/cpo.csv', sample.source, sample.hash);
  assert.equal(validationFailure.response.status, 500);
  assert.equal(validationFailure.payload.rolledBack, true);
  assert.equal(await readFile(catalogPath, 'utf8'), beforeValidationFailure);

  // T. Falha durante escrita também aciona rollback.
  sample = await currentCsv(630, 4);
  const beforeWriteFailure = await readFile(catalogPath, 'utf8');
  failNextWrite = true;
  const writeFailure = await postCsv('/api/import/cpo.csv', sample.source, sample.hash);
  assert.equal(writeFailure.response.status, 500);
  assert.equal(writeFailure.payload.rolledBack, true);
  assert.equal(await readFile(catalogPath, 'utf8'), beforeWriteFailure);
} finally {
  validationGate?.resolve();
  buildGate?.resolve();
  await manager.close();
  await rm(temporaryRoot, { recursive: true, force: true });
}

const canonicalSourceAfter = await readFile(canonicalCatalogPath, 'utf8');
assert.equal(sha256(canonicalSourceAfter), canonicalFileHashBefore, 'Os testes não podem modificar o catálogo real.');
console.log('Testes CSV CPO A-U concluídos com sucesso.');
console.log(`Catálogo real preservado: ${canonicalFileHashBefore}`);
