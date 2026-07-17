import { createHash } from 'node:crypto';

export const INVENTORY_VERSION = 1;
export const INVENTORY_STATUSES = Object.freeze(['active', 'paused', 'archived']);
export const INVENTORY_TRACKING_MODES = Object.freeze(['aggregate', 'by_color']);

const TOP_LEVEL_KEYS = new Set(['version', 'demo', 'updated_at', 'items']);
const ITEM_KEYS = new Set([
  'inventory_id',
  'product_id',
  'capacity',
  'color',
  'tracking_mode',
  'stock_on_hand',
  'reserved',
  'low_stock_threshold',
  'status',
  'notes',
  'color_variants',
  'updated_at'
]);
const COLOR_VARIANT_KEYS = new Set(['color', 'stock_on_hand', 'reserved', 'updated_at']);
const EDITABLE_KEYS = new Set(['inventory_id', 'stock_on_hand', 'reserved', 'low_stock_threshold', 'status', 'notes']);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validInventoryIso(value) {
  if (typeof value !== 'string' || !value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function unknownKeys(record, allowed, label, errors) {
  for (const key of Object.keys(record || {})) {
    if (!allowed.has(key)) errors.push(`${label}: campo desconhecido (${key}).`);
  }
}

function capacitySlug(capacity) {
  return String(capacity)
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function validateNonNegativeInteger(value, field, label, errors) {
  if (!Number.isInteger(value) || value < 0) errors.push(`${label}: ${field} deve ser inteiro maior ou igual a zero.`);
}

export function inventoryTrackingMode(item) {
  return item?.tracking_mode === undefined ? 'aggregate' : item.tracking_mode;
}

export function inventoryColorVariants(item) {
  return Array.isArray(item?.color_variants) ? item.color_variants : [];
}

export function inventoryIdFor(productId, capacity) {
  return `${productId}__${capacitySlug(capacity)}`;
}

export function inventoryContentHash(value) {
  const source = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(source).digest('hex');
}

export function catalogInventoryRows(catalog) {
  const rows = [];
  for (const product of catalog?.products || []) {
    for (const [capacity, price] of Object.entries(product.capacities || {})) {
      rows.push({
        inventory_id: inventoryIdFor(product.id, capacity),
        product_id: product.id,
        model: product.model,
        year: product.year,
        group: product.group,
        capacity,
        colors: [...(product.colors || [])],
        price_usd: price.usd
      });
    }
  }
  return rows;
}

export function createInitialInventory(catalog, { demo = false, now = new Date().toISOString() } = {}) {
  if (!validInventoryIso(now)) throw new Error('Data de inicializacao do inventario invalida.');
  const items = catalogInventoryRows(catalog).map((row, index) => ({
    inventory_id: row.inventory_id,
    product_id: row.product_id,
    capacity: row.capacity,
    color: null,
    stock_on_hand: demo ? [3, 2, 1][index % 3] : 0,
    reserved: demo && index % 4 === 0 ? 1 : 0,
    low_stock_threshold: 1,
    status: 'active',
    notes: demo ? 'Dado ficticio de demonstracao.' : '',
    updated_at: now
  }));
  return { version: INVENTORY_VERSION, demo, updated_at: now, items };
}

function validateColorVariants(item, catalogRow, label, errors) {
  const variants = item.color_variants;
  if (!Array.isArray(variants) || variants.length === 0) {
    errors.push(`${label}: by_color exige pelo menos uma variante de cor.`);
    return;
  }
  const colors = new Set();
  let stockTotal = 0;
  let reservedTotal = 0;
  for (const [variantIndex, variant] of variants.entries()) {
    const variantLabel = `${label}, variante ${variantIndex + 1}`;
    if (!isRecord(variant)) {
      errors.push(`${variantLabel}: registro invalido.`);
      continue;
    }
    unknownKeys(variant, COLOR_VARIANT_KEYS, variantLabel, errors);
    if (typeof variant.color !== 'string' || !variant.color) {
      errors.push(`${variantLabel}: color deve usar o nome oficial do catalogo.`);
    } else {
      if (!catalogRow?.colors.includes(variant.color)) errors.push(`${variantLabel}: cor inexistente no catalogo (${variant.color}).`);
      if (colors.has(variant.color)) errors.push(`${variantLabel}: cor duplicada (${variant.color}).`);
      colors.add(variant.color);
    }
    validateNonNegativeInteger(variant.stock_on_hand, 'stock_on_hand', variantLabel, errors);
    validateNonNegativeInteger(variant.reserved, 'reserved', variantLabel, errors);
    if (Number.isInteger(variant.stock_on_hand) && Number.isInteger(variant.reserved) && variant.reserved > variant.stock_on_hand) {
      errors.push(`${variantLabel}: reserved nao pode superar stock_on_hand.`);
    }
    if (!validInventoryIso(variant.updated_at)) errors.push(`${variantLabel}: updated_at deve ser ISO valido.`);
    if (Number.isInteger(variant.stock_on_hand)) stockTotal += variant.stock_on_hand;
    if (Number.isInteger(variant.reserved)) reservedTotal += variant.reserved;
  }
  if (stockTotal !== item.stock_on_hand) errors.push(`${label}: stock_on_hand deve ser exatamente a soma das variantes de cor.`);
  if (reservedTotal !== item.reserved) errors.push(`${label}: reserved deve ser exatamente a soma das variantes de cor.`);
}

export function inventoryColorConsistency(item) {
  if (inventoryTrackingMode(item) !== 'by_color') return { consistent: true, stockTotal: item.stock_on_hand, reservedTotal: item.reserved };
  const variants = inventoryColorVariants(item);
  const stockTotal = variants.reduce((total, variant) => total + (Number.isInteger(variant.stock_on_hand) ? variant.stock_on_hand : 0), 0);
  const reservedTotal = variants.reduce((total, variant) => total + (Number.isInteger(variant.reserved) ? variant.reserved : 0), 0);
  return {
    consistent: stockTotal === item.stock_on_hand && reservedTotal === item.reserved,
    stockTotal,
    reservedTotal
  };
}

export function validateInventory(inventory, catalog, { allowDemo = false, requireComplete = true } = {}) {
  const errors = [];
  if (!isRecord(inventory)) return { valid: false, errors: ['Inventario deve ser um objeto JSON.'] };
  unknownKeys(inventory, TOP_LEVEL_KEYS, 'inventario', errors);
  if (inventory.version !== INVENTORY_VERSION) errors.push(`inventario: versao deve ser ${INVENTORY_VERSION}.`);
  if (typeof inventory.demo !== 'boolean') errors.push('inventario: demo deve ser booleano.');
  if (inventory.demo === true && !allowDemo) errors.push('Inventario de demonstracao nao pode ser usado como inventario real.');
  if (!validInventoryIso(inventory.updated_at)) errors.push('inventario: updated_at deve ser ISO valido.');
  if (!Array.isArray(inventory.items)) errors.push('inventario: items deve ser uma lista.');

  const catalogRows = catalogInventoryRows(catalog);
  const catalogById = new Map(catalogRows.map(row => [row.inventory_id, row]));
  const ids = new Set();
  for (const [index, item] of (Array.isArray(inventory.items) ? inventory.items : []).entries()) {
    const label = `item ${index + 1}`;
    if (!isRecord(item)) {
      errors.push(`${label}: registro invalido.`);
      continue;
    }
    unknownKeys(item, ITEM_KEYS, label, errors);
    if (typeof item.inventory_id !== 'string' || !item.inventory_id) errors.push(`${label}: inventory_id invalido.`);
    if (ids.has(item.inventory_id)) errors.push(`${label}: inventory_id duplicado (${item.inventory_id}).`);
    ids.add(item.inventory_id);

    const catalogRow = catalogById.get(item.inventory_id);
    if (!catalogRow) errors.push(`${label}: combinacao de produto e capacidade nao existe no catalogo.`);
    if (catalogRow && item.product_id !== catalogRow.product_id) errors.push(`${label}: product_id nao corresponde ao inventory_id.`);
    if (catalogRow && item.capacity !== catalogRow.capacity) errors.push(`${label}: capacidade nao corresponde ao catalogo.`);
    if (item.color !== null) errors.push(`${label}: color deve permanecer nulo.`);
    const trackingMode = inventoryTrackingMode(item);
    if (!INVENTORY_TRACKING_MODES.includes(trackingMode)) errors.push(`${label}: tracking_mode invalido.`);
    validateNonNegativeInteger(item.stock_on_hand, 'stock_on_hand', label, errors);
    validateNonNegativeInteger(item.reserved, 'reserved', label, errors);
    validateNonNegativeInteger(item.low_stock_threshold, 'low_stock_threshold', label, errors);
    if (Number.isInteger(item.stock_on_hand) && Number.isInteger(item.reserved) && item.reserved > item.stock_on_hand) {
      errors.push(`${label}: reserved nao pode superar stock_on_hand.`);
    }
    if (!INVENTORY_STATUSES.includes(item.status)) errors.push(`${label}: status invalido.`);
    if (typeof item.notes !== 'string' || item.notes.length > 500) errors.push(`${label}: notes deve ter no maximo 500 caracteres.`);
    if (!validInventoryIso(item.updated_at)) errors.push(`${label}: updated_at deve ser ISO valido.`);

    if (trackingMode === 'aggregate') {
      if (item.color_variants !== undefined && !Array.isArray(item.color_variants)) errors.push(`${label}: color_variants deve ser uma lista.`);
      if (Array.isArray(item.color_variants) && item.color_variants.length > 0) errors.push(`${label}: aggregate nao pode possuir variantes de cor.`);
    } else if (trackingMode === 'by_color') {
      validateColorVariants(item, catalogRow, label, errors);
    }
  }

  if (requireComplete && Array.isArray(inventory.items)) {
    for (const row of catalogRows) {
      if (!ids.has(row.inventory_id)) errors.push(`Inventario incompleto: ${row.inventory_id} esta ausente.`);
    }
    for (const id of ids) {
      if (!catalogById.has(id)) errors.push(`Inventario contem combinacao inexistente: ${id}.`);
    }
  }

  return { valid: errors.length === 0, errors, stats: errors.length ? null : inventoryStats(inventory, catalog) };
}

export function enrichInventory(inventory, catalog) {
  const rows = new Map(catalogInventoryRows(catalog).map(row => [row.inventory_id, row]));
  return inventory.items.map(item => {
    const catalogRow = rows.get(item.inventory_id);
    const available = item.stock_on_hand - item.reserved;
    const trackingMode = inventoryTrackingMode(item);
    const colorVariants = inventoryColorVariants(item).map(variant => ({
      ...variant,
      available: variant.stock_on_hand - variant.reserved
    }));
    return {
      ...item,
      ...catalogRow,
      tracking_mode: trackingMode,
      color_variants: colorVariants,
      available,
      visual_status: item.status === 'archived'
        ? 'archived'
        : item.status === 'paused'
          ? 'paused'
          : available === 0
            ? 'out_of_stock'
            : available <= item.low_stock_threshold
              ? 'low_stock'
              : 'available'
    };
  });
}

export function inventoryStats(inventory, catalog) {
  const rows = enrichInventory(inventory, catalog);
  const stockedModels = new Set(rows.filter(row => row.stock_on_hand > 0).map(row => row.product_id));
  const stockedCapacities = new Set(rows.filter(row => row.stock_on_hand > 0).map(row => row.capacity));
  const cpoRows = rows.filter(row => row.group === 'cpo');
  const byColorRows = rows.filter(row => row.tracking_mode === 'by_color');
  return {
    items: rows.length,
    stockOnHand: rows.reduce((total, row) => total + row.stock_on_hand, 0),
    reserved: rows.reduce((total, row) => total + row.reserved, 0),
    available: rows.reduce((total, row) => total + row.available, 0),
    modelsWithStock: stockedModels.size,
    capacitiesWithStock: stockedCapacities.size,
    lowStock: rows.filter(row => row.visual_status === 'low_stock').length,
    paused: rows.filter(row => row.status === 'paused').length,
    cpoZeroPrices: cpoRows.filter(row => row.price_usd === 0).length,
    cpoPositivePrices: cpoRows.filter(row => row.price_usd > 0).length,
    aggregateRecords: rows.filter(row => row.tracking_mode === 'aggregate').length,
    byColorRecords: byColorRows.length,
    colorVariants: byColorRows.reduce((total, row) => total + row.color_variants.length, 0),
    colorStockOnHand: byColorRows.reduce((total, row) => total + row.color_variants.reduce((sum, variant) => sum + variant.stock_on_hand, 0), 0),
    colorReserved: byColorRows.reduce((total, row) => total + row.color_variants.reduce((sum, variant) => sum + variant.reserved, 0), 0),
    colorInconsistencies: byColorRows.filter(row => !inventoryColorConsistency(row).consistent).length,
    cpoByColorZeroPrices: byColorRows.filter(row => row.group === 'cpo' && row.price_usd === 0).length
  };
}

export function inventoryAlerts(inventory, catalog, { staleAfterDays = 30, now = Date.now() } = {}) {
  const staleMs = staleAfterDays * 86400000;
  const alerts = [];
  for (const row of enrichInventory(inventory, catalog)) {
    if (row.visual_status === 'low_stock') alerts.push({ type: 'low_stock', inventory_id: row.inventory_id, message: 'Estoque baixo.' });
    if (row.reserved > 0) alerts.push({ type: 'reserved', inventory_id: row.inventory_id, message: 'Ha unidades reservadas.' });
    if (row.reserved > row.available) alerts.push({ type: 'reserved_over_free_stock', inventory_id: row.inventory_id, message: 'A quantidade reservada e maior que o estoque ainda livre.' });
    if (row.group === 'cpo' && row.stock_on_hand > 0 && row.price_usd === 0) alerts.push({ type: 'stock_without_price', inventory_id: row.inventory_id, message: 'Este item possui estoque, mas ainda nao possui preco CPO publicado.' });
    if (row.status === 'active' && row.stock_on_hand === 0) alerts.push({ type: 'active_without_stock', inventory_id: row.inventory_id, message: 'Item ativo sem estoque.' });
    if (row.status === 'paused' && row.stock_on_hand > 0) alerts.push({ type: 'paused_with_stock', inventory_id: row.inventory_id, message: 'Item pausado com estoque.' });
    if (Number.isFinite(Date.parse(row.updated_at)) && now - Date.parse(row.updated_at) > staleMs) alerts.push({ type: 'stale', inventory_id: row.inventory_id, message: 'Atualizacao de estoque antiga.' });
    if (row.tracking_mode === 'by_color') {
      if (!inventoryColorConsistency(row).consistent) alerts.push({ type: 'color_inconsistency', inventory_id: row.inventory_id, message: 'Os totais agregados divergem das variantes de cor.' });
      for (const variant of row.color_variants) {
        if (variant.stock_on_hand > 0 && variant.available <= row.low_stock_threshold) {
          alerts.push({ type: 'color_low_stock', inventory_id: row.inventory_id, color: variant.color, message: `${variant.color}: estoque baixo.` });
        }
        if (variant.reserved > 0) alerts.push({ type: 'color_reserved', inventory_id: row.inventory_id, color: variant.color, message: `${variant.color}: ha unidades reservadas.` });
      }
    }
  }
  return alerts;
}

export function validateInventoryChanges(inventory, catalog, changes, { confirmStockWithoutPrice = false } = {}) {
  const errors = [];
  const warnings = [];
  const normalized = [];
  const items = new Map(inventory.items.map(item => [item.inventory_id, item]));
  const catalogRows = new Map(catalogInventoryRows(catalog).map(row => [row.inventory_id, row]));
  if (!Array.isArray(changes) || !changes.length) errors.push('Nenhuma alteracao de estoque foi enviada.');
  if (Array.isArray(changes) && changes.length > 500) errors.push('Quantidade de alteracoes excede o limite permitido.');

  for (const [index, change] of (Array.isArray(changes) ? changes : []).entries()) {
    const label = `alteracao ${index + 1}`;
    if (!isRecord(change)) {
      errors.push(`${label}: registro invalido.`);
      continue;
    }
    unknownKeys(change, EDITABLE_KEYS, label, errors);
    const original = items.get(change.inventory_id);
    if (!original) {
      errors.push(`${label}: inventory_id inexistente.`);
      continue;
    }
    const next = {
      inventory_id: original.inventory_id,
      stock_on_hand: change.stock_on_hand,
      reserved: change.reserved,
      low_stock_threshold: change.low_stock_threshold,
      status: change.status,
      notes: change.notes
    };
    for (const field of ['stock_on_hand', 'reserved', 'low_stock_threshold']) {
      validateNonNegativeInteger(next[field], field, label, errors);
    }
    if (Number.isInteger(next.stock_on_hand) && Number.isInteger(next.reserved) && next.reserved > next.stock_on_hand) errors.push(`${label}: reservado nao pode superar estoque fisico.`);
    if (!INVENTORY_STATUSES.includes(next.status)) errors.push(`${label}: status invalido.`);
    if (typeof next.notes !== 'string' || next.notes.length > 500) errors.push(`${label}: observacao deve ter no maximo 500 caracteres.`);
    if (inventoryTrackingMode(original) === 'by_color' && (next.stock_on_hand !== original.stock_on_hand || next.reserved !== original.reserved)) {
      errors.push(`${label}: estoque e reservado agregados sao somente leitura no modo por cor. Edite as variantes.`);
    }
    const row = catalogRows.get(change.inventory_id);
    if (row?.group === 'cpo' && next.stock_on_hand > 0 && row.price_usd === 0) {
      warnings.push({ type: 'stock_without_price', inventory_id: change.inventory_id, message: `${row.model} ${row.capacity}: este item possui estoque, mas ainda nao possui preco CPO publicado.` });
    }
    normalized.push(next);
  }

  if (warnings.length && !confirmStockWithoutPrice) errors.push('Ha item com estoque sem preco CPO publicado; confirme explicitamente para continuar.');
  return { valid: errors.length === 0, errors, warnings, changes: normalized };
}

export function applyInventoryChanges(inventory, catalog, changes, options = {}) {
  const checked = validateInventoryChanges(inventory, catalog, changes, options);
  if (!checked.valid) return { ...checked, inventory: null, diff: [] };
  const now = options.now || new Date().toISOString();
  if (!validInventoryIso(now)) return { valid: false, errors: ['Data de alteracao invalida.'], warnings: checked.warnings, changes: [], inventory: null, diff: [] };
  const next = structuredClone(inventory);
  const byId = new Map(next.items.map(item => [item.inventory_id, item]));
  const diff = [];
  for (const change of checked.changes) {
    const item = byId.get(change.inventory_id);
    const before = {
      stock_on_hand: item.stock_on_hand,
      reserved: item.reserved,
      low_stock_threshold: item.low_stock_threshold,
      status: item.status,
      notes: item.notes
    };
    const after = {
      stock_on_hand: change.stock_on_hand,
      reserved: change.reserved,
      low_stock_threshold: change.low_stock_threshold,
      status: change.status,
      notes: change.notes
    };
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    Object.assign(item, after, { updated_at: now });
    diff.push({ inventory_id: item.inventory_id, before, after });
  }
  next.updated_at = now;
  const validation = validateInventory(next, catalog, { allowDemo: inventory.demo === true });
  if (!validation.valid) return { valid: false, errors: validation.errors, warnings: checked.warnings, changes: [], inventory: null, diff: [] };
  return { valid: true, errors: [], warnings: checked.warnings, changes: checked.changes, inventory: next, diff };
}
