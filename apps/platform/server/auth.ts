import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { PlatformDatabase } from '../database/db.js';
import type { PlatformConfig } from '../src/config.js';
import { verifyPassword } from './password.js';
import type { Principal } from './types.js';

interface LoginContext {
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly now?: Date;
}

interface UserRow {
  readonly id: string;
  readonly email: string;
  readonly display_name: string;
  readonly password_hash: string;
  readonly password_salt: string;
  readonly status: string;
  readonly company_id: string | null;
  readonly failed_login_count: number;
  readonly locked_until: string | null;
}

interface SessionRow {
  readonly id: string;
  readonly user_id: string;
  readonly csrf_secret: string;
  readonly expires_at: string;
  readonly rotated_at: string;
  readonly email: string;
  readonly display_name: string;
  readonly company_id: string | null;
  readonly status: string;
}

export interface LoginResult {
  readonly token: string;
  readonly principal: Principal;
}

export class AuthenticationError extends Error {}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export class AuthService {
  constructor(private readonly database: PlatformDatabase, private readonly config: PlatformConfig) {}

  private tokenHash(token: string): string {
    return createHash('sha256').update(`${this.config.sessionSecret}:${token}`).digest('hex');
  }

  private rolesAndPermissions(userId: string): { roles: string[]; permissions: string[] } {
    const roles = this.database.prepare(`SELECT r.code FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ? ORDER BY r.code`).all(userId).map((row) => String(row.code));
    const permissions = this.database.prepare(`SELECT DISTINCT p.code FROM permissions p
      JOIN role_permissions rp ON rp.permission_id = p.id
      JOIN user_roles ur ON ur.role_id = rp.role_id
      WHERE ur.user_id = ? ORDER BY p.code`).all(userId).map((row) => String(row.code));
    return { roles, permissions };
  }

  private principal(row: SessionRow, rotatedToken?: string): Principal {
    const access = this.rolesAndPermissions(row.user_id);
    return {
      sessionId: row.id,
      userId: row.user_id,
      email: row.email,
      displayName: row.display_name,
      companyId: row.company_id,
      roles: access.roles,
      permissions: access.permissions,
      csrfToken: row.csrf_secret,
      ...(rotatedToken ? { rotatedToken } : {})
    };
  }

  login(emailInput: string, password: string, context: LoginContext): LoginResult {
    const email = emailInput.trim().toLowerCase();
    const now = context.now ?? new Date();
    const user = this.database.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
    const locked = user?.locked_until ? Date.parse(user.locked_until) > now.getTime() : false;
    const passwordMatches = user ? verifyPassword(password, user.password_salt, user.password_hash) : false;

    if (!user || user.status !== 'ACTIVE' || locked || !passwordMatches) {
      if (user) {
        const failures = user.failed_login_count + 1;
        const lockedUntil = failures >= 5 ? new Date(now.getTime() + 15 * 60 * 1000).toISOString() : user.locked_until;
        this.database.prepare('UPDATE users SET failed_login_count = ?, locked_until = ?, updated_at = ? WHERE id = ?')
          .run(failures, lockedUntil, now.toISOString(), user.id);
      }
      throw new AuthenticationError('Credenciais invalidas ou acesso temporariamente indisponivel.');
    }

    const token = randomBytes(32).toString('base64url');
    const sessionId = randomUUID();
    const csrf = randomBytes(24).toString('base64url');
    const expiresAt = new Date(now.getTime() + this.config.sessionTtlMinutes * 60 * 1000).toISOString();
    this.database.prepare(`INSERT INTO sessions
      (id,user_id,token_hash,csrf_secret,ip_address,user_agent,expires_at,created_at,rotated_at)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(sessionId, user.id, this.tokenHash(token), csrf, context.ipAddress, context.userAgent, expiresAt, now.toISOString(), now.toISOString());
    this.database.prepare('UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = ?, updated_at = ? WHERE id = ?')
      .run(now.toISOString(), now.toISOString(), user.id);
    const sessionRow = this.database.prepare(`SELECT s.id,s.user_id,s.csrf_secret,s.expires_at,s.rotated_at,
      u.email,u.display_name,u.company_id,u.status FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=?`).get(sessionId) as unknown as SessionRow;
    return { token, principal: this.principal(sessionRow) };
  }

  authenticate(token: string | undefined, now = new Date()): Principal | null {
    if (!token) return null;
    const row = this.database.prepare(`SELECT s.id,s.user_id,s.csrf_secret,s.expires_at,s.rotated_at,
      u.email,u.display_name,u.company_id,u.status FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.token_hash=? AND s.revoked_at IS NULL`).get(this.tokenHash(token)) as SessionRow | undefined;
    if (!row || row.status !== 'ACTIVE') return null;
    if (Date.parse(row.expires_at) <= now.getTime()) {
      this.database.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ?').run(now.toISOString(), row.id);
      return null;
    }
    const shouldRotate = now.getTime() - Date.parse(row.rotated_at) >= this.config.sessionRotationMinutes * 60 * 1000;
    if (!shouldRotate) return this.principal(row);
    const rotatedToken = randomBytes(32).toString('base64url');
    this.database.prepare('UPDATE sessions SET token_hash = ?, rotated_at = ? WHERE id = ?')
      .run(this.tokenHash(rotatedToken), now.toISOString(), row.id);
    return this.principal(row, rotatedToken);
  }

  verifyCsrf(principal: Principal, token: string | undefined): boolean {
    return Boolean(token && safeEqual(principal.csrfToken, token));
  }

  logout(sessionId: string, now = new Date()): void {
    this.database.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL').run(now.toISOString(), sessionId);
  }
}
