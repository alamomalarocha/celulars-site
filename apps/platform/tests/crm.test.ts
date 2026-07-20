import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { openDatabase } from '../database/db.js';
import { migrateDatabase } from '../database/migrate.js';
import { seedDatabase } from '../database/seed.js';
import { AuthService } from '../server/auth.js';
import { companyData, createCustomer, customerData, transitionCompanyApproval, updateCustomer } from '../server/crm.js';
import { loadConfig } from '../src/config.js';

const password = 'Local-Demo-Crm-Test!';

function removeDatabase(filePath: string): void {
  for (const candidate of [filePath, `${filePath}-wal`, `${filePath}-shm`]) if (existsSync(candidate)) rmSync(candidate);
}

test('CRM and company approval stay validated, scoped and auditable', () => {
  const base = loadConfig();
  const databasePath = path.join(base.platformRoot, 'data', `crm-test-${process.pid}.sqlite`);
  const config = loadConfig({ databasePath, sessionSecret: 'crm-test-secret-that-is-long-enough' });
  removeDatabase(databasePath);
  const database = openDatabase(config);
  migrateDatabase(database);
  seedDatabase(database, config, password);
  const auth = new AuthService(database, config);

  try {
    const admin = auth.login('admin@demo.invalid', password, { ipAddress: '127.0.0.1', userAgent: 'test' }).principal;
    const wholesale = auth.login('atacadista2@demo.invalid', password, { ipAddress: '127.0.0.1', userAgent: 'test' }).principal;
    const before = customerData(database, '') as { customers: readonly object[] };
    assert.equal(before.customers.length, 15);
    const created = createCustomer(database, admin, {
      name: 'Cliente Teste DEMO', email: 'novo-cliente@example.test', country: 'BR', language: 'pt-BR',
      source: 'Teste automatizado', status: 'LEAD', notes: 'Registro ficticio criado pelo teste.'
    }) as { id: string };
    assert.ok(created.id);
    updateCustomer(database, admin, created.id, {
      name: 'Cliente Teste Atualizado DEMO', email: 'novo-cliente@example.test', country: 'US', language: 'en-US',
      source: 'Teste automatizado', status: 'ACTIVE', notes: 'Registro ficticio atualizado pelo teste.'
    });
    assert.equal(String(database.prepare('SELECT status FROM customers WHERE id=?').get(created.id)?.status), 'ACTIVE');
    assert.throws(() => createCustomer(database, admin, {
      name: 'Duplicado DEMO', email: 'novo-cliente@example.test', country: 'BR', language: 'pt-BR',
      source: 'Teste automatizado', status: 'LEAD', notes: 'Duplicado ficticio.'
    }), /CUSTOMER_EXISTS/);

    const ownCompany = companyData(database, wholesale) as { companies: readonly { id: string }[]; documents: readonly { company_id: string }[]; readOnly: boolean };
    assert.equal(ownCompany.readOnly, true);
    assert.deepEqual(ownCompany.companies.map((row) => row.id), ['company-demo-2']);
    assert.ok(ownCompany.documents.every((row) => row.company_id === 'company-demo-2'));
    const allCompanies = companyData(database, admin) as { companies: readonly object[]; readOnly: boolean };
    assert.equal(allCompanies.companies.length, 6);
    assert.equal(allCompanies.readOnly, false);

    const first = transitionCompanyApproval(database, admin, 'company-demo-2', {
      status: 'APPROVED', notes: 'Aprovacao automatizada DEMO.'
    });
    assert.ok(first);
    assert.equal(String(database.prepare('SELECT approval_status FROM companies WHERE id=?').get('company-demo-2')?.approval_status), 'APPROVED');
    assert.throws(() => transitionCompanyApproval(database, admin, 'company-demo-2', {
      status: 'REJECTED', notes: 'Transicao impossivel DEMO.'
    }), /INVALID_COMPANY_APPROVAL/);
  } finally {
    database.close();
    removeDatabase(databasePath);
  }
});
