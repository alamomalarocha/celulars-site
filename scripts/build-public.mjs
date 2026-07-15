import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { privateArtifactViolation } from './artifact-privacy-rules.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const outputDirectory = path.resolve(projectRoot, 'dist');

const publicFiles = [
  'index.html',
  'iphones.html',
  'sobre.html',
  'acessos.html',
  'contato.html',
  'atacado.html',
  '404.html',
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
  'brand-assets/celulars-official-logos/icon/celulars-header-icon-original-512.png'
];

const generatedPublicFiles = ['data/catalog-public.js'];
function assertOutputDirectoryIsSafe() {
  const expected = path.join(projectRoot, 'dist');
  if (outputDirectory !== expected || path.dirname(outputDirectory) !== projectRoot) {
    throw new Error(`Diretorio de saida inseguro: ${outputDirectory}`);
  }
}

async function assertRequiredFile(relativePath) {
  const sourcePath = path.resolve(projectRoot, relativePath);
  if (!sourcePath.startsWith(`${projectRoot}${path.sep}`)) {
    throw new Error(`Caminho fora do projeto: ${relativePath}`);
  }

  let sourceStat;
  try {
    sourceStat = await stat(sourcePath);
  } catch {
    throw new Error(`Arquivo publico obrigatorio ausente: ${relativePath}`);
  }

  if (!sourceStat.isFile()) {
    throw new Error(`Item publico nao e arquivo: ${relativePath}`);
  }

  return sourcePath;
}

async function copyPublicFile(relativePath) {
  const sourcePath = await assertRequiredFile(relativePath);
  const destinationPath = path.resolve(outputDirectory, relativePath);
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await cp(sourcePath, destinationPath);
}

async function listOutputFiles(directory = outputDirectory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listOutputFiles(path.join(directory, entry.name), relativePath));
    } else {
      files.push(relativePath);
    }
  }
  return files;
}

assertOutputDirectoryIsSafe();
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const relativePath of publicFiles) {
  await copyPublicFile(relativePath);
}

const catalogJson = JSON.parse(await readFile(path.join(projectRoot, 'data/catalog-public.json'), 'utf8'));
const catalogModulePath = path.join(outputDirectory, 'data/catalog-public.js');
await mkdir(path.dirname(catalogModulePath), { recursive: true });
await writeFile(catalogModulePath, `window.CELULARS_CATALOG=${JSON.stringify(catalogJson)};\n`, 'utf8');

const outputFiles = (await listOutputFiles()).sort();
const expectedOutputFiles = [...publicFiles, ...generatedPublicFiles].sort();
if (JSON.stringify(outputFiles) !== JSON.stringify(expectedOutputFiles)) {
  throw new Error(`Artefato inesperado. Gerados: ${outputFiles.join(', ')}`);
}
for (const file of outputFiles) {
  const pathViolation = privateArtifactViolation(file);
  if (pathViolation) throw new Error(`Arquivo interno proibido em dist: ${file} (${pathViolation.pattern})`);
  if (/\.(?:html|css|js|json|txt|xml)$/i.test(file)) {
    const source = await readFile(path.join(outputDirectory, file), 'utf8');
    const contentViolation = privateArtifactViolation(file, source);
    if (contentViolation) throw new Error(`Conteudo privado de inventario encontrado em dist/${file}: ${contentViolation.pattern}`);
  }
}

console.log(`Artefato publico criado em ${outputDirectory}`);
console.log(`Arquivos publicados: ${outputFiles.length}`);
for (const file of outputFiles) console.log(`- ${file}`);
