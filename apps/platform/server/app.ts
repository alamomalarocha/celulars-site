import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { PlatformDatabase } from '../database/db.js';
import type { PlatformConfig } from '../src/config.js';
import { AuthService, AuthenticationError } from './auth.js';
import { clearSessionCookie, parseCookies, sessionCookie, sessionCookieName } from './cookies.js';
import { readJson, sendEmpty, sendJson } from './http.js';
import { RateLimiter } from './rate-limit.js';
import { requirePermission } from './rbac.js';
import { applySecurityHeaders, validUnsafeOrigin } from './security.js';
import type { Principal } from './types.js';

interface LoginBody {
  readonly email?: string;
  readonly password?: string;
}

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
        const products = database.prepare(`SELECT id,canonical_key,model_name,year,product_type,demo_active
          FROM products ORDER BY year DESC, model_name`).all();
        sendJson(response, 200, { products });
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
