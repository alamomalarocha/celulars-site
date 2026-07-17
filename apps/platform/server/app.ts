import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { PlatformDatabase } from '../database/db.js';
import type { PlatformConfig } from '../src/config.js';
import { AuthService, AuthenticationError } from './auth.js';
import { clearSessionCookie, parseCookies, sessionCookie, sessionCookieName } from './cookies.js';
import { conversationData, createConversation, createMessage, createRequest, requestData, transitionRequest } from './communications.js';
import { companyData, createCustomer, customerData, transitionCompanyApproval, updateCustomer } from './crm.js';
import { dashboardData, notificationData } from './dashboard.js';
import { readJson, sendEmpty, sendJson } from './http.js';
import { catalogData, createPriceRevision, inventoryData, priceData, priceListData, recordInventoryMovement } from './operations.js';
import { RateLimiter } from './rate-limit.js';
import { requirePermission } from './rbac.js';
import { applySecurityHeaders, validUnsafeOrigin } from './security.js';
import { serveStatic } from './static.js';
import type { Principal } from './types.js';

interface LoginBody {
  readonly email?: string;
  readonly password?: string;
}

interface PriceRevisionBody {
  readonly priceListId?: string;
  readonly variantId?: string;
  readonly amountCents?: number;
}

interface InventoryMovementBody {
  readonly inventoryItemId?: string;
  readonly movementType?: string;
  readonly quantity?: number;
  readonly notes?: string;
}

interface CustomerBody {
  readonly name?: string;
  readonly email?: string;
  readonly country?: string;
  readonly language?: string;
  readonly source?: string;
  readonly status?: string;
  readonly notes?: string;
  readonly companyId?: string | null;
}

interface CompanyApprovalBody {
  readonly status?: string;
  readonly notes?: string;
}

interface RequestBody {
  readonly title?: string;
  readonly description?: string;
  readonly leadType?: string;
  readonly priority?: string;
  readonly customerId?: string | null;
}

interface RequestStatusBody { readonly status?: string; readonly assignedUserId?: string | null }
interface ConversationBody { readonly subject?: string; readonly customerId?: string | null }
interface MessageBody { readonly conversationId?: string; readonly body?: string; readonly messageType?: string }

export interface PlatformApplication {
  readonly server: Server;
  readonly auth: AuthService;
}

function headerValue(value: string | readonly string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : value?.[0];
}

function publicPrincipal(principal: Principal): object {
  return {
    id: principal.userId,
    email: principal.email,
    displayName: principal.displayName,
    companyId: principal.companyId,
    roles: principal.roles,
    permissions: principal.permissions,
    csrfToken: principal.csrfToken
  };
}

function audit(database: PlatformDatabase, principal: Principal | null, action: string, entityType: string, entityId: string, request: IncomingMessage): void {
  database.prepare(`INSERT INTO audit_events
    (id,actor_user_id,action,entity_type,entity_id,ip_address,user_agent,created_at)
    VALUES (?,?,?,?,?,?,?,?)`).run(randomUUID(), principal?.userId ?? null, action, entityType, entityId,
    request.socket.remoteAddress ?? 'unknown', request.headers['user-agent'] ?? 'unknown', new Date().toISOString());
}

export function createPlatformApplication(database: PlatformDatabase, config: PlatformConfig): PlatformApplication {
  const auth = new AuthService(database, config);
  const loginLimiter = new RateLimiter(5, 15 * 60 * 1000);

  async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
    applySecurityHeaders(response);
    const method = request.method ?? 'GET';
    const url = new URL(request.url ?? '/', config.allowedOrigin);
    const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(method);

    try {
      if (method === 'GET' && serveStatic(url.pathname, response, config)) return;

      if (unsafe && !validUnsafeOrigin(headerValue(request.headers.origin), config)) {
        sendJson(response, 403, { error: 'Origem da solicitacao nao autorizada.' });
        return;
      }

      if (method === 'GET' && url.pathname === '/api/health') {
        sendJson(response, 200, { status: 'ok', environment: 'DEMO', database: 'local' });
        return;
      }

      if (method === 'POST' && url.pathname === '/api/auth/login') {
        const body = await readJson<LoginBody>(request);
        const email = body.email?.trim().toLowerCase() ?? '';
        const password = body.password ?? '';
        const key = `${request.socket.remoteAddress ?? 'unknown'}:${email}`;
        if (!loginLimiter.consume(key)) {
          sendJson(response, 429, { error: 'Muitas tentativas. Aguarde antes de tentar novamente.' });
          return;
        }
        if (!email || password.length < 8) throw new AuthenticationError('Credenciais invalidas.');
        const result = auth.login(email, password, {
          ipAddress: request.socket.remoteAddress ?? 'unknown',
          userAgent: request.headers['user-agent'] ?? 'unknown'
        });
        loginLimiter.reset(key);
        response.setHeader('Set-Cookie', sessionCookie(result.token, config));
        audit(database, result.principal, 'LOGIN', 'SESSION', result.principal.sessionId, request);
        sendJson(response, 200, { user: publicPrincipal(result.principal), environment: 'DEMO' });
        return;
      }

      const cookies = parseCookies(request.headers.cookie);
      const principal = auth.authenticate(cookies[sessionCookieName]);
      if (!principal) {
        sendJson(response, 401, { error: 'Sessao ausente ou expirada.' });
        return;
      }
      if (principal.rotatedToken) response.setHeader('Set-Cookie', sessionCookie(principal.rotatedToken, config));
      if (unsafe && !auth.verifyCsrf(principal, headerValue(request.headers['x-csrf-token']))) {
        sendJson(response, 403, { error: 'Token CSRF invalido.' });
        return;
      }

      if (method === 'GET' && url.pathname === '/api/auth/me') {
        sendJson(response, 200, { user: publicPrincipal(principal), environment: 'DEMO' });
        return;
      }
      if (method === 'GET' && url.pathname === '/api/dashboard') {
        sendJson(response, 200, dashboardData(database, principal));
        return;
      }
      if (method === 'GET' && url.pathname === '/api/notifications') {
        sendJson(response, 200, { notifications: notificationData(database, principal) });
        return;
      }
      if (method === 'POST' && url.pathname === '/api/auth/logout') {
        auth.logout(principal.sessionId);
        audit(database, principal, 'LOGOUT', 'SESSION', principal.sessionId, request);
        response.setHeader('Set-Cookie', clearSessionCookie(config));
        sendEmpty(response);
        return;
      }
      if (method === 'GET' && url.pathname === '/api/admin/users') {
        requirePermission(principal, 'users.read');
        const users = database.prepare(`SELECT id,email,display_name,status,company_id,last_login_at,created_at
          FROM users ORDER BY display_name`).all();
        sendJson(response, 200, { users });
        return;
      }
      if (method === 'GET' && url.pathname === '/api/catalog/products') {
        requirePermission(principal, 'catalog.read');
        sendJson(response, 200, catalogData(database));
        return;
      }
      if (method === 'GET' && url.pathname === '/api/price-lists') {
        requirePermission(principal, 'prices.read');
        sendJson(response, 200, priceListData(database, principal));
        return;
      }
      if (method === 'GET' && url.pathname === '/api/prices') {
        requirePermission(principal, 'prices.read');
        sendJson(response, 200, priceData(database, principal, url.searchParams.get('priceListId'), url.searchParams.get('search') ?? ''));
        return;
      }
      if (method === 'POST' && url.pathname === '/api/prices/revisions') {
        requirePermission(principal, 'prices.write');
        const result = createPriceRevision(database, principal, await readJson<PriceRevisionBody>(request));
        audit(database, principal, 'PRICE_REVISION', 'PRICE', String((result as { id: string }).id), request);
        sendJson(response, 201, result);
        return;
      }
      if (method === 'GET' && url.pathname === '/api/inventory') {
        requirePermission(principal, 'inventory.read');
        sendJson(response, 200, inventoryData(database, url.searchParams.get('search') ?? '', url.searchParams.get('low') === '1'));
        return;
      }
      if (method === 'POST' && url.pathname === '/api/inventory/movements') {
        requirePermission(principal, 'inventory.write');
        const result = recordInventoryMovement(database, principal, await readJson<InventoryMovementBody>(request));
        audit(database, principal, 'INVENTORY_MOVEMENT', 'INVENTORY_ITEM', String((result as { inventoryItemId: string }).inventoryItemId), request);
        sendJson(response, 201, result);
        return;
      }
      if (method === 'GET' && url.pathname === '/api/customers') {
        requirePermission(principal, 'customers.read');
        sendJson(response, 200, customerData(database, url.searchParams.get('search') ?? ''));
        return;
      }
      if (method === 'POST' && url.pathname === '/api/customers') {
        requirePermission(principal, 'customers.write');
        const result = createCustomer(database, principal, await readJson<CustomerBody>(request));
        audit(database, principal, 'CUSTOMER_CREATE', 'CUSTOMER', String((result as { id: string }).id), request);
        sendJson(response, 201, result);
        return;
      }
      const customerMatch = url.pathname.match(/^\/api\/customers\/([^/]+)$/);
      if (method === 'PATCH' && customerMatch?.[1]) {
        requirePermission(principal, 'customers.write');
        const result = updateCustomer(database, principal, decodeURIComponent(customerMatch[1]), await readJson<CustomerBody>(request));
        audit(database, principal, 'CUSTOMER_UPDATE', 'CUSTOMER', String((result as { id: string }).id), request);
        sendJson(response, 200, result);
        return;
      }
      if (method === 'GET' && url.pathname === '/api/companies') {
        requirePermission(principal, 'companies.read');
        sendJson(response, 200, companyData(database, principal));
        return;
      }
      const approvalMatch = url.pathname.match(/^\/api\/companies\/([^/]+)\/approval$/);
      if (method === 'POST' && approvalMatch?.[1]) {
        requirePermission(principal, 'companies.approve');
        const result = transitionCompanyApproval(database, principal, decodeURIComponent(approvalMatch[1]), await readJson<CompanyApprovalBody>(request));
        audit(database, principal, 'COMPANY_APPROVAL', 'COMPANY', String((result as { companyId: string }).companyId), request);
        sendJson(response, 201, result);
        return;
      }
      if (method === 'GET' && url.pathname === '/api/requests') {
        requirePermission(principal, 'requests.read');
        sendJson(response, 200, requestData(database, principal));
        return;
      }
      if (method === 'POST' && url.pathname === '/api/requests') {
        requirePermission(principal, 'requests.write');
        const result = createRequest(database, principal, await readJson<RequestBody>(request));
        audit(database, principal, 'REQUEST_CREATE', 'REQUEST', String((result as { id: string }).id), request);
        sendJson(response, 201, result);
        return;
      }
      const requestStatusMatch = url.pathname.match(/^\/api\/requests\/([^/]+)\/status$/);
      if (method === 'POST' && requestStatusMatch?.[1]) {
        requirePermission(principal, 'requests.write');
        const result = transitionRequest(database, principal, decodeURIComponent(requestStatusMatch[1]), await readJson<RequestStatusBody>(request));
        audit(database, principal, 'REQUEST_STATUS', 'REQUEST', String((result as { id: string }).id), request);
        sendJson(response, 200, result);
        return;
      }
      if (method === 'GET' && url.pathname === '/api/conversations') {
        requirePermission(principal, 'messages.read');
        sendJson(response, 200, conversationData(database, principal));
        return;
      }
      if (method === 'POST' && url.pathname === '/api/conversations') {
        requirePermission(principal, 'messages.write');
        const result = createConversation(database, principal, await readJson<ConversationBody>(request));
        audit(database, principal, 'CONVERSATION_CREATE', 'CONVERSATION', String((result as { id: string }).id), request);
        sendJson(response, 201, result);
        return;
      }
      if (method === 'POST' && url.pathname === '/api/messages') {
        requirePermission(principal, 'messages.write');
        const result = createMessage(database, principal, await readJson<MessageBody>(request));
        audit(database, principal, 'MESSAGE_CREATE', 'MESSAGE', String((result as { id: string }).id), request);
        sendJson(response, 201, result);
        return;
      }

      sendJson(response, 404, { error: 'Rota nao encontrada.' });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        sendJson(response, 401, { error: 'Credenciais invalidas ou acesso temporariamente indisponivel.' });
        return;
      }
      if (error instanceof SyntaxError || (error instanceof Error && ['EMPTY_BODY', 'PAYLOAD_TOO_LARGE'].includes(error.message))) {
        sendJson(response, error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400, { error: 'Solicitacao invalida.' });
        return;
      }
      if (error instanceof Error && ['INVALID_PRICE_REVISION','INVALID_INVENTORY_MOVEMENT','INVALID_CUSTOMER','INVALID_COMPANY_APPROVAL','INVALID_REQUEST','INVALID_REQUEST_STATUS','INVALID_CONVERSATION','INVALID_MESSAGE'].includes(error.message)) {
        sendJson(response, 400, { error: 'Dados da operacao DEMO invalidos.' });
        return;
      }
      if (error instanceof Error && ['CUSTOMER_NOT_FOUND','COMPANY_NOT_FOUND','REQUEST_NOT_FOUND','CONVERSATION_NOT_FOUND'].includes(error.message)) {
        sendJson(response, 404, { error: 'Registro DEMO nao encontrado.' });
        return;
      }
      if (error instanceof Error && error.message === 'CUSTOMER_EXISTS') {
        sendJson(response, 409, { error: 'Ja existe um cliente DEMO com este e-mail.' });
        return;
      }
      if (error instanceof Error && error.message === 'INSUFFICIENT_INVENTORY') {
        sendJson(response, 409, { error: 'Saldo de estoque insuficiente para esta operacao DEMO.' });
        return;
      }
      if (error instanceof Error && error.message.startsWith('FORBIDDEN:')) {
        sendJson(response, 403, { error: 'Permissao insuficiente.' });
        return;
      }
      console.error('Falha interna da plataforma DEMO:', error instanceof Error ? error.message : 'erro desconhecido');
      sendJson(response, 500, { error: 'Falha interna da plataforma DEMO.' });
    }
  }

  return { server: createServer((request, response) => void handler(request, response)), auth };
}
