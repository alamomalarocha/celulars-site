import { enrichInventory, inventoryContentHash } from './inventory-rules.mjs';

export const INVENTORY_CSV_COLUMNS = [
  'inventory_hash', 'inventory_id', 'product_id', 'model', 'year', 'group', 'capacity',
  'price_usd', 'stock_on_hand', 'reserved', 'available', 'low_stock_threshold',
  'status', 'notes', 'updated_at'
];
export const AVAILABILITY_CSV_COLUMNS = [
  'model', 'year', 'group', 'capacity', 'price_usd', 'stock_on_hand', 'reserved',
  'available', 'status', 'price_status', 'updated_at'
];
export const MAX_INVENTORY_CSV_BYTES = 2 * 1024 * 1024;

const EDITABLE_COLUMNS = ['stock_on_hand', 'reserved', 'low_stock_threshold', 'status', 'notes'];
const FORMULA_PREFIX = /^[\t\r ]*[=+\-@]/;

function protectSpreadsheetValue(value) {
  const text = String(value ?? '');
  return FORMULA_PREFIX.test(text) ? `'${text}` : text;
}

function csvCell(value) {
  const text = protectSpreadsheetValue(value);
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvLine(values) {
  return values.map(csvCell).join(';');
}

function csvDocument(columns, rows) {
  const lines = [csvLine(columns)];
  for (const row of rows) lines.push(csvLine(columns.map(column => row[column])));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

function parseDelimitedCsv(source) {
  const text = String(source ?? '').replace(/^\uFEFF/, '');
  const rows = [];
  let fields = [];
  let field = '';
  let inQuotes = false;
  let afterQuote = false;
  let line = 1;
  let rowLine = 1;

  const finishField = () => {
    fields.push(field);
    field = '';
    afterQuote = false;
  };
  const finishRow = () => {
    finishField();
    if (!(fields.length === 1 && fields[0] === '')) rows.push({ line: rowLine, fields });
    fields = [];
    rowLine = line + 1;
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          afterQuote = true;
        }
      } else {
        field += character;
        if (character === '\n') line += 1;
      }
      continue;
    }

    if (afterQuote) {
      if (character === ';') finishField();
      else if (character === '\n') {
        finishRow();
        line += 1;
      } else if (character === '\r' && text[index + 1] === '\n') {
        finishRow();
        index += 1;
        line += 1;
      } else throw new Error(`CSV malformado na linha ${line}: caractere apos campo entre aspas.`);
      continue;
    }

    if (character === '"') {
      if (field !== '') throw new Error(`CSV malformado na linha ${line}: aspas em posicao invalida.`);
      inQuotes = true;
    } else if (character === ';') finishField();
    else if (character === '\n') {
      finishRow();
      line += 1;
    } else if (character === '\r' && text[index + 1] === '\n') {
      finishRow();
      index += 1;
      line += 1;
    } else if (character === '\r') throw new Error(`CSV malformado na linha ${line}: quebra de linha invalida.`);
    else field += character;
  }

  if (inQuotes) throw new Error(`CSV malformado na linha ${line}: campo entre aspas nao foi fechado.`);
  if (field !== '' || fields.length || afterQuote) finishRow();
  return rows;
}

function integerValue(text, current, field) {
  const value = String(text ?? '').trim();
  if (value === '') return { value: current, blank: true };
  if (FORMULA_PREFIX.test(value)) return { error: `Formulas e comandos nao sao permitidos em ${field}.` };
  if (!/^(?:0|[1-9]\d*)$/.test(value)) return { error: `${field} deve ser um inteiro maior ou igual a zero.` };
  const number = Number(value);
  if (!Number.isSafeInteger(number)) return { error: `${field} excede o limite numerico seguro.` };
  return { value: number, blank: false };
}

function textValue(text, current, field, allowed = null) {
  const value = String(text ?? '');
  if (value === '') return { value: current, blank: true };
  if (FORMULA_PREFIX.test(value)) return { error: `Formulas e comandos nao sao permitidos em ${field}.` };
  if (allowed && !allowed.includes(value)) return { error: `${field} invalido.` };
  if (field === 'notes' && value.length > 500) return { error: 'notes deve ter no maximo 500 caracteres.' };
  return { value, blank: false };
}

function validationResult({ rows = [], errors = [], changes = [], blanks = 0, unchanged = 0, conflicts = 0, spreadsheetHash = '', currentHash = '', warnings = [] }) {
  const invalidLines = new Set(errors.filter(error => Number.isInteger(error.line) && error.line > 0).map(error => error.line));
  return {
    valid: errors.length === 0,
    spreadsheetHash,
    currentHash,
    changes,
    warnings,
    errors,
    summary: {
      rowsRead: rows.length,
      validRows: Math.max(0, rows.length - invalidLines.size),
      changedRows: changes.length,
      unchangedRows: unchanged,
      blankRows: blanks,
      invalidRows: invalidLines.size || (errors.length ? rows.length : 0),
      conflicts
    }
  };
}

export function inventoryCsvRows(inventory, catalog, inventoryHash = inventoryContentHash(inventory)) {
  return enrichInventory(inventory, catalog).map(row => ({
    inventory_hash: inventoryHash,
    inventory_id: row.inventory_id,
    product_id: row.product_id,
    model: row.model,
    year: String(row.year),
    group: row.group,
    capacity: row.capacity,
    price_usd: Number(row.price_usd).toFixed(2),
    stock_on_hand: String(row.stock_on_hand),
    reserved: String(row.reserved),
    available: String(row.available),
    low_stock_threshold: String(row.low_stock_threshold),
    status: row.status,
    notes: row.notes,
    updated_at: row.updated_at
  }));
}

export function exportInventoryCsv(inventory, catalog, inventoryHash = inventoryContentHash(inventory)) {
  const rows = inventoryCsvRows(inventory, catalog, inventoryHash);
  return { rows, csv: csvDocument(INVENTORY_CSV_COLUMNS, rows) };
}

export function exportAvailabilityCsv(inventory, catalog) {
  const rows = enrichInventory(inventory, catalog).map(row => ({
    model: row.model,
    year: String(row.year),
    group: row.group,
    capacity: row.capacity,
    price_usd: Number(row.price_usd).toFixed(2),
    stock_on_hand: String(row.stock_on_hand),
    reserved: String(row.reserved),
    available: String(row.available),
    status: row.status,
    price_status: row.price_usd > 0 ? 'preco_preenchido' : 'preco_zerado',
    updated_at: row.updated_at
  }));
  return { rows, csv: csvDocument(AVAILABILITY_CSV_COLUMNS, rows) };
}

export function validateInventoryCsv(inventory, catalog, currentHash, source) {
  if (Buffer.byteLength(String(source ?? ''), 'utf8') > MAX_INVENTORY_CSV_BYTES) {
    return validationResult({ errors: [{ line: 0, message: 'Arquivo excede o limite de 2 MB.' }], currentHash });
  }

  let parsed;
  try {
    parsed = parseDelimitedCsv(source);
  } catch (error) {
    return validationResult({ errors: [{ line: 0, message: error.message }], currentHash });
  }
  if (!parsed.length) return validationResult({ errors: [{ line: 0, message: 'Arquivo CSV vazio.' }], currentHash });

  const header = parsed[0].fields.map(value => value.trim());
  const headerValid = header.length === INVENTORY_CSV_COLUMNS.length && INVENTORY_CSV_COLUMNS.every((column, index) => header[index] === column);
  if (!headerValid) {
    return validationResult({
      errors: [{ line: parsed[0].line, message: `Cabecalho invalido. Use exatamente: ${INVENTORY_CSV_COLUMNS.join(';')}` }],
      currentHash
    });
  }

  const rows = parsed.slice(1);
  if (!rows.length) return validationResult({ errors: [{ line: 0, message: 'A planilha nao contem linhas de estoque.' }], currentHash });
  const originals = new Map(enrichInventory(inventory, catalog).map(row => [row.inventory_id, row]));
  const errors = [];
  const changes = [];
  const warnings = [];
  const seen = new Map();
  let blanks = 0;
  let unchanged = 0;
  let conflicts = 0;
  let spreadsheetHash = '';

  for (const row of rows) {
    if (row.fields.length !== header.length) {
      errors.push({ line: row.line, message: `Quantidade de colunas invalida: esperadas ${header.length}.` });
      continue;
    }
    const record = Object.fromEntries(header.map((column, index) => [column, row.fields[index]]));
    const errorCountBefore = errors.length;
    for (const column of INVENTORY_CSV_COLUMNS) {
      if (FORMULA_PREFIX.test(record[column])) errors.push({ line: row.line, inventory_id: record.inventory_id, message: `Formula ou comando bloqueado na coluna ${column}.` });
    }
    const rowHash = record.inventory_hash.trim();
    if (!spreadsheetHash) spreadsheetHash = rowHash;
    if (!rowHash || rowHash !== currentHash) {
      errors.push({ line: row.line, inventory_id: record.inventory_id, message: `Planilha desatualizada. Hash da planilha: ${rowHash || 'vazio'}; hash atual: ${currentHash}.` });
      conflicts += 1;
    }

    const inventoryId = record.inventory_id.trim();
    if (seen.has(inventoryId)) errors.push({ line: row.line, inventory_id: inventoryId, message: `inventory_id duplicado; primeira ocorrencia na linha ${seen.get(inventoryId)}.` });
    else seen.set(inventoryId, row.line);
    const original = originals.get(inventoryId);
    if (!original) errors.push({ line: row.line, inventory_id: inventoryId, message: 'Combinacao de produto e capacidade inexistente.' });
    else {
      const immutable = {
        product_id: original.product_id,
        model: original.model,
        year: String(original.year),
        group: original.group,
        capacity: original.capacity,
        price_usd: Number(original.price_usd).toFixed(2),
        available: String(original.available),
        updated_at: original.updated_at
      };
      for (const [field, expected] of Object.entries(immutable)) {
        if (record[field] !== expected) errors.push({ line: row.line, inventory_id: inventoryId, message: `A coluna ${field} foi modificada.` });
      }
    }
    if (errors.length !== errorCountBefore || !original) continue;

    const stock = integerValue(record.stock_on_hand, original.stock_on_hand, 'stock_on_hand');
    const reserved = integerValue(record.reserved, original.reserved, 'reserved');
    const threshold = integerValue(record.low_stock_threshold, original.low_stock_threshold, 'low_stock_threshold');
    const status = textValue(record.status, original.status, 'status', ['active', 'paused', 'archived']);
    const notes = textValue(record.notes, original.notes, 'notes');
    for (const checked of [stock, reserved, threshold, status, notes]) {
      if (checked.error) errors.push({ line: row.line, inventory_id: inventoryId, message: checked.error });
    }
    if ([stock, reserved, threshold, status, notes].some(checked => checked.error)) continue;
    if (reserved.value > stock.value) {
      errors.push({ line: row.line, inventory_id: inventoryId, message: 'reserved nao pode superar stock_on_hand.' });
      continue;
    }
    const after = {
      stock_on_hand: stock.value,
      reserved: reserved.value,
      low_stock_threshold: threshold.value,
      status: status.value,
      notes: notes.value
    };
    const before = Object.fromEntries(EDITABLE_COLUMNS.map(field => [field, original[field]]));
    if ([stock, reserved, threshold, status, notes].every(checked => checked.blank)) blanks += 1;
    if (JSON.stringify(before) === JSON.stringify(after)) unchanged += 1;
    else {
      changes.push({ inventory_id: inventoryId, before, after });
      if (original.group === 'cpo' && after.stock_on_hand > 0 && original.price_usd === 0) {
        warnings.push({ type: 'stock_without_price', inventory_id: inventoryId, message: `${original.model} ${original.capacity}: estoque CPO com preco zerado.` });
      }
    }
  }

  return validationResult({ rows, errors, changes, blanks, unchanged, conflicts, spreadsheetHash, currentHash, warnings });
}

export function inventoryCsvErrorReport(errors) {
  const columns = ['line', 'inventory_id', 'error'];
  const rows = (errors || []).map(error => ({ line: error.line || '', inventory_id: error.inventory_id || '', error: error.message || 'Erro desconhecido.' }));
  return csvDocument(columns, rows);
}
