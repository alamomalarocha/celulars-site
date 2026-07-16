import {
  catalogInventoryRows,
  createInitialInventory,
  inventoryColorVariants,
  inventoryTrackingMode,
  validateInventory,
  validInventoryIso
} from './inventory-rules.mjs';

export const INVENTORY_COLOR_ACTIONS = Object.freeze(['enable', 'update', 'add', 'remove', 'consolidate']);

const ACTION_KEYS = Object.freeze({
  enable: new Set(['action', 'inventory_id', 'color_variants']),
  update: new Set(['action', 'inventory_id', 'color_variants']),
  add: new Set(['action', 'inventory_id', 'color']),
  remove: new Set(['action', 'inventory_id', 'color']),
  consolidate: new Set(['action', 'inventory_id'])
});
const VARIANT_INPUT_KEYS = new Set(['color', 'stock_on_hand', 'reserved']);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function unknownKeys(record, allowed, label, errors) {
  for (const key of Object.keys(record || {})) {
    if (!allowed.has(key)) errors.push(`${label}: campo desconhecido (${key}).`);
  }
}

function snapshot(item) {
  return {
    tracking_mode: inventoryTrackingMode(item),
    stock_on_hand: item.stock_on_hand,
    reserved: item.reserved,
    available: item.stock_on_hand - item.reserved,
    color_variants: inventoryColorVariants(item).map(variant => ({
      color: variant.color,
      stock_on_hand: variant.stock_on_hand,
      reserved: variant.reserved,
      available: variant.stock_on_hand - variant.reserved
    }))
  };
}

function normalizeVariants(input, catalogRow, label, errors, now) {
  if (!Array.isArray(input) || input.length === 0) {
    errors.push(`${label}: selecione pelo menos uma cor.`);
    return [];
  }
  const colors = new Set();
  const variants = [];
  for (const [index, variant] of input.entries()) {
    const variantLabel = `${label}, cor ${index + 1}`;
    if (!isRecord(variant)) {
      errors.push(`${variantLabel}: registro invalido.`);
      continue;
    }
    unknownKeys(variant, VARIANT_INPUT_KEYS, variantLabel, errors);
    if (typeof variant.color !== 'string' || !catalogRow.colors.includes(variant.color)) {
      errors.push(`${variantLabel}: use uma cor oficial do catalogo.`);
    } else if (colors.has(variant.color)) {
      errors.push(`${variantLabel}: cor duplicada (${variant.color}).`);
    } else {
      colors.add(variant.color);
    }
    for (const field of ['stock_on_hand', 'reserved']) {
      if (!Number.isInteger(variant[field]) || variant[field] < 0) errors.push(`${variantLabel}: ${field} deve ser inteiro maior ou igual a zero.`);
    }
    if (Number.isInteger(variant.stock_on_hand) && Number.isInteger(variant.reserved) && variant.reserved > variant.stock_on_hand) {
      errors.push(`${variantLabel}: reserved nao pode superar stock_on_hand.`);
    }
    variants.push({
      color: variant.color,
      stock_on_hand: variant.stock_on_hand,
      reserved: variant.reserved,
      updated_at: now
    });
  }
  return variants;
}

function stockWithoutPriceWarning(item, row) {
  if (row.group !== 'cpo' || row.price_usd !== 0 || item.stock_on_hand === 0) return null;
  return {
    type: 'stock_without_price',
    inventory_id: item.inventory_id,
    message: `${row.model} ${row.capacity}: este item possui estoque, mas ainda nao possui preco CPO publicado.`
  };
}

export function applyInventoryColorOperations(
  inventory,
  catalog,
  operations,
  { confirmStockWithoutPrice = false, now = new Date().toISOString() } = {}
) {
  const errors = [];
  const warnings = [];
  if (!validInventoryIso(now)) errors.push('Data da operacao por cor invalida.');
  if (!Array.isArray(operations) || operations.length === 0) errors.push('Nenhuma operacao de estoque por cor foi enviada.');
  if (Array.isArray(operations) && operations.length > 500) errors.push('Quantidade de operacoes por cor excede o limite permitido.');
  if (errors.length) return { valid: false, errors, warnings, inventory: null, diff: [] };

  const next = structuredClone(inventory);
  const items = new Map(next.items.map(item => [item.inventory_id, item]));
  const catalogRows = new Map(catalogInventoryRows(catalog).map(row => [row.inventory_id, row]));
  const touched = new Set();
  const diff = [];

  for (const [index, operation] of operations.entries()) {
    const label = `operacao ${index + 1}`;
    if (!isRecord(operation)) {
      errors.push(`${label}: registro invalido.`);
      continue;
    }
    if (!INVENTORY_COLOR_ACTIONS.includes(operation.action)) {
      errors.push(`${label}: acao invalida.`);
      continue;
    }
    unknownKeys(operation, ACTION_KEYS[operation.action], label, errors);
    if (typeof operation.inventory_id !== 'string' || !operation.inventory_id) {
      errors.push(`${label}: inventory_id invalido.`);
      continue;
    }
    if (touched.has(operation.inventory_id)) {
      errors.push(`${label}: somente uma operacao por registro e permitida em cada revisao.`);
      continue;
    }
    touched.add(operation.inventory_id);
    const item = items.get(operation.inventory_id);
    const catalogRow = catalogRows.get(operation.inventory_id);
    if (!item || !catalogRow) {
      errors.push(`${label}: inventory_id inexistente.`);
      continue;
    }
    const before = snapshot(item);
    const mode = inventoryTrackingMode(item);

    if (operation.action === 'enable') {
      if (mode !== 'aggregate') {
        errors.push(`${label}: somente um registro agregado pode ser detalhado por cor.`);
        continue;
      }
      const variants = normalizeVariants(operation.color_variants, catalogRow, label, errors, now);
      const stockTotal = variants.reduce((total, variant) => total + (Number.isInteger(variant.stock_on_hand) ? variant.stock_on_hand : 0), 0);
      const reservedTotal = variants.reduce((total, variant) => total + (Number.isInteger(variant.reserved) ? variant.reserved : 0), 0);
      if (stockTotal !== item.stock_on_hand) errors.push(`${label}: a soma do estoque por cor deve ser exatamente ${item.stock_on_hand}.`);
      if (reservedTotal !== item.reserved) errors.push(`${label}: a soma do reservado por cor deve ser exatamente ${item.reserved}.`);
      item.tracking_mode = 'by_color';
      item.color_variants = variants;
    }

    if (operation.action === 'update') {
      if (mode !== 'by_color') {
        errors.push(`${label}: somente um registro por cor pode ter variantes editadas.`);
        continue;
      }
      const variants = normalizeVariants(operation.color_variants, catalogRow, label, errors, now);
      item.color_variants = variants;
      item.stock_on_hand = variants.reduce((total, variant) => total + (Number.isInteger(variant.stock_on_hand) ? variant.stock_on_hand : 0), 0);
      item.reserved = variants.reduce((total, variant) => total + (Number.isInteger(variant.reserved) ? variant.reserved : 0), 0);
    }

    if (operation.action === 'add') {
      if (mode !== 'by_color') {
        errors.push(`${label}: somente um registro por cor pode receber uma nova cor.`);
        continue;
      }
      if (typeof operation.color !== 'string' || !catalogRow.colors.includes(operation.color)) {
        errors.push(`${label}: use uma cor oficial do catalogo.`);
        continue;
      }
      if (inventoryColorVariants(item).some(variant => variant.color === operation.color)) {
        errors.push(`${label}: a cor ${operation.color} ja esta detalhada.`);
        continue;
      }
      item.color_variants.push({ color: operation.color, stock_on_hand: 0, reserved: 0, updated_at: now });
    }

    if (operation.action === 'remove') {
      if (mode !== 'by_color') {
        errors.push(`${label}: somente um registro por cor pode remover uma variante.`);
        continue;
      }
      const variant = inventoryColorVariants(item).find(candidate => candidate.color === operation.color);
      if (!variant) {
        errors.push(`${label}: variante de cor inexistente.`);
        continue;
      }
      if (variant.stock_on_hand !== 0 || variant.reserved !== 0) {
        errors.push(`${label}: somente uma cor com estoque e reservado zerados pode ser removida.`);
        continue;
      }
      if (item.color_variants.length === 1) {
        errors.push(`${label}: a ultima cor nao pode ser removida; use Consolidar estoque.`);
        continue;
      }
      item.color_variants = item.color_variants.filter(candidate => candidate.color !== operation.color);
    }

    if (operation.action === 'consolidate') {
      if (mode !== 'by_color') {
        errors.push(`${label}: somente um registro por cor pode ser consolidado.`);
        continue;
      }
      item.tracking_mode = 'aggregate';
      delete item.color_variants;
    }

    item.updated_at = now;
    const after = snapshot(item);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      diff.push({ inventory_id: item.inventory_id, action: operation.action, before, after });
    }
    const warning = stockWithoutPriceWarning(item, catalogRow);
    if (warning) warnings.push(warning);
  }

  if (warnings.length && !confirmStockWithoutPrice) errors.push('Ha item com estoque sem preco CPO publicado; confirme explicitamente para continuar.');
  const validation = validateInventory(next, catalog, { allowDemo: inventory.demo === true });
  if (!validation.valid) errors.push(...validation.errors);
  if (errors.length) return { valid: false, errors: [...new Set(errors)], warnings, inventory: null, diff: [] };
  return { valid: true, errors: [], warnings, inventory: next, diff };
}

export function createDemoColorInventory(catalog, { now = new Date().toISOString() } = {}) {
  const inventory = createInitialInventory(catalog, { demo: true, now });
  const rows = catalogInventoryRows(catalog);
  const selected = [
    rows.find(row => row.group === 'new' && row.colors.length >= 2),
    ...rows.filter(row => row.group === 'cpo' && row.colors.length >= 2).slice(0, 2)
  ].filter(Boolean);
  const operations = selected.map((row, index) => {
    const item = inventory.items.find(candidate => candidate.inventory_id === row.inventory_id);
    const selectedColors = row.colors.slice(0, index === 2 ? 3 : 2);
    return {
      action: 'enable',
      inventory_id: row.inventory_id,
      color_variants: selectedColors.map((color, colorIndex) => ({
        color,
        stock_on_hand: colorIndex === 0 ? item.stock_on_hand : 0,
        reserved: colorIndex === 0 ? item.reserved : 0
      }))
    };
  });
  const result = applyInventoryColorOperations(inventory, catalog, operations, {
    confirmStockWithoutPrice: true,
    now
  });
  if (!result.valid) throw new Error(`Falha ao criar demonstracao por cor: ${result.errors.join(' | ')}`);
  return result.inventory;
}
