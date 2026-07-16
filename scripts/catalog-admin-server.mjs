import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpoCsvErrorReport, exportCpoCsv, validateCpoCsv } from './catalog-csv.mjs';
import { catalogModuleSource, catalogStats, contentHash, diffCpoPrices, validateCatalog, validateImport } from './catalog-rules.mjs';
import {
  exportAvailabilityCsv,
  exportInventoryCsv,
  inventoryCsvErrorReport,
  validateInventoryCsv
} from './inventory-csv.mjs';
import {
  initializeInventory,
  listInventoryBackups,
  previewInventoryColorChanges,
  previewInventoryChanges,
  readInventory,
  readInventoryHistory,
  restoreInventoryBackup,
  saveInventoryColorChanges,
  saveInventoryChanges
} from './inventory-service.mjs';
import { createDemoColorInventory } from './inventory-color-rules.mjs';
import { createInitialInventory, enrichInventory, inventoryAlerts, inventoryStats } from './inventory-rules.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(scriptDirectory, '..');
const toolRoot = path.join(projectRoot, 'tools', 'catalog-manager');
const defaultCatalogPath = path.join(projectRoot, 'data', 'catalog-public.json');
const defaultCatalogModulePath = path.join(projectRoot, 'data', 'catalog-public.js');
const defaultBackupDirectory = path.join(projectRoot, 'data', 'backups');
const defaultHistoryFile = path.join(projectRoot, 'data', 'history', 'catalog-changes.jsonl');
const defaultInventoryPath = path.join(projectRoot, 'data', 'inventory-private.json');
const defaultInventoryBackupDirectory = path.join(projectRoot, 'data', 'backups');
const defaultInventoryHistoryFile = path.join(projectRoot, 'data', 'history', 'inventory-changes.jsonl');
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const HIGH_PRICE_USD = 10000;
const STATIC_FILES = new Map([
  ['/', { file: 'index.html', type: 'text/html; charset=utf-8' }],
  ['/index.html', { file: 'index.html', type: 'text/html; charset=utf-8' }],
  ['/app.js', { file: 'app.js', type: 'text/javascript; charset=utf-8' }],
  ['/inventory.js', { file: 'inventory.js', type: 'text/javascript; charset=utf-8' }],
  ['/styles.css', { file: 'styles.css', type: 'text/css; charset=utf-8' }],
  ['/csv-styles.css', { file: 'csv-styles.css', type: 'text/css; charset=utf-8' }],
  ['/inventory-styles.css', { file: 'inventory-styles.css', type: 'text/css; charset=utf-8' }]
]);

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace('T', '-').replace(/\.\d{3}Z$/, '');
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function atomicWriteFiles(entries) {
  const prepared = [];
  try {
    for (const { filePath, contents } of entries) {
      await mkdir(path.dirname(filePath), { recursive: true });
      const temporaryPath = `${filePath}.tmp-${process.pid}-${randomUUID()}`;
      await writeFile(temporaryPath, contents, 'utf8');
      const writtenContents = await readFile(temporaryPath, 'utf8');
      if (writtenContents !== contents) throw new Error('Falha ao verificar o arquivo temporario antes da gravacao atomica.');
      prepared.push({ filePath, temporaryPath });
    }
    for (const { filePath, temporaryPath } of prepared) await rename(temporaryPath, filePath);
  } catch (error) {
    await Promise.all(prepared.map(({ temporaryPath }) => unlink(temporaryPath).catch(() => {})));
    throw error;
  }
}

export async function readCatalog(catalogPath = defaultCatalogPath) {
  const source = await readFile(catalogPath, 'utf8');
  const catalog = JSON.parse(source);
  const validation = validateCatalog(catalog);
  if (!validation.valid) throw new Error(`Catalogo invalido: ${validation.errors.join(' | ')}`);
  return { source, catalog, validation };
}

function validateChanges(catalog, changes, confirmHighValues) {
  const errors = [];
  const normalized = [];
  const productsById = new Map(catalog.products.map(product => [product.id, product]));
  if (!Array.isArray(changes) || !changes.length) errors.push('Nenhuma alteracao foi enviada.');
  if (Array.isArray(changes) && changes.length > 200) errors.push('Quantidade de alteracoes excede o limite permitido.');

  for (const change of Array.isArray(changes) ? changes : []) {
    const product = productsById.get(change?.id);
    if (!product || product.group !== 'cpo') {
      errors.push(`Produto CPO invalido: ${change?.id || 'sem ID'}.`);
      continue;
    }
    if (typeof change.capacity !== 'string' || !Object.hasOwn(product.capacities, change.capacity)) {
      errors.push(`${product.model}: capacidade inexistente (${change?.capacity || 'vazia'}).`);
      continue;
    }
    const usd = change.usd;
    if (typeof usd !== 'number' || !Number.isFinite(usd) || usd < 0) {
      errors.push(`${product.model} ${change.capacity}: preco deve ser um numero maior ou igual a zero.`);
      continue;
    }
    if (Math.round(usd * 100) !== usd * 100) {
      errors.push(`${product.model} ${change.capacity}: use no maximo duas casas decimais.`);
      continue;
    }
    if (usd > HIGH_PRICE_USD && !confirmHighValues) {
      errors.push(`${product.model} ${change.capacity}: valor acima de US$ ${HIGH_PRICE_USD.toFixed(2)} exige confirmacao adicional.`);
      continue;
    }
    normalized.push({ id: product.id, model: product.model, capacity: change.capacity, usd });
  }

  return { errors, changes: normalized };
}

async function restoreCatalog({ source, catalogPath, catalogModulePath }) {
  const catalog = JSON.parse(source);
  const entries = [{ filePath: catalogPath, contents: source }];
  if (catalogModulePath) entries.push({ filePath: catalogModulePath, contents: catalogModuleSource(catalog) });
  await atomicWriteFiles(entries);
}

export async function saveCatalogChanges({
  changes,
  confirmHighValues = false,
  expectedCatalogHash,
  historyContext = {},
  catalogPath = defaultCatalogPath,
  catalogModulePath = defaultCatalogModulePath,
  backupDirectory = defaultBackupDirectory,
  historyFile = defaultHistoryFile,
  validateProject = async () => runNodeFile('scripts/validate-site.mjs'),
  writeCatalogFiles = atomicWriteFiles
}) {
  const current = await readCatalog(catalogPath);
  const currentSourceHash = contentHash(current.source);
  if (expectedCatalogHash && expectedCatalogHash !== currentSourceHash) {
    return { ok: false, status: 409, errors: ['O catálogo mudou desde a prévia. Exporte e valide novamente a planilha antes de salvar.'] };
  }
  const checked = validateChanges(current.catalog, changes, confirmHighValues);
  if (checked.errors.length) return { ok: false, status: 400, errors: checked.errors };

  const next = structuredClone(current.catalog);
  const nextProducts = new Map(next.products.map(product => [product.id, product]));
  for (const change of checked.changes) nextProducts.get(change.id).capacities[change.capacity].usd = change.usd;

  const finalChanges = diffCpoPrices(current.catalog, next);
  if (!finalChanges.length) return { ok: false, status: 400, errors: ['Os valores enviados nao alteram o catalogo.'] };
  const nextValidation = validateCatalog(next);
  if (!nextValidation.valid) return { ok: false, status: 400, errors: nextValidation.errors };
  if (current.validation.structureHash !== nextValidation.structureHash) {
    return { ok: false, status: 400, errors: ['A alteracao modificaria a estrutura protegida do catalogo.'] };
  }

  await mkdir(backupDirectory, { recursive: true });
  const backupPath = path.join(backupDirectory, `catalog-public-${timestampForFile()}-${randomUUID().slice(0, 8)}.json`);
  await writeFile(backupPath, current.source, 'utf8');
  const nextSource = jsonText(next);
  const beforeHash = contentHash(current.source);
  const afterHash = contentHash(nextSource);

  try {
    JSON.parse(nextSource);
    const entries = [{ filePath: catalogPath, contents: nextSource }];
    if (catalogModulePath) entries.push({ filePath: catalogModulePath, contents: catalogModuleSource(next) });
    await writeCatalogFiles(entries);
    const written = await readCatalog(catalogPath);
    if (written.validation.contentHash !== contentHash(next)) throw new Error('Hash do arquivo gravado nao corresponde ao catalogo validado.');
    await validateProject();

    await mkdir(path.dirname(historyFile), { recursive: true });
    const changedAt = new Date().toISOString();
    const historyLines = finalChanges.map(change => JSON.stringify({
      changedAt,
      type: historyContext.type || 'manual_edit',
      ...(historyContext.filename ? { filename: historyContext.filename } : {}),
      ...(Number.isInteger(historyContext.rowsRead) ? { rowsRead: historyContext.rowsRead } : {}),
      changeCount: finalChanges.length,
      model: change.model,
      productId: change.id,
      capacity: change.capacity,
      previousUsd: change.before,
      newUsd: change.after,
      beforeHash,
      afterHash
    })).join('\n');
    await appendFile(historyFile, `${historyLines}\n`, 'utf8');
  } catch (error) {
    await restoreCatalog({ source: current.source, catalogPath, catalogModulePath });
    return { ok: false, status: 500, errors: [`Gravacao revertida: ${error.message}`], rolledBack: true, backupPath };
  }

  return { ok: true, changes: finalChanges, backupPath, historyFile, beforeHash, afterHash, stats: catalogStats(next) };
}

function runNodeFile(relativePath, argumentsList = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [relativePath, ...argumentsList], { cwd: projectRoot, shell: false, windowsHide: true });
    let output = '';
    let errorOutput = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { errorOutput += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      const result = { script: relativePath, arguments: argumentsList, code, output: output.trim(), errorOutput: errorOutput.trim() };
      if (code === 0) resolve(result);
      else reject(Object.assign(new Error(`${relativePath} falhou com codigo ${code}.`), { result }));
    });
  });
}

function safeImportFilename(value) {
  const leaf = String(value || 'planilha-cpo.csv').replaceAll('\\', '/').split('/').pop();
  const sanitized = leaf.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 120).trim();
  return sanitized || 'planilha-cpo.csv';
}

async function countFiles(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    total += entry.isDirectory() ? await countFiles(path.join(directory, entry.name)) : 1;
  }
  return total;
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'"
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const contentType = String(request.headers['content-type'] || '').split(';')[0].trim();
  if (contentType !== 'application/json') throw Object.assign(new Error('Content-Type deve ser application/json.'), { status: 415 });
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('Payload excede 2 MB.'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Corpo JSON invalido.'), { status: 400 });
  }
}

async function readCsvBody(request) {
  const contentType = String(request.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const allowed = new Set(['text/csv', 'application/csv', 'application/vnd.ms-excel']);
  if (!allowed.has(contentType)) throw Object.assign(new Error('Content-Type deve identificar um arquivo CSV.'), { status: 415 });
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('Arquivo CSV excede 2 MB.'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function assertLocalRequest(request, host, port) {
  const expectedHost = `${host}:${port}`;
  if (request.headers.host !== expectedHost) throw Object.assign(new Error('Host local invalido.'), { status: 403 });
  const origin = request.headers.origin;
  if (origin && origin !== `http://${expectedHost}`) throw Object.assign(new Error('Origem rejeitada.'), { status: 403 });
}

export function createCatalogAdminServer(options = {}) {
  const host = options.host || '127.0.0.1';
  const requestedPort = Number(options.port ?? 4175);
  const catalogPath = options.catalogPath || defaultCatalogPath;
  const catalogModulePath = options.catalogModulePath === undefined ? defaultCatalogModulePath : options.catalogModulePath;
  const backupDirectory = options.backupDirectory || defaultBackupDirectory;
  const historyFile = options.historyFile || defaultHistoryFile;
  const inventoryPath = options.inventoryPath || defaultInventoryPath;
  const inventoryBackupDirectory = options.inventoryBackupDirectory || defaultInventoryBackupDirectory;
  const inventoryHistoryFile = options.inventoryHistoryFile || defaultInventoryHistoryFile;
  const inventoryWriteFile = options.inventoryWriteFile;
  const demoMode = options.demoMode === true;
  const validateProject = options.validateProject || (async () => runNodeFile('scripts/validate-site.mjs'));
  const buildProject = options.buildProject || (async () => ({
    validate: await runNodeFile('scripts/validate-site.mjs'),
    build: await runNodeFile('scripts/build-public.mjs'),
    distValidation: await runNodeFile('scripts/validate-site.mjs', ['--dist'])
  }));
  const distDirectory = options.distDirectory || path.join(projectRoot, 'dist');
  const writeCatalogFiles = options.writeCatalogFiles || atomicWriteFiles;
  let mutableOperationRunning = false;

  async function runMutableOperation(response, operation) {
    if (mutableOperationRunning) {
      return sendJson(response, 409, { error: 'Outra operacao de gravacao ou build esta em andamento.' });
    }
    mutableOperationRunning = true;
    try {
      return await operation();
    } finally {
      mutableOperationRunning = false;
    }
  }

  const server = createServer(async (request, response) => {
    try {
      const port = server.address()?.port || requestedPort;
      assertLocalRequest(request, host, port);
      const url = new URL(request.url, `http://${request.headers.host}`);

      if (STATIC_FILES.has(url.pathname)) {
        if (request.method !== 'GET' && request.method !== 'HEAD') return sendJson(response, 405, { error: 'Metodo nao permitido.' });
        const asset = STATIC_FILES.get(url.pathname);
        const source = await readFile(path.join(toolRoot, asset.file));
        response.writeHead(200, {
          'Content-Type': asset.type,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'none'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
        });
        return response.end(request.method === 'HEAD' ? undefined : source);
      }

      if (url.pathname === '/api/catalog' && request.method === 'GET') {
        const loaded = await readCatalog(catalogPath);
        return sendJson(response, 200, {
          catalog: loaded.catalog,
          stats: loaded.validation.stats,
          validation: { valid: true, errors: [] },
          canonicalFile: path.relative(projectRoot, catalogPath),
          contentHash: loaded.validation.contentHash,
          structureHash: loaded.validation.structureHash,
          demoMode,
          readAt: new Date().toISOString()
        });
      }

      if (url.pathname === '/api/inventory' && request.method === 'GET') {
        const loadedCatalog = await readCatalog(catalogPath);
        const loadedInventory = await readInventory(inventoryPath, loadedCatalog.catalog, { allowDemo: demoMode });
        if (!loadedInventory.exists) {
          const candidate = createInitialInventory(loadedCatalog.catalog);
          return sendJson(response, 200, {
            exists: false,
            demoMode,
            canonicalFile: demoMode ? '[temporario de demonstracao]' : path.relative(projectRoot, inventoryPath),
            suggestedItems: candidate.items.length,
            catalogHash: contentHash(loadedCatalog.source),
            readAt: new Date().toISOString()
          });
        }
        return sendJson(response, 200, {
          exists: true,
          demoMode,
          inventory: loadedInventory.inventory,
          rows: enrichInventory(loadedInventory.inventory, loadedCatalog.catalog),
          stats: loadedInventory.validation.stats,
          alerts: inventoryAlerts(loadedInventory.inventory, loadedCatalog.catalog),
          contentHash: loadedInventory.contentHash,
          catalogHash: contentHash(loadedCatalog.source),
          canonicalFile: demoMode ? '[temporario de demonstracao]' : path.relative(projectRoot, inventoryPath),
          readAt: new Date().toISOString()
        });
      }

      if (url.pathname === '/api/inventory/initialize-preview' && request.method === 'GET') {
        const loadedCatalog = await readCatalog(catalogPath);
        const loadedInventory = await readInventory(inventoryPath, loadedCatalog.catalog, { allowDemo: demoMode });
        if (loadedInventory.exists) return sendJson(response, 409, { error: 'O inventario ja existe.' });
        const candidate = createInitialInventory(loadedCatalog.catalog, { demo: demoMode });
        return sendJson(response, 200, {
          ok: true,
          demoMode,
          catalogHash: contentHash(loadedCatalog.source),
          stats: inventoryStats(candidate, loadedCatalog.catalog),
          itemCount: candidate.items.length,
          defaults: { stock_on_hand: demoMode ? '3/2/1 ficticios' : 0, reserved: demoMode ? 'fixture ficticia' : 0, low_stock_threshold: 1, status: 'active', notes: demoMode ? 'demonstracao' : '' }
        });
      }

      if (url.pathname === '/api/inventory/initialize' && request.method === 'POST') {
        return await runMutableOperation(response, async () => {
          const body = await readJsonBody(request);
          if (body.confirm !== true) return sendJson(response, 400, { error: 'Confirme explicitamente a criacao da estrutura de estoque.' });
          const loadedCatalog = await readCatalog(catalogPath);
          const result = await initializeInventory({
            catalog: loadedCatalog.catalog,
            catalogHash: contentHash(loadedCatalog.source),
            expectedCatalogHash: body.expectedCatalogHash,
            inventoryPath,
            backupDirectory: inventoryBackupDirectory,
            historyFile: inventoryHistoryFile,
            demo: demoMode,
            ...(inventoryWriteFile ? { writeInventory: inventoryWriteFile } : {})
          });
          return sendJson(response, result.ok ? 200 : result.status || 400, result.ok ? result : { ...result, error: result.errors?.join(' | ') });
        });
      }

      if (url.pathname === '/api/inventory/preview' && request.method === 'POST') {
        const body = await readJsonBody(request);
        const loadedCatalog = await readCatalog(catalogPath);
        const result = await previewInventoryChanges({
          inventoryPath,
          catalog: loadedCatalog.catalog,
          changes: body.changes,
          confirmStockWithoutPrice: body.confirmStockWithoutPrice === true,
          allowDemo: demoMode
        });
        return sendJson(response, result.ok ? 200 : result.status || 400, result.ok ? result : { ...result, error: result.errors?.join(' | ') });
      }

      if (url.pathname === '/api/inventory/save' && request.method === 'POST') {
        return await runMutableOperation(response, async () => {
          const body = await readJsonBody(request);
          const loadedCatalog = await readCatalog(catalogPath);
          const result = await saveInventoryChanges({
            inventoryPath,
            catalog: loadedCatalog.catalog,
            changes: body.changes,
            expectedInventoryHash: body.expectedInventoryHash,
            confirmStockWithoutPrice: body.confirmStockWithoutPrice === true,
            allowDemo: demoMode,
            backupDirectory: inventoryBackupDirectory,
            historyFile: inventoryHistoryFile,
            ...(inventoryWriteFile ? { writeInventory: inventoryWriteFile } : {})
          });
          return sendJson(response, result.ok ? 200 : result.status || 400, result.ok ? result : { ...result, error: result.errors?.join(' | ') });
        });
      }

      if (url.pathname === '/api/inventory/color/preview' && request.method === 'POST') {
        const body = await readJsonBody(request);
        const loadedCatalog = await readCatalog(catalogPath);
        const result = await previewInventoryColorChanges({
          inventoryPath,
          catalog: loadedCatalog.catalog,
          operations: body.operations,
          confirmStockWithoutPrice: body.confirmStockWithoutPrice === true,
          allowDemo: demoMode
        });
        return sendJson(response, result.ok ? 200 : result.status || 400, result.ok ? result : { ...result, error: result.errors?.join(' | ') });
      }

      if (url.pathname === '/api/inventory/color/save' && request.method === 'POST') {
        return await runMutableOperation(response, async () => {
          const body = await readJsonBody(request);
          const loadedCatalog = await readCatalog(catalogPath);
          const result = await saveInventoryColorChanges({
            inventoryPath,
            catalog: loadedCatalog.catalog,
            operations: body.operations,
            expectedInventoryHash: body.expectedInventoryHash,
            confirmStockWithoutPrice: body.confirmStockWithoutPrice === true,
            allowDemo: demoMode,
            backupDirectory: inventoryBackupDirectory,
            historyFile: inventoryHistoryFile,
            ...(inventoryWriteFile ? { writeInventory: inventoryWriteFile } : {})
          });
          return sendJson(response, result.ok ? 200 : result.status || 400, result.ok ? result : { ...result, error: result.errors?.join(' | ') });
        });
      }

      if (url.pathname === '/api/inventory/backups' && request.method === 'GET') {
        const loadedCatalog = await readCatalog(catalogPath);
        return sendJson(response, 200, { backups: await listInventoryBackups(inventoryBackupDirectory, loadedCatalog.catalog, { allowDemo: demoMode }) });
      }

      if (url.pathname === '/api/inventory/history' && request.method === 'GET') {
        return sendJson(response, 200, { history: await readInventoryHistory(inventoryHistoryFile) });
      }

      if (url.pathname === '/api/inventory/restore' && request.method === 'POST') {
        return await runMutableOperation(response, async () => {
          const body = await readJsonBody(request);
          if (body.confirm !== true) return sendJson(response, 400, { error: 'Confirme explicitamente a restauracao do backup.' });
          const loadedCatalog = await readCatalog(catalogPath);
          const result = await restoreInventoryBackup({
            inventoryPath,
            backupDirectory: inventoryBackupDirectory,
            historyFile: inventoryHistoryFile,
            backupName: body.backupName,
            expectedInventoryHash: body.expectedInventoryHash,
            catalog: loadedCatalog.catalog,
            allowDemo: demoMode,
            ...(inventoryWriteFile ? { writeInventory: inventoryWriteFile } : {})
          });
          return sendJson(response, result.ok ? 200 : result.status || 400, result.ok ? result : { ...result, error: result.errors?.join(' | ') });
        });
      }

      if (url.pathname === '/api/inventory/export.csv' && request.method === 'GET') {
        const loadedCatalog = await readCatalog(catalogPath);
        const loadedInventory = await readInventory(inventoryPath, loadedCatalog.catalog, { allowDemo: demoMode });
        if (!loadedInventory.exists) return sendJson(response, 404, { error: 'Inventario ainda nao foi criado.' });
        const exported = exportInventoryCsv(loadedInventory.inventory, loadedCatalog.catalog, loadedInventory.contentHash);
        response.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="estoque-privado-celulars.csv"',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        });
        return response.end(exported.csv);
      }

      if (url.pathname === '/api/inventory/availability.csv' && request.method === 'GET') {
        const loadedCatalog = await readCatalog(catalogPath);
        const loadedInventory = await readInventory(inventoryPath, loadedCatalog.catalog, { allowDemo: demoMode });
        if (!loadedInventory.exists) return sendJson(response, 404, { error: 'Inventario ainda nao foi criado.' });
        const exported = exportAvailabilityCsv(loadedInventory.inventory, loadedCatalog.catalog);
        response.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="disponibilidade-interna-celulars.csv"',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        });
        return response.end(exported.csv);
      }

      if (url.pathname === '/api/inventory/validate.csv' && request.method === 'POST') {
        const source = await readCsvBody(request);
        const loadedCatalog = await readCatalog(catalogPath);
        const loadedInventory = await readInventory(inventoryPath, loadedCatalog.catalog, { allowDemo: demoMode });
        if (!loadedInventory.exists) return sendJson(response, 404, { error: 'Inventario ainda nao foi criado.' });
        const result = validateInventoryCsv(loadedInventory.inventory, loadedCatalog.catalog, loadedInventory.contentHash, source);
        return sendJson(response, 200, {
          ...result,
          errorReport: result.errors.length ? inventoryCsvErrorReport(result.errors) : ''
        });
      }

      if (url.pathname === '/api/inventory/import.csv' && request.method === 'POST') {
        return await runMutableOperation(response, async () => {
          const source = await readCsvBody(request);
          const loadedCatalog = await readCatalog(catalogPath);
          const loadedInventory = await readInventory(inventoryPath, loadedCatalog.catalog, { allowDemo: demoMode });
          if (!loadedInventory.exists) return sendJson(response, 404, { error: 'Inventario ainda nao foi criado.' });
          const expectedHash = String(request.headers['x-inventory-hash'] || '');
          if (!expectedHash || expectedHash !== loadedInventory.contentHash) {
            return sendJson(response, 409, { error: 'O inventario mudou desde a previa. Valide novamente a planilha.' });
          }
          const validated = validateInventoryCsv(loadedInventory.inventory, loadedCatalog.catalog, loadedInventory.contentHash, source);
          if (!validated.valid) {
            return sendJson(response, 400, {
              ...validated,
              error: 'A planilha deixou de ser valida. Corrija os erros e valide novamente.',
              errorReport: inventoryCsvErrorReport(validated.errors)
            });
          }
          if (!validated.changes.length) return sendJson(response, 400, { error: 'A planilha nao contem alteracoes de estoque.' });
          const requiresConfirmation = validated.warnings.some(warning => warning.type === 'stock_without_price');
          const confirmed = request.headers['x-confirm-stock-without-price'] === 'true';
          if (requiresConfirmation && !confirmed) return sendJson(response, 400, { error: 'Confirme explicitamente o estoque CPO com preco zerado.' });
          const result = await saveInventoryChanges({
            inventoryPath,
            catalog: loadedCatalog.catalog,
            changes: validated.changes.map(change => ({ inventory_id: change.inventory_id, ...change.after })),
            expectedInventoryHash: loadedInventory.contentHash,
            confirmStockWithoutPrice: confirmed,
            allowDemo: demoMode,
            backupDirectory: inventoryBackupDirectory,
            historyFile: inventoryHistoryFile,
            historyType: 'spreadsheet_import',
            historyContext: {
              filename: safeImportFilename(request.headers['x-import-filename']),
              rowsRead: validated.summary.rowsRead
            },
            ...(inventoryWriteFile ? { writeInventory: inventoryWriteFile } : {})
          });
          return sendJson(response, result.ok ? 200 : result.status || 400, result.ok ? result : { ...result, error: result.errors?.join(' | ') });
        });
      }

      if (url.pathname === '/api/export/current' && request.method === 'GET') {
        const loaded = await readCatalog(catalogPath);
        response.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename="catalog-public.json"',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        });
        return response.end(jsonText(loaded.catalog));
      }

      if (url.pathname === '/api/export/cpo.csv' && request.method === 'GET') {
        const mode = url.searchParams.get('mode') || 'template';
        const filenames = {
          template: 'precos-cpo-celulars.csv',
          zero: 'precos-cpo-celulars-zerados.csv',
          complete: 'catalogo-cpo-celulars-completo.csv'
        };
        if (!Object.hasOwn(filenames, mode)) return sendJson(response, 400, { error: 'Modo de exportação CSV inválido.' });
        const loaded = await readCatalog(catalogPath);
        const exported = exportCpoCsv(loaded.catalog, contentHash(loaded.source), { mode });
        response.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filenames[mode]}"`,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        });
        return response.end(exported.csv);
      }

      if (url.pathname === '/api/validate/cpo.csv' && request.method === 'POST') {
        const source = await readCsvBody(request);
        const loaded = await readCatalog(catalogPath);
        const result = validateCpoCsv(loaded.catalog, contentHash(loaded.source), source);
        return sendJson(response, 200, {
          ...result,
          errorReport: result.errors.length ? cpoCsvErrorReport(result.errors) : ''
        });
      }

      if (url.pathname === '/api/import/cpo.csv' && request.method === 'POST') {
        return await runMutableOperation(response, async () => {
          const source = await readCsvBody(request);
          const loaded = await readCatalog(catalogPath);
          const currentHash = contentHash(loaded.source);
          const expectedHash = String(request.headers['x-catalog-hash'] || '');
          if (!expectedHash || expectedHash !== currentHash) {
            return sendJson(response, 409, { error: 'O catálogo mudou desde a prévia. Valide novamente a planilha.' });
          }
          const validated = validateCpoCsv(loaded.catalog, currentHash, source);
          if (!validated.valid) {
            return sendJson(response, 400, {
              ...validated,
              error: 'A planilha deixou de ser válida. Corrija os erros e valide novamente.',
              errorReport: cpoCsvErrorReport(validated.errors)
            });
          }
          if (!validated.changes.length) return sendJson(response, 400, { error: 'A planilha não contém alterações de preço.' });
          const result = await saveCatalogChanges({
            changes: validated.changes.map(change => ({ id: change.id, capacity: change.capacity, usd: change.after })),
            confirmHighValues: request.headers['x-confirm-high-values'] === 'true',
            expectedCatalogHash: currentHash,
            historyContext: {
              type: 'spreadsheet_import',
              filename: safeImportFilename(request.headers['x-import-filename']),
              rowsRead: validated.summary.rowsRead
            },
            catalogPath,
            catalogModulePath,
            backupDirectory,
            historyFile,
            validateProject,
            writeCatalogFiles
          });
          return sendJson(response, result.ok ? 200 : result.status || 400, result.ok ? result : { ...result, error: result.errors?.join(' | ') });
        });
      }

      if (url.pathname === '/api/validate-import' && request.method === 'POST') {
        const body = await readJsonBody(request);
        const loaded = await readCatalog(catalogPath);
        const result = validateImport(loaded.catalog, body.catalog);
        return sendJson(response, result.valid ? 200 : 400, result);
      }

      if (url.pathname === '/api/save' && request.method === 'POST') {
        return await runMutableOperation(response, async () => {
          const body = await readJsonBody(request);
          const result = await saveCatalogChanges({
            changes: body.changes,
            confirmHighValues: body.confirmHighValues === true,
            expectedCatalogHash: body.expectedCatalogHash,
            catalogPath,
            catalogModulePath,
            backupDirectory,
            historyFile,
            validateProject,
            writeCatalogFiles
          });
          return sendJson(response, result.ok ? 200 : result.status || 400, result);
        });
      }

      if (url.pathname === '/api/build' && request.method === 'POST') {
        return await runMutableOperation(response, async () => {
          await readJsonBody(request);
          if (demoMode) return sendJson(response, 403, { error: 'Build bloqueado no modo demonstracao.' });
          const result = await buildProject();
          const loaded = await readCatalog(catalogPath);
          return sendJson(response, 200, {
            ok: true,
            result,
            distPath: distDirectory,
            distFiles: await countFiles(distDirectory),
            catalogHash: loaded.validation.contentHash
          });
        });
      }

      if (url.pathname.startsWith('/api/')) return sendJson(response, 404, { error: 'Rota nao encontrada.' });
      return sendJson(response, 404, { error: 'Arquivo nao encontrado.' });
    } catch (error) {
      return sendJson(response, error.status || 500, { error: error.message, detail: error.result || undefined });
    }
  });

  return {
    server,
    async listen() {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(requestedPort, host, resolve);
      });
      return server.address();
    },
    async close() {
      if (!server.listening) return;
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const port = Number(process.env.CELULARS_CATALOG_ADMIN_PORT || 4175);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Porta invalida. Use CELULARS_CATALOG_ADMIN_PORT entre 1024 e 65535.');
  const demoMode = process.argv.includes('--demo');
  let demoRoot = null;
  let managerOptions = { port };
  if (demoMode) {
    demoRoot = await mkdtemp(path.join(os.tmpdir(), 'celulars-catalog-demo-'));
    const realCatalog = await readCatalog();
    const demoCatalog = structuredClone(realCatalog.catalog);
    let demoPriceIndex = 0;
    for (const product of demoCatalog.products) {
      if (product.group !== 'cpo') continue;
      for (const capacity of Object.keys(product.capacities)) {
        product.capacities[capacity].usd = [111.11, 222.22, 333.33][demoPriceIndex++ % 3];
      }
    }
    const demoCatalogPath = path.join(demoRoot, 'catalog-public.json');
    const demoInventoryPath = path.join(demoRoot, 'inventory-private.json');
    await writeFile(demoCatalogPath, jsonText(demoCatalog), 'utf8');
    await writeFile(demoInventoryPath, jsonText(createDemoColorInventory(demoCatalog)), 'utf8');
    managerOptions = {
      port,
      demoMode: true,
      catalogPath: demoCatalogPath,
      catalogModulePath: null,
      inventoryPath: demoInventoryPath,
      backupDirectory: path.join(demoRoot, 'backups'),
      historyFile: path.join(demoRoot, 'history', 'catalog-changes.jsonl'),
      inventoryBackupDirectory: path.join(demoRoot, 'backups'),
      inventoryHistoryFile: path.join(demoRoot, 'history', 'inventory-changes.jsonl')
    };
  }
  const manager = createCatalogAdminServer(managerOptions);
  await manager.listen();
  console.log('Gerenciador CELULARS disponivel em:');
  console.log(`http://127.0.0.1:${port}`);
  if (demoMode) console.log('MODO DEMONSTRACAO: dados ficticios isolados em pasta temporaria; build bloqueado.');
  console.log('Pressione Ctrl+C para encerrar.');
  if (demoRoot) {
    const cleanup = async () => {
      await manager.close();
      await rm(demoRoot, { recursive: true, force: true });
      process.exit(0);
    };
    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);
  }
}
