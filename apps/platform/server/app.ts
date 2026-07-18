import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { PlatformDatabase } from '../database/db.js';
import type { PlatformConfig } from '../src/config.js';
import { AuthService, AuthenticationError } from './auth.js';
import { clearSessionCookie, parseCookies, sessionCookie, sessionCookieName } from './cookies.js';
import {
  convertQuoteToOrder,
  createQuote,
  createReservation,
  orderData,
  quoteData,
  releaseReservation,
  transitionOrder,
  transitionQuote,
  updateShipment
} from './commerce.js';
import { conversationData, createConversation, createMessage, createRequest, requestData, transitionRequest } from './communications.js';
import { companyData, createCustomer, customerData, transitionCompanyApproval, updateCustomer } from './crm.js';
import { dashboardData } from './dashboard.js';
import { createStorage } from './documents.js';
import { integrationProviders } from './integrations.js';
import { observeRequest, operationalHealth } from './observability.js';
import {
  auditData,
  markAllNotificationsRead,
  markNotificationRead,
  notificationData,
  notifyCompany,
  notifyInternal,
  recordAudit,
  refreshOperationalNotifications,
  reportsCsv,
  reportsData,
  settingsData,
  updateSetting
} from './governance.js';
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
interface QuoteBody {
  readonly companyId?: string | null;
  readonly customerId?: string | null;
  readonly variantId?: string;
  readonly quantity?: number;
  readonly unitPriceCents?: number;
  readonly notes?: string;
}
interface CommerceStatusBody { readonly status?: string }
interface ConvertQuoteBody { readonly deliveryMethod?: string; readonly addressDemo?: string; readonly carrierDemo?: string }
interface ReservationBody { readonly orderId?: string; readonly inventoryItemId?: string; readonly quantity?: number; readonly expiresAt?: string }
interface ShipmentBody {
  readonly orderId?: string;
  readonly status?: string;
  readonly method?: string;
  readonly carrierDemo?: string;
  readonly trackingDemo?: string;
  readonly shippingCostCents?: number;
}
interface SettingBody { readonly value?: unknown }

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

function auditContext(request: IncomingMessage, after?: unknown, before?: unknown, companyId?: string | null): object {
  return {
    before,
    after,
    companyId,
    ipAddress: request.socket.remoteAddress ?? 'unknown',
    userAgent: request.headers['user-agent'] ?? 'unknown'
  };
}

function companyFor(database: PlatformDatabase, entityType: 'QUOTE' | 'ORDER' | 'CONVERSATION', entityId: string): string | null {
  const table = entityType === 'QUOTE' ? 'quotes' : entityType === 'ORDER' ? 'orders' : 'conversations';
  const row = database.prepare(`SELECT company_id FROM ${table} WHERE id=?`).get(entityId);
  return row?.company_id ? String(row.company_id) : null;
}

function sensitiveWrite(pathname: string): boolean {
  return /^\/api\/(?:admin|settings|prices\/revisions|inventory\/movements|reservations|shipments)(?:\/|$)/.test(pathname)
    || /^\/api\/companies\/[^/]+\/approval$/.test(pathname)
    || /^\/api\/quotes\/[^/]+\/(?:status|convert)$/.test(pathname)
    || /^\/api\/orders\/[^/]+\/status$/.test(pathname);
}

export function createPlatformApplication(database: PlatformDatabase, config: PlatformConfig): PlatformApplication {
  const auth = new AuthService(database, config);
  const storage = createStorage(config);
  const providers = integrationProviders(config);
  const loginLimiter = new RateLimiter(5, 15 * 60 * 1000);
  const writeLimiter = new RateLimiter(120, 60 * 1000);
  const sensitiveLimiter = new RateLimiter(30, 60 * 1000);
  const messageLimiter = new RateLimiter(30, 60 * 1000);

  async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
    applySecurityHeaders(response);
    const method = request.method ?? 'GET';
    const url = new URL(request.url ?? '/', config.allowedOrigin);
    const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    const requestId = headerValue(request.headers['x-request-id'])?.slice(0, 100) || randomUUID();
    const requestStartedAt = Date.now();
    response.setHeader('X-Request-Id', requestId);
    response.once('finish', () => observeRequest(response.statusCode, Date.now() - requestStartedAt, url.pathname));

    try {
      if (method === 'GET' && serveStatic(url.pathname, response, config)) return;

      if (unsafe && !validUnsafeOrigin(headerValue(request.headers.origin), config)) {
        sendJson(response, 403, { error: 'Origem da solicitacao nao autorizada.' });
        return;
      }

      if (method === 'GET' && url.pathname === '/api/live') {
        sendJson(response, 200, { status: 'alive', environment: config.environment, requestId });
        return;
      }
      if (method === 'GET' && (url.pathname === '/api/ready' || url.pathname === '/api/health')) {
        const health = operationalHealth(database, config, storage, providers) as { ready: boolean };
        sendJson(response, health.ready ? 200 : 503, { status: health.ready ? 'ready' : 'not_ready', environment: config.environment, requestId });
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
        recordAudit(database, result.principal, 'LOGIN', 'SESSION', result.principal.sessionId, auditContext(request));
        sendJson(response, 200, { user: publicPrincipal(result.principal), environment: config.environment });
        return;
      }

      const cookies = parseCookies(request.headers.cookie);
      const principal = auth.authenticate(cookies[sessionCookieName(config)]);
      if (!principal) {
        sendJson(response, 401, { error: 'Sessao ausente ou expirada.' });
        return;
      }
      if (principal.rotatedToken) response.setHeader('Set-Cookie', sessionCookie(principal.rotatedToken, config));
      if (unsafe && !auth.verifyCsrf(principal, headerValue(request.headers['x-csrf-token']))) {
        sendJson(response, 403, { error: 'Token CSRF invalido.' });
        return;
      }
      if (unsafe) {
        const limiter = url.pathname === '/api/messages' || url.pathname === '/api/conversations'
          ? messageLimiter
          : sensitiveWrite(url.pathname) ? sensitiveLimiter : writeLimiter;
        const key = `${principal.userId}:${url.pathname}`;
        if (!limiter.consume(key)) {
          sendJson(response, 429, { error: 'Limite temporario de operacoes atingido. Aguarde e tente novamente.' });
          return;
        }
      }

      if (method === 'GET' && url.pathname === '/api/auth/me') {
        sendJson(response, 200, { user: publicPrincipal(principal), environment: config.environment });
        return;
      }
      if (method === 'GET' && url.pathname === '/api/dashboard') {
        refreshOperationalNotifications(database);
        sendJson(response, 200, dashboardData(database, principal));
        return;
      }
      if (method === 'GET' && url.pathname === '/api/notifications') {
        refreshOperationalNotifications(database);
        sendJson(response, 200, notificationData(database, principal));
        return;
      }
      const notificationReadMatch = url.pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
      if (method === 'POST' && notificationReadMatch?.[1]) {
        sendJson(response, 200, markNotificationRead(database, principal, decodeURIComponent(notificationReadMatch[1])));
        return;
      }
      if (method === 'POST' && url.pathname === '/api/notifications/read-all') {
        sendJson(response, 200, markAllNotificationsRead(database, principal));
        return;
      }
      if (method === 'GET' && url.pathname === '/api/audit') {
        requirePermission(principal, 'audit.read');
        sendJson(response, 200, auditData(database, principal, {
          from: url.searchParams.get('from'), to: url.searchParams.get('to'), userId: url.searchParams.get('userId'),
          role: url.searchParams.get('role'), action: url.searchParams.get('action'),
          entityType: url.searchParams.get('entityType'), companyId: url.searchParams.get('companyId')
        }));
        return;
      }
      if (method === 'GET' && url.pathname === '/api/admin/diagnostics') {
        requirePermission(principal, 'settings.read');
        sendJson(response, 200, operationalHealth(database, config, storage, providers));
        return;
      }
      if (method === 'GET' && url.pathname === '/api/settings') {
        requirePermission(principal, 'settings.read');
        sendJson(response, 200, settingsData(database));
        return;
      }
      const settingMatch = url.pathname.match(/^\/api\/settings\/([^/]+)$/);
      if (method === 'PATCH' && settingMatch?.[1]) {
        requirePermission(principal, 'settings.write');
        const result = updateSetting(database, principal, decodeURIComponent(settingMatch[1]), (await readJson<SettingBody>(request)).value);
        recordAudit(database, principal, 'SETTINGS_CHANGE', 'SETTING', result.key, auditContext(request, { value: result.value }, { value: result.previousValue }));
        sendJson(response, 200, result);
        return;
      }
      if (method === 'GET' && url.pathname === '/api/reports') {
        requirePermission(principal, 'reports.read');
        sendJson(response, 200, reportsData(database, principal));
        return;
      }
      if (method === 'GET' && url.pathname === '/api/reports.csv') {
        requirePermission(principal, 'reports.read');
        const csv = reportsCsv(database, principal);
        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/csv; charset=utf-8');
        response.setHeader('Content-Disposition', 'attachment; filename="relatorio-celulars-demo.csv"');
        response.end(csv);
        return;
      }
      if (method === 'POST' && url.pathname === '/api/auth/logout') {
        auth.logout(principal.sessionId);
        recordAudit(database, principal, 'LOGOUT', 'SESSION', principal.sessionId, auditContext(request));
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
        recordAudit(database, principal, 'PRICE_CHANGE', 'PRICE', String((result as { id: string }).id), auditContext(request, result));
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
        recordAudit(database, principal, 'INVENTORY_MOVEMENT', 'INVENTORY_ITEM', String((result as { inventoryItemId: string }).inventoryItemId), auditContext(request, result));
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
        recordAudit(database, principal, 'CREATE', 'CUSTOMER', String((result as { id: string }).id), auditContext(request, result));
        sendJson(response, 201, result);
        return;
      }
      const customerMatch = url.pathname.match(/^\/api\/customers\/([^/]+)$/);
      if (method === 'PATCH' && customerMatch?.[1]) {
        requirePermission(principal, 'customers.write');
        const customerId = decodeURIComponent(customerMatch[1]);
        const before = database.prepare('SELECT name,email,country,language,source,status,notes,company_id FROM customers WHERE id=?').get(customerId);
        const result = updateCustomer(database, principal, customerId, await readJson<CustomerBody>(request));
        recordAudit(database, principal, 'UPDATE', 'CUSTOMER', String((result as { id: string }).id), auditContext(request, result, before));
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
        const companyResult = result as { companyId: string; fromStatus: string; toStatus: string };
        const action = companyResult.toStatus === 'APPROVED' ? 'APPROVE' : companyResult.toStatus === 'REJECTED' ? 'REJECT' : companyResult.toStatus === 'SUSPENDED' ? 'SUSPEND' : 'UPDATE';
        recordAudit(database, principal, action, 'COMPANY', companyResult.companyId, auditContext(request, result, { status: companyResult.fromStatus }, companyResult.companyId));
        notifyCompany(database, companyResult.companyId, {
          type: `COMPANY_${companyResult.toStatus}`, title: `Empresa DEMO: ${companyResult.toStatus}`,
          body: `O status da empresa foi atualizado para ${companyResult.toStatus}.`, entityType: 'COMPANY', entityId: companyResult.companyId
        });
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
        const requestResult = result as { id: string; assignedUserId?: string | null; companyId?: string | null };
        recordAudit(database, principal, 'CREATE', 'REQUEST', requestResult.id, auditContext(request, result, undefined, requestResult.companyId));
        notifyInternal(database, { type: 'NEW_REQUEST', title: 'Nova solicitacao DEMO', body: `Solicitacao ${requestResult.id} criada.`, entityType: 'REQUEST', entityId: requestResult.id }, requestResult.assignedUserId);
        sendJson(response, 201, result);
        return;
      }
      const requestStatusMatch = url.pathname.match(/^\/api\/requests\/([^/]+)\/status$/);
      if (method === 'POST' && requestStatusMatch?.[1]) {
        requirePermission(principal, 'requests.write');
        const result = transitionRequest(database, principal, decodeURIComponent(requestStatusMatch[1]), await readJson<RequestStatusBody>(request));
        const requestResult = result as { id: string; assignedUserId?: string | null; fromStatus?: string; toStatus?: string };
        recordAudit(database, principal, 'UPDATE', 'REQUEST', requestResult.id, auditContext(request, result, { status: requestResult.fromStatus }));
        notifyInternal(database, { type: 'REQUEST_ASSIGNED', title: 'Solicitacao DEMO atribuida', body: `Solicitacao ${requestResult.id}: ${requestResult.toStatus ?? 'atualizada'}.`, entityType: 'REQUEST', entityId: requestResult.id }, requestResult.assignedUserId);
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
        recordAudit(database, principal, 'CREATE', 'CONVERSATION', String((result as { id: string }).id), auditContext(request, result, undefined, (result as { companyId?: string | null }).companyId));
        sendJson(response, 201, result);
        return;
      }
      if (method === 'POST' && url.pathname === '/api/messages') {
        requirePermission(principal, 'messages.write');
        const result = createMessage(database, principal, await readJson<MessageBody>(request));
        const messageResult = result as { id: string; conversationId: string };
        const messageCompanyId = companyFor(database, 'CONVERSATION', messageResult.conversationId);
        recordAudit(database, principal, 'MESSAGE_SENT', 'MESSAGE', messageResult.id, auditContext(request, { id: messageResult.id, conversationId: messageResult.conversationId }, undefined, messageCompanyId));
        if (messageCompanyId) notifyCompany(database, messageCompanyId, { type: 'NEW_MESSAGE', title: 'Nova mensagem DEMO', body: 'Ha uma nova mensagem interna na plataforma.', entityType: 'CONVERSATION', entityId: messageResult.conversationId });
        else notifyInternal(database, { type: 'NEW_MESSAGE', title: 'Nova mensagem DEMO', body: 'Ha uma nova mensagem interna na plataforma.', entityType: 'CONVERSATION', entityId: messageResult.conversationId });
        sendJson(response, 201, result);
        return;
      }
      if (method === 'GET' && url.pathname === '/api/quotes') {
        requirePermission(principal, 'quotes.read');
        sendJson(response, 200, quoteData(database, principal));
        return;
      }
      if (method === 'POST' && url.pathname === '/api/quotes') {
        requirePermission(principal, 'quotes.write');
        const result = createQuote(database, principal, await readJson<QuoteBody>(request));
        const quoteResult = result as { id: string; companyId?: string | null };
        recordAudit(database, principal, 'CREATE', 'QUOTE', quoteResult.id, auditContext(request, result, undefined, quoteResult.companyId));
        sendJson(response, 201, result);
        return;
      }
      const quoteStatusMatch = url.pathname.match(/^\/api\/quotes\/([^/]+)\/status$/);
      if (method === 'POST' && quoteStatusMatch?.[1]) {
        requirePermission(principal, 'quotes.write');
        const result = transitionQuote(database, principal, decodeURIComponent(quoteStatusMatch[1]), await readJson<CommerceStatusBody>(request));
        const quoteResult = result as { id: string; fromStatus?: string; toStatus?: string };
        const quoteCompanyId = companyFor(database, 'QUOTE', quoteResult.id);
        const quoteAction: Record<string, string> = { SENT: 'QUOTE_SENT', VIEWED: 'QUOTE_VIEWED', ACCEPTED: 'QUOTE_ACCEPTED', REJECTED: 'QUOTE_REJECTED' };
        const action = quoteAction[quoteResult.toStatus ?? ''] ?? 'UPDATE';
        recordAudit(database, principal, action, 'QUOTE', quoteResult.id, auditContext(request, result, { status: quoteResult.fromStatus }, quoteCompanyId));
        if (quoteCompanyId) notifyCompany(database, quoteCompanyId, { type: action, title: `Cotacao DEMO: ${quoteResult.toStatus ?? 'atualizada'}`, body: `A cotacao ${quoteResult.id} foi atualizada.`, entityType: 'QUOTE', entityId: quoteResult.id });
        sendJson(response, 200, result);
        return;
      }
      const quoteConvertMatch = url.pathname.match(/^\/api\/quotes\/([^/]+)\/convert$/);
      if (method === 'POST' && quoteConvertMatch?.[1]) {
        requirePermission(principal, 'orders.write');
        const result = convertQuoteToOrder(database, principal, decodeURIComponent(quoteConvertMatch[1]), await readJson<ConvertQuoteBody>(request));
        const orderResult = result as { id: string; companyId?: string | null; quoteId?: string };
        recordAudit(database, principal, 'QUOTE_CONVERTED', 'QUOTE', orderResult.quoteId ?? decodeURIComponent(quoteConvertMatch[1]), auditContext(request, result, undefined, orderResult.companyId));
        recordAudit(database, principal, 'ORDER_CREATED', 'ORDER', orderResult.id, auditContext(request, result, undefined, orderResult.companyId));
        if (orderResult.companyId) notifyCompany(database, orderResult.companyId, { type: 'ORDER_CREATED', title: 'Pedido DEMO criado', body: `O pedido ${orderResult.id} foi criado.`, entityType: 'ORDER', entityId: orderResult.id });
        sendJson(response, 201, result);
        return;
      }
      if (method === 'GET' && url.pathname === '/api/orders') {
        requirePermission(principal, 'orders.read');
        sendJson(response, 200, orderData(database, principal));
        return;
      }
      const orderStatusMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/status$/);
      if (method === 'POST' && orderStatusMatch?.[1]) {
        requirePermission(principal, 'orders.write');
        const result = transitionOrder(database, principal, decodeURIComponent(orderStatusMatch[1]), await readJson<CommerceStatusBody>(request));
        const orderResult = result as { id: string; fromStatus?: string; toStatus?: string };
        const orderCompanyId = companyFor(database, 'ORDER', orderResult.id);
        recordAudit(database, principal, 'ORDER_STATUS_CHANGE', 'ORDER', orderResult.id, auditContext(request, result, { status: orderResult.fromStatus }, orderCompanyId));
        if (orderCompanyId) notifyCompany(database, orderCompanyId, { type: 'ORDER_UPDATED', title: `Pedido DEMO: ${orderResult.toStatus ?? 'atualizado'}`, body: `O pedido ${orderResult.id} foi atualizado.`, entityType: 'ORDER', entityId: orderResult.id });
        sendJson(response, 200, result);
        return;
      }
      if (method === 'POST' && url.pathname === '/api/reservations') {
        requirePermission(principal, 'inventory.write');
        const result = createReservation(database, principal, await readJson<ReservationBody>(request));
        const reservationResult = result as { id: string; orderId?: string };
        const reservationCompanyId = reservationResult.orderId ? companyFor(database, 'ORDER', reservationResult.orderId) : null;
        recordAudit(database, principal, 'RESERVATION', 'RESERVATION', reservationResult.id, auditContext(request, result, undefined, reservationCompanyId));
        if (reservationCompanyId) notifyCompany(database, reservationCompanyId, { type: 'RESERVATION_CREATED', title: 'Reserva DEMO criada', body: `Reserva ${reservationResult.id} criada.`, entityType: 'RESERVATION', entityId: reservationResult.id });
        sendJson(response, 201, result);
        return;
      }
      const reservationReleaseMatch = url.pathname.match(/^\/api\/reservations\/([^/]+)\/release$/);
      if (method === 'POST' && reservationReleaseMatch?.[1]) {
        requirePermission(principal, 'inventory.write');
        const result = releaseReservation(database, principal, decodeURIComponent(reservationReleaseMatch[1]));
        const reservationResult = result as { id: string; orderId?: string };
        const reservationCompanyId = reservationResult.orderId ? companyFor(database, 'ORDER', reservationResult.orderId) : null;
        recordAudit(database, principal, 'RELEASE', 'RESERVATION', reservationResult.id, auditContext(request, result, undefined, reservationCompanyId));
        if (reservationCompanyId) notifyCompany(database, reservationCompanyId, { type: 'RESERVATION_RELEASED', title: 'Reserva DEMO liberada', body: `Reserva ${reservationResult.id} liberada.`, entityType: 'RESERVATION', entityId: reservationResult.id });
        sendJson(response, 200, result);
        return;
      }
      if (method === 'POST' && url.pathname === '/api/shipments') {
        requirePermission(principal, 'orders.write');
        const result = updateShipment(database, principal, await readJson<ShipmentBody>(request));
        const shipmentResult = result as { id?: string; orderId: string; status?: string };
        const shipmentCompanyId = companyFor(database, 'ORDER', shipmentResult.orderId);
        recordAudit(database, principal, 'SHIPMENT_STATUS_CHANGE', 'SHIPMENT', shipmentResult.id ?? shipmentResult.orderId, auditContext(request, result, undefined, shipmentCompanyId));
        if (shipmentCompanyId) notifyCompany(database, shipmentCompanyId, { type: 'SHIPMENT_UPDATED', title: 'Remessa DEMO atualizada', body: `A remessa do pedido ${shipmentResult.orderId} foi atualizada.`, entityType: 'ORDER', entityId: shipmentResult.orderId });
        sendJson(response, 200, result);
        return;
      }

      sendJson(response, 404, { error: 'Rota nao encontrada.' });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        sendJson(response, 401, { error: 'Credenciais invalidas ou acesso temporariamente indisponivel.' });
        return;
      }
      if (error instanceof Error && error.message === 'UNSUPPORTED_MEDIA_TYPE') {
        sendJson(response, 415, { error: 'O corpo da solicitacao deve usar application/json.' });
        return;
      }
      if (error instanceof SyntaxError || (error instanceof Error && ['EMPTY_BODY', 'PAYLOAD_TOO_LARGE'].includes(error.message))) {
        sendJson(response, error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400, { error: 'Solicitacao invalida.' });
        return;
      }
      if (error instanceof Error && ['INVALID_PRICE_REVISION','INVALID_INVENTORY_MOVEMENT','INVALID_CUSTOMER','INVALID_COMPANY_APPROVAL','INVALID_REQUEST','INVALID_REQUEST_STATUS','INVALID_CONVERSATION','INVALID_MESSAGE','INVALID_QUOTE','INVALID_QUOTE_STATUS','INVALID_ORDER','INVALID_ORDER_STATUS','INVALID_RESERVATION','INVALID_SHIPMENT','INVALID_SHIPMENT_STATUS','INVALID_SETTING'].includes(error.message)) {
        sendJson(response, 400, { error: 'Dados da operacao DEMO invalidos.', code: error.message });
        return;
      }
      if (error instanceof Error && ['CUSTOMER_NOT_FOUND','COMPANY_NOT_FOUND','REQUEST_NOT_FOUND','CONVERSATION_NOT_FOUND','QUOTE_NOT_FOUND','ORDER_NOT_FOUND','RESERVATION_NOT_FOUND','NOTIFICATION_NOT_FOUND','SETTING_NOT_FOUND'].includes(error.message)) {
        sendJson(response, 404, { error: 'Registro DEMO nao encontrado.' });
        return;
      }
      if (error instanceof Error && error.message === 'CUSTOMER_EXISTS') {
        sendJson(response, 409, { error: 'Ja existe um cliente DEMO com este e-mail.' });
        return;
      }
      if (error instanceof Error && error.message === 'INSUFFICIENT_INVENTORY') {
        sendJson(response, 409, { error: 'Saldo de estoque insuficiente para esta operacao DEMO.', code: error.message });
        return;
      }
      if (error instanceof Error && error.message === 'INCOMPLETE_RESERVATION') {
        sendJson(response, 409, { error: 'O pedido precisa ter reserva completa antes de avancar.', code: error.message });
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
