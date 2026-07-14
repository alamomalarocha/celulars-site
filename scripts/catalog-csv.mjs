export const CPO_CSV_COLUMNS = ['catalog_hash', 'product_id', 'model', 'year', 'grade', 'capacity', 'current_usd', 'new_usd'];

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
