import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve('apps/platform');
const allowedExtensions = new Set(['.ts', '.js', '.sql', '.css', '.html', '.md', '.json']);
const ignored = new Set(['build', 'data', 'node_modules', 'vendor', 'test-results', 'playwright-report']);
const errors = [];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(fullPath);
      continue;
    }
    if (!allowedExtensions.has(path.extname(entry.name))) continue;
    const source = await readFile(fullPath, 'utf8');
    const relative = path.relative(process.cwd(), fullPath);
    if (/\r/.test(source)) errors.push(`${relative}: use LF em vez de CRLF.`);
    source.split('\n').forEach((line, index) => {
      if (/[ \t]+$/.test(line)) errors.push(`${relative}:${index + 1}: espaco no fim da linha.`);
      if (line.includes('\t')) errors.push(`${relative}:${index + 1}: tabulacao nao permitida.`);
    });
    if (/\beval\s*\(|new\s+Function\s*\(/.test(source)) errors.push(`${relative}: execucao dinamica proibida.`);
    if (/innerHTML\s*=/.test(source)) errors.push(`${relative}: innerHTML direto proibido.`);
    if (path.extname(entry.name) === '.js') {
      const syntax = spawnSync(process.execPath, ['--check', fullPath], { encoding: 'utf8' });
      if (syntax.status !== 0) errors.push(`${relative}: sintaxe JavaScript invalida.`);
    }
  }
}

await visit(root);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Lint da plataforma DEMO aprovado.');
}
