export const CPO_CSV_COLUMNS = ['catalog_hash', 'product_id', 'model', 'year', 'grade', 'capacity', 'current_usd', 'new_usd'];
export const MAX_CPO_CSV_BYTES = 2 * 1024 * 1024;
const HIGH_PRICE_USD = 10000;

function protectSpreadsheetValue(value) {
  const text = String(value ?? '');
  return /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
}

function csvCell(value) {
  const text = protectSpreadsheetValue(value);
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvLine(values) {
  return values.map(csvCell).join(';');
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
      } else {
        throw new Error(`CSV malformado na linha ${line}: caractere após campo entre aspas.`);
      }
      continue;
    }

    if (character === '"') {
      if (field !== '') throw new Error(`CSV malformado na linha ${line}: aspas em posição inválida.`);
      inQuotes = true;
    } else if (character === ';') finishField();
    else if (character === '\n') {
      finishRow();
      line += 1;
    } else if (character === '\r' && text[index + 1] === '\n') {
      finishRow();
      index += 1;
      line += 1;
    } else if (character === '\r') {
      throw new Error(`CSV malformado na linha ${line}: quebra de linha inválida.`);
    } else field += character;
  }

  if (inQuotes) throw new Error(`CSV malformado na linha ${line}: campo entre aspas não foi fechado.`);
  if (field !== '' || fields.length || afterQuote) finishRow();
  return rows;
}

function priceValue(text, { allowBlank = false } = {}) {
  const value = String(text ?? '').trim();
  if (allowBlank && value === '') return { blank: true };
  if (/^[=+\-@]/.test(value)) return { error: 'Fórmulas e comandos não são permitidos em new_usd.' };
  if (!/^(?:0|[1-9]\d*)(?:[.,]\d{1,2})?$/.test(value)) {
    return { error: 'Use somente número sem símbolo, maior ou igual a zero e com até duas casas decimais.' };
  }
  const number = Number(value.replace(',', '.'));
  if (!Number.isFinite(number)) return { error: 'Valor monetário inválido.' };
  return { value: number };
}

function validationResult({ rows = [], errors = [], changes = [], blanks = 0, unchanged = 0, conflicts = 0, spreadsheetHash = '', currentHash = '', catalog }) {
  const invalidLines = new Set(errors.filter(error => Number.isInteger(error.line)).map(error => error.line));
  const prices = new Map();
  for (const product of (catalog?.products || []).filter(item => item.group === 'cpo')) {
    for (const [capacity, entry] of Object.entries(product.capacities || {})) prices.set(`${product.id}::${capacity}`, entry.usd);
  }
  for (const change of changes) prices.set(`${change.id}::${change.capacity}`, change.after);
  const values = [...prices.values()];
  const highValues = changes.filter(change => change.after > HIGH_PRICE_USD);
  const valid = errors.length === 0;
  return {
    valid,
    spreadsheetHash,
    currentHash,
    changes,
    highValues,
    errors,
    summary: {
      rowsRead: rows.length,
      validRows: Math.max(0, rows.length - invalidLines.size),
      changedRows: changes.length,
      unchangedRows: unchanged,
      blankRows: blanks,
      invalidRows: invalidLines.size || (valid ? 0 : rows.length),
      conflicts,
      zeroPricesAfter: values.filter(value => value === 0).length,
      positivePricesAfter: values.filter(value => value > 0).length
    }
  };
}

export function validateCpoCsv(catalog, currentHash, source) {
  if (Buffer.byteLength(String(source ?? ''), 'utf8') > MAX_CPO_CSV_BYTES) {
    return validationResult({ errors: [{ line: 0, message: 'Arquivo excede o limite de 2 MB.' }], currentHash, catalog });
  }

  let parsed;
  try {
    parsed = parseDelimitedCsv(source);
  } catch (error) {
    return validationResult({ errors: [{ line: 0, message: error.message }], currentHash, catalog });
  }
  if (!parsed.length) return validationResult({ errors: [{ line: 0, message: 'Arquivo CSV vazio.' }], currentHash, catalog });

  const header = parsed[0].fields.map(value => value.trim());
  const expectedHeaders = [CPO_CSV_COLUMNS, [...CPO_CSV_COLUMNS, 'status']];
  const headerValid = expectedHeaders.some(expected => expected.length === header.length && expected.every((column, index) => header[index] === column));
  if (!headerValid) {
    return validationResult({
      errors: [{ line: parsed[0].line, message: `Cabeçalho inválido. Use exatamente: ${CPO_CSV_COLUMNS.join(';')}` }],
      currentHash,
      catalog
    });
  }

  const rows = parsed.slice(1);
  if (!rows.length) return validationResult({ errors: [{ line: 0, message: 'A planilha não contém linhas de preços.' }], currentHash, catalog });
  const products = new Map((catalog.products || []).filter(product => product.group === 'cpo').map(product => [product.id, product]));
  const errors = [];
  const changes = [];
  const seen = new Map();
  let blanks = 0;
  let unchanged = 0;
  let conflicts = 0;
  let spreadsheetHash = '';

  for (const row of rows) {
    if (row.fields.length !== header.length) {
      errors.push({ line: row.line, message: `Quantidade de colunas inválida: esperadas ${header.length}.` });
      continue;
    }
    const record = Object.fromEntries(header.map((column, index) => [column, row.fields[index]]));
    const rowErrorsBefore = errors.length;
    const rowHash = record.catalog_hash.trim();
    if (!spreadsheetHash) spreadsheetHash = rowHash;
    if (rowHash !== currentHash) {
      errors.push({ line: row.line, product_id: record.product_id, capacity: record.capacity, message: `Planilha desatualizada. Hash da planilha: ${rowHash || 'vazio'}; hash atual: ${currentHash}. Exporte uma nova planilha.` });
      conflicts += 1;
    }

    const productId = record.product_id.trim();
    const capacity = record.capacity.trim();
    const duplicateKey = `${productId}::${capacity}`;
    if (seen.has(duplicateKey)) errors.push({ line: row.line, product_id: productId, capacity, message: `Linha duplicada; primeira ocorrência na linha ${seen.get(duplicateKey)}.` });
    else seen.set(duplicateKey, row.line);

    const product = products.get(productId);
    if (!product) {
      errors.push({ line: row.line, product_id: productId, capacity, message: 'Produto CPO não encontrado.' });
    } else {
      if (record.model !== product.model) errors.push({ line: row.line, product_id: productId, capacity, message: 'A coluna model foi modificada ou não corresponde ao product_id.' });
      if (record.year.trim() !== String(product.year)) errors.push({ line: row.line, product_id: productId, capacity, message: 'A coluna year foi modificada.' });
      if (record.grade !== product.classification) errors.push({ line: row.line, product_id: productId, capacity, message: 'A coluna grade foi modificada.' });
      if (!Object.hasOwn(product.capacities || {}, capacity)) {
        errors.push({ line: row.line, product_id: productId, capacity, message: `Capacidade ${capacity || 'vazia'} não pertence a ${product.model}.` });
      } else {
        const current = priceValue(record.current_usd);
        if (current.error || current.value !== product.capacities[capacity].usd) {
          errors.push({ line: row.line, product_id: productId, capacity, message: 'current_usd diverge do preço atual do catálogo.' });
          conflicts += 1;
        }
      }
    }

    const next = priceValue(record.new_usd, { allowBlank: true });
    if (next.error) errors.push({ line: row.line, product_id: productId, capacity, message: next.error });
    if (errors.length !== rowErrorsBefore) continue;
    if (next.blank) {
      blanks += 1;
      continue;
    }
    const before = product.capacities[capacity].usd;
    if (next.value === before) unchanged += 1;
    else changes.push({ line: row.line, id: product.id, model: product.model, capacity, before, after: next.value });
  }

  return validationResult({ rows, errors, changes, blanks, unchanged, conflicts, spreadsheetHash, currentHash, catalog });
}

export function cpoCsvErrorReport(errors) {
  const columns = ['line', 'product_id', 'capacity', 'error'];
  const lines = [csvLine(columns)];
  for (const error of errors || []) lines.push(csvLine([error.line || '', error.product_id || '', error.capacity || '', error.message || 'Erro desconhecido.']));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function cpoCsvRows(catalog, catalogHash, { mode = 'template' } = {}) {
  if (!['template', 'zero', 'complete'].includes(mode)) throw new Error('Modo de exportação CSV inválido.');
  const rows = [];
  const products = (catalog.products || [])
    .filter(product => product.group === 'cpo')
    .sort((left, right) => left.order - right.order);

  for (const product of products) {
    for (const [capacity, entry] of Object.entries(product.capacities || {})) {
      if (mode === 'zero' && entry.usd !== 0) continue;
      const currentUsd = Number(entry.usd).toFixed(2);
      rows.push({
        catalog_hash: catalogHash,
        product_id: product.id,
        model: product.model,
        year: String(product.year),
        grade: product.classification,
        capacity,
        current_usd: currentUsd,
        new_usd: mode === 'complete' ? currentUsd : ''
      });
    }
  }
  return rows;
}

export function exportCpoCsv(catalog, catalogHash, options = {}) {
  const rows = cpoCsvRows(catalog, catalogHash, options);
  const lines = [csvLine(CPO_CSV_COLUMNS)];
  for (const row of rows) lines.push(csvLine(CPO_CSV_COLUMNS.map(column => row[column])));
  return { rows, csv: `\uFEFF${lines.join('\r\n')}\r\n` };
}
