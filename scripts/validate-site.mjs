import { access, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogModuleSource, validateCatalog } from './catalog-rules.mjs';

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
const expectedWhatsapp = '17865466540';
const expectedEmail = 'contact@celulars.com.br';
const forbiddenDistPatterns = [/(?:^|\/)tools(?:\/|$)/, /(?:^|\/)internal(?:\/|$)/, /catalog-manager/i, /(?:^|\/)backups(?:\/|$)/, /(?:^|\/)history(?:\/|$)/, /catalog-admin/i];
const textFileExtensions = new Set(['.js', '.mjs', '.json', '.html', '.css', '.md', '.yml', '.yaml']);
const unicodeScanIgnoredDirectories = new Set(['.git', 'node_modules', 'dist', 'backups', 'history']);

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

async function listTextFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && unicodeScanIgnoredDirectories.has(entry.name)) continue;
    const relativePath = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await listTextFiles(path.join(directory, entry.name), relativePath));
    else if (entry.name === '.gitignore' || textFileExtensions.has(path.extname(entry.name).toLowerCase())) files.push(relativePath);
  }
  return files;
}

async function validateUnicodeControls() {
  const controlPattern = /[\p{Cc}\p{Cf}]/u;
  const isTextFile = relativePath => path.basename(relativePath) === '.gitignore' || textFileExtensions.has(path.extname(relativePath).toLowerCase());
  const scanFiles = new Set([...requiredRootFiles, 'package.json', '.gitignore'].filter(isTextFile));
  for (const directory of ['.github', 'docs', 'scripts', 'tools']) {
    const directoryPath = path.join(projectRoot, directory);
    if (await exists(directory)) {
      for (const relativePath of await listTextFiles(directoryPath, directory)) scanFiles.add(relativePath);
    }
  }
  for (const relativePath of scanFiles) {
    const source = await read(relativePath);
    for (let position = 0; position < source.length;) {
      const codePoint = source.codePointAt(position);
      const character = String.fromCodePoint(codePoint);
      if (controlPattern.test(character) && character !== '\t' && character !== '\n' && character !== '\r') {
        errors.push(`Caractere Unicode de controle nao permitido em ${relativePath}, posicao ${position}, code point U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}.`);
      }
      position += character.length;
    }
  }
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

await validateUnicodeControls();

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
  const catalogValidation = validateCatalog(catalog);
  for (const error of catalogValidation.errors) errors.push(error);
  const expectedModule = catalogModuleSource(catalog);
  const sourceModule = await read('data/catalog-public.js');
  check(sourceModule.replace(/\r\n/g, '\n') === expectedModule, 'catalog-public.js nao corresponde ao JSON canonico.');
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
    for (const file of distFiles) check(!forbiddenDistPatterns.some(pattern => pattern.test(file)), `Arquivo interno proibido em dist: ${file}`);
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
  console.log('Catalogo: 5 novos, 26 CPO, 83 capacidades e 73 combinacoes ausentes.');
  console.log(`Hash estrutural: ${catalog.sourceStructureSha256}`);
  if (validateDist) console.log(`Artefato dist validado: ${expectedDistFiles.length} arquivos publicos.`);
}
