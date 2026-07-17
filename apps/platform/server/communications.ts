import { randomUUID } from 'node:crypto';
import type { PlatformDatabase } from '../database/db.js';
import { withTransaction } from '../database/db.js';
import type { Principal } from './types.js';

interface RequestInput {
  readonly title?: string;
  readonly description?: string;
  readonly leadType?: string;
  readonly priority?: string;
  readonly customerId?: string | null;
}

interface RequestStatusInput { readonly status?: string; readonly assignedUserId?: string | null }
interface ConversationInput { readonly subject?: string; readonly customerId?: string | null }
interface MessageInput { readonly conversationId?: string; readonly body?: string; readonly messageType?: string }

const leadTypes = new Set(['RETAIL','WHOLESALE','PRODUCT','PRICE','PICKUP','SHIPPING','SUPPORT']);
const priorities = new Set(['LOW','NORMAL','HIGH','URGENT']);
const requestTransitions: Readonly<Record<string, readonly string[]>> = {
  NEW: ['ASSIGNED','IN_PROGRESS','CLOSED'], ASSIGNED: ['IN_PROGRESS','WAITING_CUSTOMER','CLOSED'],
  IN_PROGRESS: ['WAITING_CUSTOMER','RESOLVED','CLOSED'], WAITING_CUSTOMER: ['IN_PROGRESS','RESOLVED','CLOSED'],
  RESOLVED: ['CLOSED','IN_PROGRESS'], CLOSED: []
};

function wholesaleCompany(principal: Principal): string | null {
  return principal.roles.includes('WHOLESALE') ? principal.companyId : null;
}

function ensureScopedCompany(principal: Principal): string | null {
  const companyId = wholesaleCompany(principal);
  if (principal.roles.includes('WHOLESALE') && !companyId) throw new Error('FORBIDDEN:scope');
  return companyId;
}

export function requestData(database: PlatformDatabase, principal: Principal): object {
  const scope = ensureScopedCompany(principal);
  const requests = database.prepare(`SELECT r.id,r.title,r.description,r.status,r.created_by_user_id,r.assigned_user_id,
      l.id AS lead_id,l.lead_type,l.priority,l.company_id,l.customer_id,l.tags_json,l.internal_notes,
      c.name AS customer_name,co.name AS company_name,u.display_name AS assigned_name,r.created_at,r.updated_at
    FROM requests r JOIN leads l ON l.id=r.lead_id LEFT JOIN customers c ON c.id=l.customer_id
    LEFT JOIN companies co ON co.id=l.company_id LEFT JOIN users u ON u.id=r.assigned_user_id
    WHERE (? IS NULL OR l.company_id=?) ORDER BY r.updated_at DESC LIMIT 200`).all(scope, scope);
  const employees = scope ? [] : database.prepare(`SELECT u.id,u.display_name FROM users u JOIN user_roles ur ON ur.user_id=u.id
    JOIN roles ro ON ro.id=ur.role_id WHERE ro.code IN ('ADMIN','EMPLOYEE') AND u.status='ACTIVE' ORDER BY u.display_name`).all();
  return { requests, employees, readOnlyStatus: Boolean(scope), environment: 'DEMO' };
}

export function createRequest(database: PlatformDatabase, principal: Principal, input: RequestInput): object {
  const title = input.title?.trim().slice(0, 160) ?? '';
  const description = input.description?.trim().slice(0, 2000) ?? '';
  const leadType = input.leadType?.trim().toUpperCase() ?? '';
  const priority = input.priority?.trim().toUpperCase() ?? '';
  const customerId = input.customerId?.trim() || null;
  const companyId = ensureScopedCompany(principal);
  if (title.length < 3 || description.length < 3 || !leadTypes.has(leadType) || !priorities.has(priority)) throw new Error('INVALID_REQUEST');
  if (customerId && !database.prepare('SELECT id FROM customers WHERE id=? AND deleted_at IS NULL').get(customerId)) throw new Error('INVALID_REQUEST');
  const now = new Date().toISOString();
  return withTransaction(database, () => {
    const leadId = randomUUID();
    const requestId = randomUUID();
    database.prepare(`INSERT INTO leads
      (id,customer_id,company_id,lead_type,status,priority,tags_json,assigned_user_id,internal_notes,created_at,updated_at)
      VALUES (?,?,? ,?,'NEW',?,'["DEMO"]',NULL,'Solicitacao criada no ambiente DEMO.',?,?)`).run(
      leadId, customerId, companyId, leadType, priority, now, now);
    database.prepare(`INSERT INTO requests
      (id,lead_id,title,description,status,created_by_user_id,assigned_user_id,created_at,updated_at)
      VALUES (?,?,?,?, 'NEW',?,NULL,?,?)`).run(requestId, leadId, title, description, principal.userId, now, now);
    return { id: requestId, leadId, title, status: 'NEW', companyId, actor: principal.userId };
  });
}

export function transitionRequest(database: PlatformDatabase, principal: Principal, requestId: string, input: RequestStatusInput): object {
  if (principal.roles.includes('WHOLESALE')) throw new Error('FORBIDDEN:requests.write.status');
  const status = input.status?.trim().toUpperCase() ?? '';
  const assignedUserId = input.assignedUserId?.trim() || null;
  return withTransaction(database, () => {
    const current = database.prepare('SELECT id,lead_id,status FROM requests WHERE id=?').get(requestId);
    if (!current) throw new Error('REQUEST_NOT_FOUND');
    const fromStatus = String(current.status);
    if (!(requestTransitions[fromStatus] ?? []).includes(status)) throw new Error('INVALID_REQUEST_STATUS');
    if (assignedUserId && !database.prepare(`SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id
      JOIN roles r ON r.id=ur.role_id WHERE u.id=? AND r.code IN ('ADMIN','EMPLOYEE') AND u.status='ACTIVE'`).get(assignedUserId)) {
      throw new Error('INVALID_REQUEST_STATUS');
    }
    const now = new Date().toISOString();
    database.prepare('UPDATE requests SET status=?,assigned_user_id=COALESCE(?,assigned_user_id),updated_at=? WHERE id=?')
      .run(status, assignedUserId, now, requestId);
    database.prepare('UPDATE leads SET status=?,assigned_user_id=COALESCE(?,assigned_user_id),updated_at=? WHERE id=?')
      .run(status, assignedUserId, now, String(current.lead_id));
    return { id: requestId, fromStatus, toStatus: status, assignedUserId, actor: principal.userId };
  });
}

export function conversationData(database: PlatformDatabase, principal: Principal): object {
  const scope = ensureScopedCompany(principal);
  const conversations = database.prepare(`SELECT c.id,c.company_id,c.customer_id,c.subject,c.status,c.assigned_user_id,
      co.name AS company_name,cu.name AS customer_name,u.display_name AS assigned_name,c.created_at,c.updated_at,
      COUNT(m.id) AS message_count FROM conversations c LEFT JOIN companies co ON co.id=c.company_id
    LEFT JOIN customers cu ON cu.id=c.customer_id LEFT JOIN users u ON u.id=c.assigned_user_id
    LEFT JOIN messages m ON m.conversation_id=c.id WHERE (? IS NULL OR c.company_id=?)
    GROUP BY c.id ORDER BY c.updated_at DESC LIMIT 100`).all(scope, scope);
  const messages = database.prepare(`SELECT m.id,m.conversation_id,m.sender_user_id,u.display_name AS sender_name,m.body,
      m.message_type,m.external_delivery,m.created_at FROM messages m JOIN conversations c ON c.id=m.conversation_id
    LEFT JOIN users u ON u.id=m.sender_user_id WHERE (? IS NULL OR c.company_id=?)
      AND (?=0 OR m.message_type<>'INTERNAL_NOTE') ORDER BY m.created_at DESC LIMIT 300`).all(scope, scope, scope ? 1 : 0);
  const templates = database.prepare('SELECT id,name,body FROM message_templates WHERE active=1 ORDER BY name').all();
  return { conversations, messages, templates, allowInternalNotes: !scope, environment: 'DEMO' };
}

export function createConversation(database: PlatformDatabase, principal: Principal, input: ConversationInput): object {
  const subject = input.subject?.trim().slice(0, 180) ?? '';
  const customerId = input.customerId?.trim() || null;
  const companyId = ensureScopedCompany(principal);
  if (subject.length < 3) throw new Error('INVALID_CONVERSATION');
  if (customerId && !database.prepare('SELECT id FROM customers WHERE id=? AND deleted_at IS NULL').get(customerId)) throw new Error('INVALID_CONVERSATION');
  const id = randomUUID();
  const now = new Date().toISOString();
  database.prepare(`INSERT INTO conversations
    (id,company_id,customer_id,subject,status,assigned_user_id,created_at,updated_at)
    VALUES (?,?,? ,?,'OPEN',NULL,?,?)`).run(id, companyId, customerId, subject, now, now);
  return { id, companyId, customerId, subject, status: 'OPEN', actor: principal.userId };
}

export function createMessage(database: PlatformDatabase, principal: Principal, input: MessageInput): object {
  const conversationId = input.conversationId?.trim() ?? '';
  const body = input.body?.trim().slice(0, 4000) ?? '';
  const messageType = input.messageType?.trim().toUpperCase() ?? 'MESSAGE';
  const scope = ensureScopedCompany(principal);
  if (scope && messageType === 'INTERNAL_NOTE') throw new Error('FORBIDDEN:messages.internal');
  if (!conversationId || body.length < 1 || !['MESSAGE','INTERNAL_NOTE','TEMPLATE'].includes(messageType)) {
    throw new Error('INVALID_MESSAGE');
  }
  const conversation = database.prepare('SELECT id,company_id FROM conversations WHERE id=?').get(conversationId);
  if (!conversation || (scope && String(conversation.company_id) !== scope)) throw new Error('CONVERSATION_NOT_FOUND');
  const id = randomUUID();
  const now = new Date().toISOString();
  return withTransaction(database, () => {
    database.prepare(`INSERT INTO messages
      (id,conversation_id,sender_user_id,body,message_type,external_delivery,created_at)
      VALUES (?,?,?,?,?,'DEMO_NOT_SENT',?)`).run(id, conversationId, principal.userId, body, messageType, now);
    database.prepare('UPDATE conversations SET status=?,updated_at=? WHERE id=?').run('OPEN', now, conversationId);
    return { id, conversationId, body, messageType, externalDelivery: 'DEMO_NOT_SENT', actor: principal.userId };
  });
}
