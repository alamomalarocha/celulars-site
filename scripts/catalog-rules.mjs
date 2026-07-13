import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

export const EXPECTED_NEW_ORDER = ['iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone Air', 'iPhone 17', 'iPhone 17e'];
export const EXPECTED_CPO_ORDER = ['iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone Air', 'iPhone 17', 'iPhone 17e', 'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16', 'iPhone 16e', 'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15', 'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14', 'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 mini', 'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 mini'];
export const LEGACY_DECLARED_STRUCTURE_HASH = 'f24be6d04e1100ad639a557c539c35cdde364f53a04f917d32fa06705009b664';
export const EXPECTED_STRUCTURE_HASH = '100473fcaaa79b65751c93e2fb49226307b702beca741de929c53005cc0bba6f';

const TOP_LEVEL_KEYS = new Set(['version', 'currency', 'floridaTaxRate', 'zeroMeaning', 'sourceStructureSha256', 'products']);
const PRODUCT_KEYS = new Set(['id', 'model', 'year', 'line', 'family', 'group', 'condition', 'classification', 'colors', 'capacities', 'availability', 'order']);
const CAPACITY_KEYS = new Set(['usd']);
const FORBIDDEN_KEY = /(?:wholesale|supplier|vendor|margin|cost|customer|client|password|secret|token)/i;

export function structuralProduct(product) {
  return {
    id: product.id,
    model: product.model,
    year: product.year,
    line: product.line,
    family: product.family,
    group: product.group,
    condition: product.condition,
    classification: product.classification,
    colors: product.colors,
    capacities: Object.keys(product.capacities || {}),
    availability: product.availability,
    order: product.order
  };
}

export function structureHash(products) {
  return createHash('sha256').update(JSON.stringify(products.map(structuralProduct))).digest('hex');
}

export function contentHash(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(text).digest('hex');
}

export function catalogModuleSource(catalog) {
  return `window.CELULARS_CATALOG=${JSON.stringify(catalog)};\n`;
}

function unknownKeys(record, allowed, label, errors) {
  for (const key of Object.keys(record || {})) {
    if (FORBIDDEN_KEY.test(key)) errors.push(`${label}: campo interno proibido (${key}).`);
    else if (!allowed.has(key)) errors.push(`${label}: campo desconhecido (${key}).`);
  }
}

export function catalogStats(catalog) {
  const products = Array.isArray(catalog?.products) ? catalog.products : [];
  const newProducts = products.filter(product => product.group === 'new');
  const cpoProducts = products.filter(product => product.group === 'cpo');
  const cpoCapacitySet = new Set();
  let zeroCount = 0;

  for (const product of cpoProducts) {
    for (const [capacity, entry] of Object.entries(product.capacities || {})) {
      cpoCapacitySet.add(capacity);
      if (entry?.usd === 0) zeroCount += 1;
    }
  }

  const registeredCpoCapacities = cpoProducts.reduce((total, product) => total + Object.keys(product.capacities || {}).length, 0);
  const missingCount = cpoProducts.length * cpoCapacitySet.size - registeredCpoCapacities;
  return {
    products: products.length,
    newModels: newProducts.length,
    cpoModels: cpoProducts.length,
    cpoZeroPrices: zeroCount,
    cpoRegisteredCapacities: registeredCpoCapacities,
    cpoMissingCombinations: missingCount,
    cpoCapacityNames: [...cpoCapacitySet]
  };
}

export function validateCatalog(catalog, { strict = true } = {}) {
  const errors = [];
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
    return { valid: false, errors: ['Catalogo deve ser um objeto JSON.'], stats: catalogStats(null) };
  }

  unknownKeys(catalog, TOP_LEVEL_KEYS, 'catalogo', errors);
  const products = Array.isArray(catalog.products) ? catalog.products : [];
  if (!Array.isArray(catalog.products)) errors.push('catalogo: products deve ser uma lista.');

  const newProducts = products.filter(product => product.group === 'new').sort((a, b) => a.order - b.order);
  const cpoProducts = products.filter(product => product.group === 'cpo').sort((a, b) => a.order - b.order);
  const ids = products.map(product => product.id);
  const groupModels = products.map(product => `${product.group}:${product.model}`);

  if (new Set(ids).size !== ids.length) errors.push('IDs duplicados no catalogo.');
  if (new Set(groupModels).size !== groupModels.length) errors.push('Modelo duplicado dentro do mesmo grupo.');

  for (const product of products) {
    if (!product || typeof product !== 'object' || Array.isArray(product)) {
      errors.push('Produto invalido.');
      continue;
    }
    const label = product.id || product.model || 'produto';
    unknownKeys(product, PRODUCT_KEYS, label, errors);
    if (typeof product.id !== 'string' || product.id.length <= 3) errors.push(`${label}: ID invalido.`);
    if (typeof product.model !== 'string' || !product.model.trim()) errors.push(`${label}: modelo vazio.`);
    if (!Number.isInteger(product.year) || product.year < 2007 || product.year > 2100) errors.push(`${label}: ano invalido.`);
    if (!['new', 'cpo'].includes(product.group)) errors.push(`${label}: grupo invalido.`);
    if (!Array.isArray(product.colors) || !product.colors.length || !product.colors.every(color => typeof color === 'string' && color.trim())) errors.push(`${label}: cores invalidas.`);
    if (!product.capacities || typeof product.capacities !== 'object' || Array.isArray(product.capacities)) {
      errors.push(`${label}: capacidades invalidas.`);
      continue;
    }
    for (const [capacity, entry] of Object.entries(product.capacities)) {
      if (!/^\d+\s+(?:GB|TB)$/i.test(capacity)) errors.push(`${label}: capacidade invalida (${capacity}).`);
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        errors.push(`${label} ${capacity}: registro invalido.`);
        continue;
      }
      unknownKeys(entry, CAPACITY_KEYS, `${label} ${capacity}`, errors);
      const usd = entry.usd;
      if (typeof usd !== 'number' || !Number.isFinite(usd) || usd < 0) errors.push(`${label} ${capacity}: preco invalido.`);
      if (Number.isFinite(usd) && Math.round(usd * 100) !== usd * 100) errors.push(`${label} ${capacity}: use no maximo duas casas decimais.`);
      if (product.group === 'new' && !(usd > 0)) errors.push(`${label} ${capacity}: modelo novo sem preco real.`);
    }
  }

  const stats = catalogStats(catalog);
  const computedStructureHash = structureHash(products);
  if (strict) {
    if (stats.newModels !== 5) errors.push(`Esperados 5 modelos novos; encontrados ${stats.newModels}.`);
    if (stats.cpoModels !== 26) errors.push(`Esperados 26 modelos CPO; encontrados ${stats.cpoModels}.`);
    if (stats.cpoRegisteredCapacities !== 83) errors.push(`Esperadas 83 capacidades CPO cadastradas; encontradas ${stats.cpoRegisteredCapacities}.`);
    if (stats.cpoMissingCombinations !== 73) errors.push(`Esperadas 73 combinacoes CPO ausentes; encontradas ${stats.cpoMissingCombinations}.`);
    if (JSON.stringify(newProducts.map(product => product.model)) !== JSON.stringify(EXPECTED_NEW_ORDER)) errors.push('Ordem dos modelos novos foi alterada.');
    if (JSON.stringify(cpoProducts.map(product => product.model)) !== JSON.stringify(EXPECTED_CPO_ORDER)) errors.push('Ordem dos modelos CPO foi alterada.');
    if (catalog.sourceStructureSha256 !== LEGACY_DECLARED_STRUCTURE_HASH) errors.push('Hash estrutural legado declarado foi alterado.');
    if (computedStructureHash !== EXPECTED_STRUCTURE_HASH) errors.push(`Hash estrutural divergente: ${computedStructureHash}.`);
  }

  return { valid: errors.length === 0, errors, stats, structureHash: computedStructureHash, contentHash: contentHash(catalog) };
}

export function diffCpoPrices(before, after) {
  const beforeById = new Map((before.products || []).map(product => [product.id, product]));
  const changes = [];
  for (const product of after.products || []) {
    if (product.group !== 'cpo') continue;
    const original = beforeById.get(product.id);
    if (!original) continue;
    for (const [capacity, entry] of Object.entries(product.capacities || {})) {
      const previous = original.capacities?.[capacity]?.usd;
      if (previous !== entry.usd) changes.push({ id: product.id, model: product.model, capacity, before: previous, after: entry.usd });
    }
  }
  return changes;
}

export function validateImport(current, candidate) {
  const validation = validateCatalog(candidate);
  const errors = [...validation.errors];
  if (validation.valid && structureHash(current.products || []) !== structureHash(candidate.products || [])) {
    errors.push('A importacao altera modelos, cores, capacidades ou outra estrutura protegida.');
  }
  if (!errors.length) {
    const candidateWithoutCpoPriceChanges = structuredClone(candidate);
    const currentById = new Map(current.products.map(product => [product.id, product]));
    for (const product of candidateWithoutCpoPriceChanges.products) {
      if (product.group !== 'cpo') continue;
      const original = currentById.get(product.id);
      for (const capacity of Object.keys(product.capacities)) {
        product.capacities[capacity].usd = original.capacities[capacity].usd;
      }
    }
    if (!isDeepStrictEqual(candidateWithoutCpoPriceChanges, current)) {
      errors.push('A importacao pode alterar somente precos USD de capacidades CPO existentes.');
    }
  }
  return { valid: errors.length === 0, errors, changes: errors.length ? [] : diffCpoPrices(current, candidate), stats: validation.stats };
}
