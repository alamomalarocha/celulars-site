import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  'brand-assets/celulars-official-logos/icon/celulars-header-icon-original-512.png'
];

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

const outputFiles = (await listOutputFiles()).sort();
if (outputFiles.length !== publicFiles.length) {
  throw new Error(`Artefato inesperado: ${outputFiles.length} arquivos gerados para ${publicFiles.length} autorizados.`);
}

console.log(`Artefato publico criado em ${outputDirectory}`);
console.log(`Arquivos publicados: ${outputFiles.length}`);
for (const file of outputFiles) console.log(`- ${file}`);
