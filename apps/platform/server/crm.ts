import { randomUUID } from 'node:crypto';
import type { PlatformDatabase } from '../database/db.js';
import { withTransaction } from '../database/db.js';
import type { Principal } from './types.js';

interface CustomerInput {
  readonly name?: string;
  readonly email?: string;
  readonly country?: string;
  readonly language?: string;
  readonly source?: string;
  readonly status?: string;
  readonly notes?: string;
  readonly companyId?: string | null;
}

interface CompanyApprovalInput {
  readonly status?: string;
  readonly notes?: string;
}

const customerStatuses = new Set(['LEAD', 'ACTIVE', 'INACTIVE']);
const approvalTransitions: Readonly<Record<string, readonly string[]>> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['SUSPENDED'],
  REJECTED: ['SUBMITTED'],
  SUSPENDED: ['UNDER_REVIEW']
};

function isWholesale(principal: Principal): boolean {
  return principal.roles.includes('WHOLESALE');
}

function customerValues(input: CustomerInput): {
  name: string; email: string; country: string; language: string; source: string;
  status: string; notes: string; companyId: string | null;
} {
  const values = {
    name: input.name?.trim().slice(0, 120) ?? '',
    email: input.email?.trim().toLowerCase().slice(0, 180) ?? '',
    country: input.country?.trim().toUpperCase().slice(0, 2) ?? '',
    language: input.language?.trim().slice(0, 12) ?? '',
    source: input.source?.trim().slice(0, 80) ?? '',
    status: input.status?.trim().toUpperCase() ?? '',
    notes: input.notes?.trim().slice(0, 1000) ?? '',
    companyId: input.companyId?.trim() || null
  };
  if (values.name.length < 2 || !values.email.includes('@') || values.country.length !== 2 ||
      values.language.length < 2 || values.source.length < 2 || !customerStatuses.has(values.status) || values.notes.length < 3) {
    throw new Error('INVALID_CUSTOMER');
  }
  return values;
}

export function customerData(database: PlatformDatabase, search: string): object {
  const term = `%${search.trim().slice(0, 80)}%`;
  const customers = database.prepare(`SELECT c.id,c.name,c.email,c.phone_demo,c.country,c.language,c.source,c.status,c.notes,
      c.assigned_user_id,c.company_id,co.name AS company_name,c.created_at,c.updated_at
    FROM customers c LEFT JOIN companies co ON co.id=c.company_id
    WHERE c.deleted_at IS NULL AND (?='%%' OR c.name LIKE ? OR c.email LIKE ? OR c.phone_demo LIKE ? OR co.name LIKE ?)
    ORDER BY c.updated_at DESC,c.name LIMIT 200`).all(term, term, term, term, term);
  return { customers, environment: 'DEMO' };
}

export function createCustomer(database: PlatformDatabase, principal: Principal, input: CustomerInput): object {
  const value = customerValues(input);
  if (database.prepare('SELECT id FROM customers WHERE email=?').get(value.email)) throw new Error('CUSTOMER_EXISTS');
  if (value.companyId && !database.prepare('SELECT id FROM companies WHERE id=? AND deleted_at IS NULL').get(value.companyId)) {
    throw new Error('INVALID_CUSTOMER');
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  database.prepare(`INSERT INTO customers
    (id,name,email,phone_demo,country,language,source,status,notes,assigned_user_id,company_id,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, value.name, value.email, `DEMO-PHONE-${id.slice(0, 8)}`, value.country,
    value.language, value.source, value.status, value.notes, principal.userId, value.companyId, now, now);
  return { id, ...value, actor: principal.userId };
}

export function updateCustomer(database: PlatformDatabase, principal: Principal, customerId: string, input: CustomerInput): object {
  const value = customerValues(input);
  const current = database.prepare('SELECT id,email FROM customers WHERE id=? AND deleted_at IS NULL').get(customerId);
  if (!current) throw new Error('CUSTOMER_NOT_FOUND');
  const duplicate = database.prepare('SELECT id FROM customers WHERE email=? AND id<>?').get(value.email, customerId);
  if (duplicate) throw new Error('CUSTOMER_EXISTS');
  const now = new Date().toISOString();
  database.prepare(`UPDATE customers SET name=?,email=?,country=?,language=?,source=?,status=?,notes=?,company_id=?,
    assigned_user_id=?,updated_at=? WHERE id=?`).run(value.name, value.email, value.country, value.language, value.source,
    value.status, value.notes, value.companyId, principal.userId, now, customerId);
  return { id: customerId, ...value, actor: principal.userId };
}

export function companyData(database: PlatformDatabase, principal: Principal): object {
  const scope = isWholesale(principal) ? principal.companyId : null;
  if (isWholesale(principal) && !scope) throw new Error('FORBIDDEN:companies.read');
  const companies = database.prepare(`SELECT c.id,c.name,c.company_type,c.country,c.demo_identifier,c.contact_name,c.contact_email,
      c.approval_status,c.classification,c.price_list_id,pl.name AS price_list_name,c.carrier_name,c.created_at,c.updated_at,
      COUNT(DISTINCT d.id) AS document_count,COUNT(DISTINCT u.id) AS user_count
    FROM companies c LEFT JOIN price_lists pl ON pl.id=c.price_list_id
    LEFT JOIN company_documents d ON d.company_id=c.id LEFT JOIN users u ON u.company_id=c.id
    WHERE c.deleted_at IS NULL AND (? IS NULL OR c.id=?)
    GROUP BY c.id ORDER BY c.company_type,c.name`).all(scope, scope);
  const documents = database.prepare(`SELECT d.id,d.company_id,d.file_name,d.mime_type,d.status,d.created_at
    FROM company_documents d WHERE (? IS NULL OR d.company_id=?) ORDER BY d.created_at DESC`).all(scope, scope);
  const approvals = database.prepare(`SELECT a.id,a.company_id,a.from_status,a.to_status,a.notes,a.actor_user_id,
      u.display_name AS actor_name,a.created_at FROM approvals a JOIN users u ON u.id=a.actor_user_id
    WHERE (? IS NULL OR a.company_id=?) ORDER BY a.created_at DESC LIMIT 100`).all(scope, scope);
  return { companies, documents, approvals, readOnly: isWholesale(principal), environment: 'DEMO' };
}

export function transitionCompanyApproval(database: PlatformDatabase, principal: Principal, companyId: string, input: CompanyApprovalInput): object {
  const status = input.status?.trim().toUpperCase() ?? '';
  const notes = input.notes?.trim().slice(0, 1000) ?? '';
  if (!status || notes.length < 3) throw new Error('INVALID_COMPANY_APPROVAL');
  return withTransaction(database, () => {
    const company = database.prepare('SELECT id,approval_status FROM companies WHERE id=? AND deleted_at IS NULL').get(companyId);
    if (!company) throw new Error('COMPANY_NOT_FOUND');
    const fromStatus = String(company.approval_status);
    if (!(approvalTransitions[fromStatus] ?? []).includes(status)) throw new Error('INVALID_COMPANY_APPROVAL');
    const now = new Date().toISOString();
    const id = randomUUID();
    database.prepare('UPDATE companies SET approval_status=?,updated_at=? WHERE id=?').run(status, now, companyId);
    database.prepare(`INSERT INTO approvals (id,company_id,from_status,to_status,notes,actor_user_id,created_at)
      VALUES (?,?,?,?,?,?,?)`).run(id, companyId, fromStatus, status, notes, principal.userId, now);
    return { id, companyId, fromStatus, toStatus: status, notes, actor: principal.userId, createdAt: now };
  });
}
