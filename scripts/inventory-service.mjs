import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  applyInventoryChanges,
  createInitialInventory,
  inventoryContentHash,
  validateInventory
} from './inventory-rules.mjs';

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace('T', '-').replace(/\.\d{3}Z$/, '');
}

function fieldHistory(diff, inventory) {
  const items = new Map(inventory.items.map(item => [item.inventory_id, item]));
  const entries = [];
  for (const change of diff) {
    const item = items.get(change.inventory_id);
    for (const field of ['stock_on_hand', 'reserved', 'low_stock_threshold', 'status', 'notes']) {
      if (change.before[field] === change.after[field]) continue;
      entries.push({
        inventory_id: change.inventory_id,
        product_id: item?.product_id || null,
        capacity: item?.capacity || null,
        field,
        before: change.before[field],
        after: change.after[field]
      });
    }
  }
  return entries;
}

function inventoryDiff(beforeInventory, afterInventory) {
  const after = new Map(afterInventory.items.map(item => [item.inventory_id, item]));
  const fields = ['stock_on_hand', 'reserved', 'low_stock_threshold', 'status', 'notes'];
  return beforeInventory.items.flatMap(item => {
    const next = after.get(item.inventory_id);
    if (!next) return [];
    const before = Object.fromEntries(fields.map(field => [field, item[field]]));
    const afterValues = Object.fromEntries(fields.map(field => [field, next[field]]));
    return JSON.stringify(before) === JSON.stringify(afterValues) ? [] : [{ inventory_id: item.inventory_id, before, after: afterValues }];
  });
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
  try {
    await writeFile(temporaryPath, contents, 'utf8');
    if (await readFile(temporaryPath, 'utf8') !== contents) throw new Error('Falha ao verificar arquivo temporario do inventario.');
    await rename(temporaryPath, filePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

export async function inventoryFileExists(inventoryPath) {
  return exists(inventoryPath);
}

export async function readInventory(inventoryPath, catalog, { allowDemo = false } = {}) {
  if (!await exists(inventoryPath)) return { exists: false, source: null, inventory: null, validation: null, contentHash: null };
  const source = await readFile(inventoryPath, 'utf8');
  let inventory;
  try {
    inventory = JSON.parse(source);
  } catch (error) {
    throw new Error(`Inventario JSON invalido: ${error.message}`);
  }
  const validation = validateInventory(inventory, catalog, { allowDemo });
  if (!validation.valid) throw new Error(`Inventario invalido: ${validation.errors.join(' | ')}`);
  return { exists: true, source, inventory, validation, contentHash: inventoryContentHash(source) };
}

async function createBackup(inventoryPath, backupDirectory) {
  if (!await exists(inventoryPath)) return null;
  await mkdir(backupDirectory, { recursive: true });
  const source = await readFile(inventoryPath, 'utf8');
  const backupName = `inventory-private-${timestampForFile()}-${randomUUID().slice(0, 8)}.json`;
  const backupPath = path.join(backupDirectory, backupName);
  await writeFile(backupPath, source, 'utf8');
  return { backupName, backupPath, source };
}

async function appendHistory(historyFile, entry) {
  await mkdir(path.dirname(historyFile), { recursive: true });
  await appendFile(historyFile, `${JSON.stringify(entry)}\n`, 'utf8');
}

async function restorePrevious(inventoryPath, source) {
  if (source === null) await unlink(inventoryPath).catch(() => {});
  else await atomicWrite(inventoryPath, source);
}

export async function initializeInventory({
  catalog,
  catalogHash,
  expectedCatalogHash,
  inventoryPath,
  backupDirectory,
  historyFile,
  demo = false,
  now = new Date().toISOString(),
  writeInventory = atomicWrite
}) {
  if (expectedCatalogHash !== catalogHash) return { ok: false, status: 409, errors: ['O catalogo mudou desde a previa. Recarregue antes de criar o inventario.'] };
  if (await exists(inventoryPath)) return { ok: false, status: 409, errors: ['O inventario real ja existe.'] };
  const inventory = createInitialInventory(catalog, { demo, now });
  const validation = validateInventory(inventory, catalog, { allowDemo: demo });
  if (!validation.valid) return { ok: false, status: 400, errors: validation.errors };
  const source = jsonText(inventory);
  try {
    await writeInventory(inventoryPath, source);
    const written = await readInventory(inventoryPath, catalog, { allowDemo: demo });
    if (written.contentHash !== inventoryContentHash(source)) throw new Error('Hash do inventario inicial gravado diverge da previa.');
    await appendHistory(historyFile, {
      changedAt: now,
      type: demo ? 'demo_initialize' : 'initialize',
      demo,
      itemCount: inventory.items.length,
      beforeHash: null,
      afterHash: written.contentHash,
      changes: []
    });
    return { ok: true, inventory, stats: validation.stats, contentHash: written.contentHash, backupName: null };
  } catch (error) {
    await restorePrevious(inventoryPath, null);
    return { ok: false, status: 500, errors: [`Criacao do inventario revertida: ${error.message}`], rolledBack: true };
  }
}

export async function previewInventoryChanges({ inventoryPath, catalog, changes, confirmStockWithoutPrice = false, allowDemo = false }) {
  const current = await readInventory(inventoryPath, catalog, { allowDemo });
  if (!current.exists) return { ok: false, status: 404, errors: ['Inventario ainda nao foi criado.'] };
  const applied = applyInventoryChanges(current.inventory, catalog, changes, { confirmStockWithoutPrice });
  return {
    ok: applied.valid,
    status: applied.valid ? 200 : 400,
    errors: applied.errors,
    warnings: applied.warnings,
    changes: applied.diff,
    currentHash: current.contentHash,
    nextHash: applied.inventory ? inventoryContentHash(jsonText(applied.inventory)) : null
  };
}

export async function saveInventoryChanges({
  inventoryPath,
  catalog,
  changes,
  expectedInventoryHash,
  confirmStockWithoutPrice = false,
  allowDemo = false,
  backupDirectory,
  historyFile,
  historyType = 'manual_edit',
  historyContext = {},
  now = new Date().toISOString(),
  writeInventory = atomicWrite,
  afterWrite = async () => {}
}) {
  const current = await readInventory(inventoryPath, catalog, { allowDemo });
  if (!current.exists) return { ok: false, status: 404, errors: ['Inventario ainda nao foi criado.'] };
  if (!expectedInventoryHash || expectedInventoryHash !== current.contentHash) {
    return { ok: false, status: 409, errors: ['O inventario mudou desde a previa. Recarregue e revise novamente.'] };
  }
  const applied = applyInventoryChanges(current.inventory, catalog, changes, { confirmStockWithoutPrice, now });
  if (!applied.valid) return { ok: false, status: 400, errors: applied.errors, warnings: applied.warnings };
  if (!applied.diff.length) return { ok: false, status: 400, errors: ['As alteracoes enviadas nao modificam o inventario.'], warnings: applied.warnings };
  const nextSource = jsonText(applied.inventory);
  const nextHash = inventoryContentHash(nextSource);
  const backup = await createBackup(inventoryPath, backupDirectory);
  try {
    await writeInventory(inventoryPath, nextSource);
    const written = await readInventory(inventoryPath, catalog, { allowDemo });
    if (written.contentHash !== nextHash) throw new Error('Hash do inventario gravado nao corresponde ao conteudo validado.');
    await afterWrite(written.inventory);
    await appendHistory(historyFile, {
      changedAt: now,
      type: historyType,
      demo: current.inventory.demo,
      ...historyContext,
      changeCount: applied.diff.length,
      beforeHash: current.contentHash,
      afterHash: nextHash,
      changes: fieldHistory(applied.diff, current.inventory)
    });
    return {
      ok: true,
      changes: applied.diff,
      warnings: applied.warnings,
      backupName: backup?.backupName || null,
      beforeHash: current.contentHash,
      afterHash: nextHash,
      inventory: written.inventory,
      stats: written.validation.stats
    };
  } catch (error) {
    await restorePrevious(inventoryPath, current.source);
    return {
      ok: false,
      status: 500,
      errors: [`Gravacao do inventario revertida: ${error.message}`],
      rolledBack: true,
      backupName: backup?.backupName || null
    };
  }
}

export async function listInventoryBackups(backupDirectory, catalog, { allowDemo = false } = {}) {
  if (!await exists(backupDirectory)) return [];
  const names = (await readdir(backupDirectory)).filter(name => /^inventory-private-\d{8}-\d{6}-[a-f0-9]{8}\.json$/i.test(name));
  const entries = [];
  for (const name of names.sort().reverse()) {
    const filePath = path.join(backupDirectory, name);
    try {
      const source = await readFile(filePath, 'utf8');
      const inventory = JSON.parse(source);
      const validation = validateInventory(inventory, catalog, { allowDemo });
      const fileStat = await stat(filePath);
      entries.push({ name, valid: validation.valid, size: fileStat.size, modifiedAt: fileStat.mtime.toISOString(), contentHash: inventoryContentHash(source) });
    } catch {
      entries.push({ name, valid: false, size: null, modifiedAt: null, contentHash: null });
    }
  }
  return entries;
}

export async function readInventoryHistory(historyFile, { limit = 100 } = {}) {
  if (!await exists(historyFile)) return [];
  const source = await readFile(historyFile, 'utf8');
  return source.split(/\r?\n/).filter(Boolean).slice(-limit).reverse().map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return { type: 'invalid_history_line', changedAt: null };
    }
  });
}

export async function restoreInventoryBackup({
  inventoryPath,
  backupDirectory,
  historyFile,
  backupName,
  expectedInventoryHash,
  catalog,
  allowDemo = false,
  writeInventory = atomicWrite,
  now = new Date().toISOString()
}) {
  if (!/^inventory-private-\d{8}-\d{6}-[a-f0-9]{8}\.json$/i.test(String(backupName || ''))) {
    return { ok: false, status: 400, errors: ['Nome de backup invalido.'] };
  }
  const current = await readInventory(inventoryPath, catalog, { allowDemo });
  if (!current.exists) return { ok: false, status: 404, errors: ['Inventario ainda nao foi criado.'] };
  if (!expectedInventoryHash || current.contentHash !== expectedInventoryHash) return { ok: false, status: 409, errors: ['O inventario mudou. Recarregue antes de restaurar.'] };
  const backupPath = path.join(backupDirectory, backupName);
  if (!await exists(backupPath)) return { ok: false, status: 404, errors: ['Backup nao encontrado.'] };
  const backupSource = await readFile(backupPath, 'utf8');
  let backupInventory;
  try {
    backupInventory = JSON.parse(backupSource);
  } catch {
    return { ok: false, status: 400, errors: ['Backup possui JSON invalido.'] };
  }
  const validation = validateInventory(backupInventory, catalog, { allowDemo });
  if (!validation.valid) return { ok: false, status: 400, errors: validation.errors };
  const safetyBackup = await createBackup(inventoryPath, backupDirectory);
  try {
    await writeInventory(inventoryPath, backupSource);
    const written = await readInventory(inventoryPath, catalog, { allowDemo });
    const restoredDiff = inventoryDiff(current.inventory, backupInventory);
    await appendHistory(historyFile, {
      changedAt: now,
      type: 'restore',
      demo: backupInventory.demo,
      restoredBackup: backupName,
      safetyBackup: safetyBackup?.backupName || null,
      beforeHash: current.contentHash,
      afterHash: written.contentHash,
      changeCount: restoredDiff.length,
      changes: fieldHistory(restoredDiff, current.inventory)
    });
    return { ok: true, restoredBackup: backupName, safetyBackup: safetyBackup?.backupName || null, contentHash: written.contentHash, inventory: written.inventory, stats: written.validation.stats };
  } catch (error) {
    await restorePrevious(inventoryPath, current.source);
    return { ok: false, status: 500, errors: [`Restauracao revertida: ${error.message}`], rolledBack: true };
  }
}
