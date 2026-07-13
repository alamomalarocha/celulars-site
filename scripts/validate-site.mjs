import { createHash } from 'node:crypto';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const validateDist = process.argv.includes('--dist');
const errors = [];

const activePages = ['index.html', 'iphones.html', 'sobre.html', 'acessos.html', 'contato.html', '404.html'];
const expectedMenu = ['index.html', 'iphones.html', 'sobre.html', 'acessos.html', 'contato.html'];
const requiredRootFiles = [
  ...activePages,
  'atacado.html',
  'apple-inspired-header.css',
  'apple-inspired-header.js',
  'visual-direction.css',
  'visual-direction.js',
  'visual-review.css',
  'favicon.ico',
  '_headers',
  '_redirects',
  'robots.txt',
  'sitemap.xml',
  'data/catalog-public.json',
  'data/catalog-public.js',
  'brand-assets/celulars-official-logos/icon/celulars-header-icon-original-512.png'
];
const expectedDistFiles = [...requiredRootFiles].sort();
const expectedNewOrder = ['iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone Air', 'iPhone 17', 'iPhone 17e'];
const expectedCpoOrder = ['iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone Air', 'iPhone 17', 'iPhone 17e', 'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16', 'iPhone 16e', 'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15', 'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14', 'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 mini', 'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 mini'];
const expectedStructureHash = 'f24be6d04e1100ad639a557c539c35cdde364f53a04f917d32fa06705009b664';
const expectedWhatsapp = '17865466540';
const expectedEmail = 'contact@celulars.com.br';

function check(condition, message) {
  if (!condition) errors.push(message);
}

async function exists(relativePath, root = projectRoot) {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function read(relativePath, root = projectRoot) {
  return readFile(path.join(root, relativePath), 'utf8');
}

function visibleText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|#160);/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function navHrefs(html) {
  const match = html.match(/<nav\b[^>]*class="[^"]*cel-global-links[^"]*"[^>]*>([\s\S]*?)<\/nav>/i);
  if (!match) return null;
  return [...match[1].matchAll(/<a\b[^>]*href="([^"]+)"/gi)].map(item => item[1]);
}

function structuralProduct(product) {
  return {
    model: product.model,
    year: product.year,
    group: product.group,
    condition: product.condition,
    classification: product.classification,
    colors: product.colors,
    capacities: product.capacities,
    availability: product.availability,
    order: product.order
  };
}

function structureHash(products) {
  return createHash('sha256').update(JSON.stringify(products.map(structuralProduct))).digest('hex');
}

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path.join(directory, entry.name), relativePath));
    else files.push(relativePath);
  }
  return files;
}

function compileScripts(html, pageName) {
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attributes = match[1];
    if (/\bsrc\s*=/i.test(attributes) || /application\/(?:ld\+)?json/i.test(attributes)) continue;
    try {
      new Function(match[2]);
    } catch (error) {
      errors.push(`${pageName}: JavaScript inline invalido (${error.message}).`);
    }
  }
}

for (const file of requiredRootFiles) {
  check(await exists(file), `Arquivo publico obrigatorio ausente: ${file}`);
}

let catalog;
try {
  catalog = JSON.parse(await read('data/catalog-public.json'));
} catch (error) {
  errors.push(`catalog-public.json invalido: ${error.message}`);
}

if (catalog) {
  const products = Array.isArray(catalog.products) ? catalog.products : [];
  const newProducts = products.filter(product => product.group === 'new').sort((a, b) => a.order - b.order);
  const cpoProducts = products.filter(product => product.group === 'cpo').sort((a, b) => a.order - b.order);
  const ids = products.map(product => product.id);
  const groupModels = products.map(product => `${product.group}:${product.model}`);

  check(new Set(ids).size === ids.length, 'IDs duplicados no catalogo.');
  check(new Set(groupModels).size === groupModels.length, 'Modelo duplicado dentro do mesmo grupo.');
  check(newProducts.length === 5, `Esperados 5 modelos novos; encontrados ${newProducts.length}.`);
  check(cpoProducts.length === 26, `Esperados 26 modelos CPO; encontrados ${cpoProducts.length}.`);
  check(JSON.stringify(newProducts.map(product => product.model)) === JSON.stringify(expectedNewOrder), 'Ordem dos modelos novos foi alterada.');
  check(JSON.stringify(cpoProducts.map(product => product.model)) === JSON.stringify(expectedCpoOrder), 'Ordem dos modelos CPO foi alterada.');

  let zeroCount = 0;
  const cpoCapacitySet = new Set();
  for (const product of products) {
    check(typeof product.id === 'string' && product.id.length > 3, 'Produto sem ID estavel.');
    check(typeof product.model === 'string' && product.model.trim(), `${product.id}: modelo vazio.`);
    check(Number.isInteger(product.year) && product.year >= 2007 && product.year <= 2100, `${product.id}: ano invalido.`);
    check(Array.isArray(product.colors) && product.colors.length > 0 && product.colors.every(color => typeof color === 'string' && color.trim()), `${product.id}: cores invalidas.`);
    check(product.capacities && typeof product.capacities === 'object' && !Array.isArray(product.capacities), `${product.id}: capacidades invalidas.`);
    for (const [capacity, entry] of Object.entries(product.capacities || {})) {
      check(/^\d+\s+(?:GB|TB)$/i.test(capacity), `${product.id}: capacidade invalida (${capacity}).`);
      const usd = entry && entry.usd;
      check(typeof usd === 'number' && Number.isFinite(usd) && usd >= 0, `${product.id} ${capacity}: preco invalido.`);
      if (usd === 0) {
        zeroCount += 1;
        check(product.group === 'cpo', `${product.id} ${capacity}: zero permitido somente para CPO.`);
      }
      if (product.group === 'new') check(usd > 0, `${product.id} ${capacity}: modelo novo sem preco real.`);
      if (product.group === 'cpo') cpoCapacitySet.add(capacity);
    }
  }

  const missingCount = cpoProducts.length * cpoCapacitySet.size - cpoProducts.reduce((total, product) => total + Object.keys(product.capacities).length, 0);
  check(zeroCount === 83, `Esperadas 83 capacidades CPO zeradas; encontradas ${zeroCount}.`);
  check(missingCount === 73, `Esperadas 73 combinacoes CPO ausentes; encontradas ${missingCount}.`);
  const computedHash = structureHash(products);
  check(catalog.sourceStructureSha256 === expectedStructureHash, 'Hash estrutural declarado foi alterado.');
  check(computedHash === expectedStructureHash, `Hash estrutural divergente: ${computedHash}.`);

  const expectedModule = `window.CELULARS_CATALOG=${JSON.stringify(catalog)};\n`;
  const sourceModule = await read('data/catalog-public.js');
  check(sourceModule === expectedModule, 'catalog-public.js nao corresponde ao JSON canonico.');
}

const pageSources = new Map();
for (const page of activePages) {
  const html = await read(page);
  pageSources.set(page, html);
  const menu = navHrefs(html);
  check(menu !== null, `${page}: menu principal ausente.`);
  if (menu) {
    check(JSON.stringify(menu) === JSON.stringify(expectedMenu), `${page}: menu principal divergente (${menu.join(', ')}).`);
    check(!menu.some(href => /atacado/i.test(href)), `${page}: Atacado voltou ao menu principal.`);
  }
  const publicText = visibleText(html);
  check(!/\beCPO\b/i.test(publicText), `${page}: termo eCPO visivel ao publico.`);
  check(!/\bCDVS\b/i.test(publicText), `${page}: termo CDVS visivel ao publico.`);
  check(!/(?:wa\.me\/55|tel:\+55|\+55\s*\d)/i.test(html), `${page}: numero brasileiro encontrado.`);
  check(!/(?:property|name)="(?:og:image|twitter:image|image_src)"|summary_large_image/i.test(html), `${page}: metadado de imagem social proibido.`);
  compileScripts(html, page);
}

const combinedPublicSource = [...pageSources.values()].join('\n');
const whatsappMatches = [...combinedPublicSource.matchAll(/wa\.me\/(\d+)/g)].map(match => match[1]);
check(whatsappMatches.length > 0 && whatsappMatches.every(number => number === expectedWhatsapp), 'WhatsApp institucional ausente ou divergente.');
check(combinedPublicSource.includes(expectedEmail), 'E-mail institucional ausente ou divergente.');
check(combinedPublicSource.includes('US$125'), 'Frete CPO de US$125 ausente.');
check(combinedPublicSource.includes('US$200'), 'Frete de aparelho novo de US$200 ausente.');

const iphoneHtml = pageSources.get('iphones.html') || '';
check(iphoneHtml.includes("const CPO_SEARCH_ALIASES='CPO eCPO e CPO e-CPO';"), 'Alias interno eCPO foi removido.');
check(!/const IPHONE_MODELS\s*=\s*\[\s*\{/.test(iphoneHtml), 'Dados antigos voltaram a ser incorporados no iphones.html.');
check(iphoneHtml.indexOf('data/catalog-public.js') < iphoneHtml.indexOf('(function clientMain()'), 'Modulo do catalogo nao carrega antes da renderizacao.');

const headerJs = await read('apple-inspired-header.js');
check(/CELULARS_EXCHANGE_SPREAD_BRL\s*=\s*0\.15/.test(headerJs), 'Ajuste PTAX compartilhado nao e R$0,1500.');
check(/BCB_CACHE_TTL_MS\s*=\s*86400000/.test(headerJs), 'Cache PTAX compartilhado nao e diario.');
check(/CELULARS_EXCHANGE_SPREAD_BRL\s*=\s*0\.15/.test(iphoneHtml), 'Ajuste PTAX do catalogo nao e R$0,1500.');

for (const script of ['apple-inspired-header.js', 'visual-direction.js', 'data/catalog-public.js']) {
  try {
    new Function(await read(script));
  } catch (error) {
    errors.push(`${script}: JavaScript invalido (${error.message}).`);
  }
}

const redirects = await read('_redirects');
check(redirects.includes('/atacado /acessos 301'), 'Redirect /atacado ausente.');
check(redirects.includes('/atacado.html /acessos 301'), 'Redirect /atacado.html ausente.');
check(!redirects.includes('/data/*'), 'Redirect generico /data/* bloquearia o catalogo publico.');

const sensitivePatterns = [
  /AKIA[0-9A-Z]{16}/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /(?:password|passwd|api[_-]?key|client[_-]?secret|access[_-]?token)\s*[:=]\s*['"][^'"]{6,}/i
];
const publicCodeFiles = [...activePages, 'apple-inspired-header.js', 'visual-direction.js'];
for (const file of publicCodeFiles) {
  const source = await read(file);
  for (const pattern of sensitivePatterns) check(!pattern.test(source), `${file}: possivel segredo encontrado.`);
}

if (validateDist) {
  const distRoot = path.join(projectRoot, 'dist');
  check(await exists('dist'), 'Pasta dist nao foi gerada.');
  if (await exists('dist')) {
    const distStat = await stat(distRoot);
    check(distStat.isDirectory(), 'dist nao e um diretorio.');
    const distFiles = (await listFiles(distRoot)).sort();
    check(JSON.stringify(distFiles) === JSON.stringify(expectedDistFiles), `Allowlist de dist divergente: ${distFiles.join(', ')}`);
    for (const page of activePages) {
      const html = await read(page, distRoot);
      for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/gi)) {
        const reference = match[1].split('?')[0];
        if (/^(?:https?:|mailto:|tel:|data:)/i.test(reference)) continue;
        if (/[+'`]/.test(reference)) continue;
        const normalized = reference.replace(/^\//, '');
        check(await exists(normalized, distRoot), `dist/${page}: recurso local ausente (${normalized}).`);
      }
    }
  }
}

if (errors.length) {
  console.error(`Validacao CELULARS falhou com ${errors.length} erro(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('Validacao CELULARS concluida sem erros.');
  console.log('Catalogo: 5 novos, 26 CPO, 83 zeros e 73 combinacoes ausentes.');
  console.log(`Hash estrutural: ${expectedStructureHash}`);
  if (validateDist) console.log(`Artefato dist validado: ${expectedDistFiles.length} arquivos publicos.`);
}
