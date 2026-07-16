import {
  enrichInventory,
  inventoryContentHash,
  inventoryTrackingMode
} from './inventory-rules.mjs';

export const INVENTORY_COLOR_CSV_COLUMNS = [
  'inventory_hash', 'inventory_id', 'product_id', 'model', 'year', 'group',
  'capacity', 'color', 'stock_on_hand', 'reserved', 'available', 'status',
  'updated_at'
];
export const MAX_INVENTORY_COLOR_CSV_BYTES = 2 * 1024 * 1024;

const FORMULA_PREFIX = /^[\t\r ]*[=+\-@]/;

function protectSpreadsheetValue(value) {
  const text = String(value ?? '');
  return FORMULA_PREFIX.test(text) ? `'${text}` : text;
}

function csvCell(value) {
  const text = protectSpreadsheetValue(value);
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvDocument(columns, rows) {
  const lines = [columns.map(csvCell).join(';')];
  for (const row of rows) lines.push(columns.map(column => csvCell(row[column])).join(';'));
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

function integerValue(text, field) {
  const value = String(text ?? '').trim();
  if (FORMULA_PREFIX.test(value)) return { error: `Formulas e comandos nao sao permitidos em ${field}.` };
  if (!/^(?:0|[1-9]\d*)$/.test(value)) return { error: `${field} deve ser um inteiro maior ou igual a zero.` };
  const number = Number(value);
  if (!Number.isSafeInteger(number)) return { error: `${field} excede o limite numerico seguro.` };
  return { value: number };
}

function validationResult({
  rows = [],
  errors = [],
  changes = [],
  operations = [],
  unchanged = 0,
  conflicts = 0,
  spreadsheetHash = '',
  currentHash = '',
  warnings = []
}) {
  const invalidLines = new Set(errors.filter(error => Number.isInteger(error.line) && error.line > 0).map(error => error.line));
  return {
    valid: errors.length === 0,
    spreadsheetHash,
    currentHash,
    changes,
    operations,
    warnings,
    errors,
    summary: {
      rowsRead: rows.length,
      validRows: Math.max(0, rows.length - invalidLines.size),
      changedRows: changes.length,
      unchangedRows: unchanged,
      invalidRows: invalidLines.size || (errors.length ? rows.length : 0),
      conflicts,
      recordsChanged: operations.length
    }
  };
}

function colorKey(inventoryId, color) {
  return `${inventoryId}\u0000${color}`;
}

export function inventoryColorCsvRows(inventory, catalog, inventoryHash = inventoryContentHash(inventory)) {
  return enrichInventory(inventory, catalog).flatMap(row => {
    if (inventoryTrackingMode(row) !== 'by_color') return [];
    return row.color_variants.map(variant => ({
      inventory_hash: inventoryHash,
      inventory_id: row.inventory_id,
      product_id: row.product_id,
      model: row.model,
      year: String(row.year),
      group: row.group,
      capacity: row.capacity,
      color: variant.color,
      stock_on_hand: String(variant.stock_on_hand),
      reserved: String(variant.reserved),
      available: String(variant.available),
      status: row.status,
      updated_at: variant.updated_at
    }));
  });
}

export function exportInventoryColorCsv(inventory, catalog, inventoryHash = inventoryContentHash(inventory)) {
  const rows = inventoryColorCsvRows(inventory, catalog, inventoryHash);
  return { rows, csv: csvDocument(INVENTORY_COLOR_CSV_COLUMNS, rows) };
}

export function validateInventoryColorCsv(inventory, catalog, currentHash, source) {
  if (Buffer.byteLength(String(source ?? ''), 'utf8') > MAX_INVENTORY_COLOR_CSV_BYTES) {
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
  const headerValid = header.length === INVENTORY_COLOR_CSV_COLUMNS.length
    && INVENTORY_COLOR_CSV_COLUMNS.every((column, index) => header[index] === column);
  if (!headerValid) {
    return validationResult({
      errors: [{ line: parsed[0].line, message: `Cabecalho invalido. Use exatamente: ${INVENTORY_COLOR_CSV_COLUMNS.join(';')}` }],
      currentHash
    });
  }

  const rows = parsed.slice(1);
  const originals = inventoryColorCsvRows(inventory, catalog, currentHash);
  if (!originals.length) {
    return validationResult({
      rows,
      errors: [{ line: 0, message: 'Nao existem registros configurados para controle por cor.' }],
      currentHash
    });
  }
  if (!rows.length) {
    return validationResult({
      errors: [{ line: 0, message: 'A planilha nao contem variantes de cor.' }],
      currentHash
    });
  }

  const originalByKey = new Map(originals.map(row => [colorKey(row.inventory_id, row.color), row]));
  const originalRows = new Map(enrichInventory(inventory, catalog).map(row => [row.inventory_id, row]));
  const parsedByInventory = new Map();
  const seen = new Map();
  const errors = [];
  const changes = [];
  const warnings = [];
  let unchanged = 0;
  let conflicts = 0;
  let spreadsheetHash = '';

  for (const row of rows) {
    if (row.fields.length !== header.length) {
      errors.push({ line: row.line, message: `Quantidade de colunas invalida: esperadas ${header.length}.` });
      continue;
    }
    const record = Object.fromEntries(header.map((column, index) => [column, row.fields[index]]));
    const errorsBefore = errors.length;
    for (const column of INVENTORY_COLOR_CSV_COLUMNS) {
      if (FORMULA_PREFIX.test(record[column])) {
        errors.push({ line: row.line, inventory_id: record.inventory_id, message: `Formula ou comando bloqueado na coluna ${column}.` });
      }
    }

    const rowHash = record.inventory_hash.trim();
    if (!spreadsheetHash) spreadsheetHash = rowHash;
    if (!rowHash || rowHash !== currentHash) {
      errors.push({ line: row.line, inventory_id: record.inventory_id, message: `Planilha desatualizada. Hash da planilha: ${rowHash || 'vazio'}; hash atual: ${currentHash}.` });
      conflicts += 1;
    }

    const inventoryId = record.inventory_id.trim();
    const color = record.color;
    const key = colorKey(inventoryId, color);
    if (seen.has(key)) {
      errors.push({ line: row.line, inventory_id: inventoryId, message: `Variante duplicada; primeira ocorrencia na linha ${seen.get(key)}.` });
    } else {
      seen.set(key, row.line);
    }
    const original = originalByKey.get(key);
    if (!original) {
      errors.push({
        line: row.line,
        inventory_id: inventoryId,
        message: 'Variante inexistente ou cor alterada. Adicione e remova cores somente pela interface.'
      });
    } else {
      for (const field of [
        'product_id', 'model', 'year', 'group', 'capacity', 'color',
        'available', 'status', 'updated_at'
      ]) {
        if (record[field] !== original[field]) {
          errors.push({ line: row.line, inventory_id: inventoryId, message: `A coluna ${field} foi modificada.` });
        }
      }
    }
    if (errors.length !== errorsBefore || !original) continue;

    const stock = integerValue(record.stock_on_hand, 'stock_on_hand');
    const reserved = integerValue(record.reserved, 'reserved');
    for (const checked of [stock, reserved]) {
      if (checked.error) errors.push({ line: row.line, inventory_id: inventoryId, message: checked.error });
    }
    if (stock.error || reserved.error) continue;
    if (reserved.value > stock.value) {
      errors.push({ line: row.line, inventory_id: inventoryId, message: 'reserved nao pode superar stock_on_hand.' });
      continue;
    }

    const before = {
      stock_on_hand: Number(original.stock_on_hand),
      reserved: Number(original.reserved)
    };
    const after = { stock_on_hand: stock.value, reserved: reserved.value };
    const variant = { color, ...after };
    if (!parsedByInventory.has(inventoryId)) parsedByInventory.set(inventoryId, []);
    parsedByInventory.get(inventoryId).push(variant);
    if (JSON.stringify(before) === JSON.stringify(after)) unchanged += 1;
    else changes.push({ inventory_id: inventoryId, color, before, after });
  }

  for (const original of originals) {
    const key = colorKey(original.inventory_id, original.color);
    if (!seen.has(key)) {
      errors.push({
        line: 0,
        inventory_id: original.inventory_id,
        message: `A variante ${original.color} foi removida da planilha. Adicione e remova cores somente pela interface.`
      });
    }
  }

  const operations = [];
  if (!errors.length) {
    for (const [inventoryId, variants] of parsedByInventory) {
      if (!changes.some(change => change.inventory_id === inventoryId)) continue;
      operations.push({ action: 'update', inventory_id: inventoryId, color_variants: variants });
      const originalRow = originalRows.get(inventoryId);
      const totalStock = variants.reduce((total, variant) => total + variant.stock_on_hand, 0);
      if (originalRow?.group === 'cpo' && originalRow.price_usd === 0 && totalStock > 0) {
        warnings.push({
          type: 'stock_without_price',
          inventory_id: inventoryId,
          message: `${originalRow.model} ${originalRow.capacity}: este item possui estoque, mas ainda nao possui preco CPO publicado.`
        });
      }
    }
  }

  return validationResult({
    rows,
    errors,
    changes,
    operations,
    unchanged,
    conflicts,
    spreadsheetHash,
    currentHash,
    warnings
  });
}

export function inventoryColorCsvErrorReport(errors) {
  const columns = ['line', 'inventory_id', 'error'];
  const rows = (errors || []).map(error => ({
    line: error.line || '',
    inventory_id: error.inventory_id || '',
    error: error.message || 'Erro desconhecido.'
  }));
  return csvDocument(columns, rows);
}
