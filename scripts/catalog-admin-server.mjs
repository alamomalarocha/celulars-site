import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogModuleSource, catalogStats, contentHash, diffCpoPrices, validateCatalog, validateImport } from './catalog-rules.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(scriptDirectory, '..');
const toolRoot = path.join(projectRoot, 'tools', 'catalog-manager');
const defaultCatalogPath = path.join(projectRoot, 'data', 'catalog-public.json');
const defaultCatalogModulePath = path.join(projectRoot, 'data', 'catalog-public.js');
const defaultBackupDirectory = path.join(projectRoot, 'data', 'backups');
const defaultHistoryFile = path.join(projectRoot, 'data', 'history', 'catalog-changes.jsonl');
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const HIGH_PRICE_USD = 10000;
const STATIC_FILES = new Map([
  ['/', { file: 'index.html', type: 'text/html; charset=utf-8' }],
  ['/index.html', { file: 'index.html', type: 'text/html; charset=utf-8' }],
  ['/app.js', { file: 'app.js', type: 'text/javascript; charset=utf-8' }],
  ['/styles.css', { file: 'styles.css', type: 'text/css; charset=utf-8' }]
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

async function atomicWrite(filePath, contents) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}-${randomUUID()}`;
  await writeFile(temporaryPath, contents, 'utf8');
  try {
    const writtenContents = await readFile(temporaryPath, 'utf8');
    if (writtenContents !== contents) throw new Error('Falha ao verificar o arquivo temporario antes da gravacao atomica.');
    await rename(temporaryPath, filePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
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
  await atomicWrite(catalogPath, source);
  if (catalogModulePath) await atomicWrite(catalogModulePath, catalogModuleSource(catalog));
}

export async function saveCatalogChanges({
  changes,
  confirmHighValues = false,
  catalogPath = defaultCatalogPath,
  catalogModulePath = defaultCatalogModulePath,
  backupDirectory = defaultBackupDirectory,
  historyFile = defaultHistoryFile,
  validateProject = async () => runNodeFile('scripts/validate-site.mjs')
}) {
  const current = await readCatalog(catalogPath);
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
    await atomicWrite(catalogPath, nextSource);
    if (catalogModulePath) await atomicWrite(catalogModulePath, catalogModuleSource(next));
    const written = await readCatalog(catalogPath);
    if (written.validation.contentHash !== contentHash(next)) throw new Error('Hash do arquivo gravado nao corresponde ao catalogo validado.');
    await validateProject();

    await mkdir(path.dirname(historyFile), { recursive: true });
    const changedAt = new Date().toISOString();
    const historyLines = finalChanges.map(change => JSON.stringify({
      changedAt,
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
  const validateProject = options.validateProject || (async () => runNodeFile('scripts/validate-site.mjs'));
  const buildProject = options.buildProject || (async () => ({
    validate: await runNodeFile('scripts/validate-site.mjs'),
    build: await runNodeFile('scripts/build-public.mjs'),
    distValidation: await runNodeFile('scripts/validate-site.mjs', ['--dist'])
  }));

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
          readAt: new Date().toISOString()
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

      if (url.pathname === '/api/validate-import' && request.method === 'POST') {
        const body = await readJsonBody(request);
        const loaded = await readCatalog(catalogPath);
        const result = validateImport(loaded.catalog, body.catalog);
        return sendJson(response, result.valid ? 200 : 400, result);
      }

      if (url.pathname === '/api/save' && request.method === 'POST') {
        const body = await readJsonBody(request);
        const result = await saveCatalogChanges({
          changes: body.changes,
          confirmHighValues: body.confirmHighValues === true,
          catalogPath,
          catalogModulePath,
          backupDirectory,
          historyFile,
          validateProject
        });
        return sendJson(response, result.ok ? 200 : result.status || 400, result);
      }

      if (url.pathname === '/api/build' && request.method === 'POST') {
        await readJsonBody(request);
        const result = await buildProject();
        const loaded = await readCatalog(catalogPath);
        return sendJson(response, 200, {
          ok: true,
          result,
          distPath: path.join(projectRoot, 'dist'),
          distFiles: await countFiles(path.join(projectRoot, 'dist')),
          catalogHash: loaded.validation.contentHash
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
  const manager = createCatalogAdminServer({ port });
  await manager.listen();
  console.log('Gerenciador CELULARS disponivel em:');
  console.log(`http://127.0.0.1:${port}`);
  console.log('Pressione Ctrl+C para encerrar.');
}
