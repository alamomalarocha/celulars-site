import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  '.env.staging.example',
  '.env.production.example',
  '.github/workflows/platform-production.yml',
  'apps/platform/deploy/ACTIVATION.md',
  'apps/platform/deploy/INFRASTRUCTURE.md',
  'scripts/platform-build-target.mjs',
  'scripts/platform-cloudflare-preflight.mjs',
];
const missing = required.filter((file) => !existsSync(path.join(root, file)));
const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const commands = [
  'platform:build:staging',
  'platform:build:production',
  'platform:activation:check',
  'platform:bootstrap-admin',
  'platform:migrate:production',
  'platform:deploy:production',
];
for (const command of commands) {
  if (!packageJson.scripts?.[command]) missing.push('package script ' + command);
}

const workflowPath = path.join(root, '.github/workflows/platform-production.yml');
if (existsSync(workflowPath)) {
  const workflow = readFileSync(workflowPath, 'utf8');
  const orderedSteps = [
    'Require Cloudflare deployment credentials',
    'Validate Cloudflare account and D1 access',
    'Backup D1 before migration',
    'actions/upload-artifact@',
    'platform:migrate:production',
    'platform:deploy:production',
    'platform:e2e:production-online',
  ];
  let previousIndex = -1;
  for (const step of orderedSteps) {
    const index = workflow.indexOf(step);
    if (index === -1 || index <= previousIndex) missing.push('ordered production step ' + step);
    previousIndex = index;
  }
  if (workflow.includes('wrangler@4.52.1')) missing.push('obsolete Wrangler 4.52.1 in production workflow');
}

const report = {
  status: missing.length ? 'NOT_READY' : 'READY_FOR_EXTERNAL_PROVISIONING',
  missing,
  publicDistUntouched: true,
  deploymentExecuted: false,
  warning: 'Este comando não publica nem cria recursos externos.',
};
console.log(JSON.stringify(report, null, 2));
if (missing.length) process.exitCode = 2;
