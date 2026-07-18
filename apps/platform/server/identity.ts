import { randomUUID } from 'node:crypto';
import type { PlatformDatabase } from '../database/db.js';
import type { Principal } from './types.js';

function requireAdmin(actor: Principal): void {
  if (!actor.permissions.includes('users.write')) throw new Error('FORBIDDEN:users.write');
}

export class IdentityGovernanceService {
  constructor(private readonly database: PlatformDatabase) {}

  createTeam(actor: Principal, input: { name: string; companyId?: string | null }, now = new Date()): object {
    requireAdmin(actor);
    const name = input.name.trim();
    if (name.length < 2) throw new Error('INVALID_TEAM');
    const id = randomUUID();
    this.database.prepare('INSERT INTO teams (id,name,company_id,active,created_at,updated_at) VALUES (?,?,?,1,?,?)')
      .run(id, name, input.companyId ?? null, now.toISOString(), now.toISOString());
    return { id, name, companyId: input.companyId ?? null, active: true };
  }

  addMember(actor: Principal, teamId: string, input: { userId: string; memberRole?: string; accessExpiresAt?: string | null }, now = new Date()): object {
    requireAdmin(actor);
    const team = this.database.prepare('SELECT company_id FROM teams WHERE id=? AND active=1').get(teamId);
    const user = this.database.prepare('SELECT company_id FROM users WHERE id=? AND status=\'ACTIVE\'').get(input.userId);
    if (!team || !user) throw new Error('TEAM_OR_USER_NOT_FOUND');
    if (team.company_id && team.company_id !== user.company_id) throw new Error('COMPANY_SCOPE_MISMATCH');
    const role = input.memberRole === 'LEAD' ? 'LEAD' : 'MEMBER';
    if (input.accessExpiresAt && Number.isNaN(Date.parse(input.accessExpiresAt))) throw new Error('INVALID_ACCESS_EXPIRY');
    this.database.prepare(`INSERT INTO team_members (team_id,user_id,member_role,access_expires_at,created_at)
      VALUES (?,?,?,?,?) ON CONFLICT(team_id,user_id) DO UPDATE SET member_role=excluded.member_role,access_expires_at=excluded.access_expires_at`)
      .run(teamId, input.userId, role, input.accessExpiresAt ?? null, now.toISOString());
    return { teamId, userId: input.userId, memberRole: role, accessExpiresAt: input.accessExpiresAt ?? null };
  }

  teams(actor: Principal, now = new Date()): object {
    const admin = actor.permissions.includes('users.read');
    const rows = admin
      ? this.database.prepare('SELECT id,name,company_id,active,created_at,updated_at FROM teams ORDER BY name').all()
      : this.database.prepare(`SELECT t.id,t.name,t.company_id,t.active,t.created_at,t.updated_at
          FROM teams t JOIN team_members tm ON tm.team_id=t.id
          WHERE tm.user_id=? AND (tm.access_expires_at IS NULL OR tm.access_expires_at>?) ORDER BY t.name`).all(actor.userId, now.toISOString());
    return { teams: rows };
  }

  publishTerms(actor: Principal, input: { version: string; title: string; effectiveAt: string }, now = new Date()): object {
    requireAdmin(actor);
    if (!input.version.trim() || input.title.trim().length < 3 || Number.isNaN(Date.parse(input.effectiveAt))) throw new Error('INVALID_TERMS');
    const id = randomUUID();
    this.database.exec('BEGIN IMMEDIATE');
    try {
      this.database.prepare('UPDATE terms_versions SET active=0 WHERE active=1').run();
      this.database.prepare('INSERT INTO terms_versions (id,version,title,effective_at,active,created_at) VALUES (?,?,?,?,1,?)')
        .run(id, input.version.trim(), input.title.trim(), input.effectiveAt, now.toISOString());
      this.database.exec('COMMIT');
      return { id, version: input.version.trim(), active: true };
    } catch (error) { this.database.exec('ROLLBACK'); throw error; }
  }

  recordConsent(actor: Principal, input: { termsVersionId: string; consentType: string; granted: boolean; ipAddress?: string; userAgent?: string }, now = new Date()): object {
    const terms = this.database.prepare('SELECT id FROM terms_versions WHERE id=? AND active=1 AND effective_at<=?').get(input.termsVersionId, now.toISOString());
    if (!terms || input.consentType.trim().length < 2) throw new Error('INVALID_CONSENT');
    const id = randomUUID();
    this.database.prepare(`INSERT INTO user_consents (id,user_id,terms_version_id,consent_type,granted,ip_address,user_agent,created_at)
      VALUES (?,?,?,?,?,?,?,?)`).run(id, actor.userId, input.termsVersionId, input.consentType.trim(), input.granted ? 1 : 0, input.ipAddress ?? null, input.userAgent ?? null, now.toISOString());
    if (input.granted) this.database.prepare('UPDATE users SET terms_accepted_at=?,updated_at=? WHERE id=?').run(now.toISOString(), now.toISOString(), actor.userId);
    return { id, granted: input.granted, termsVersionId: input.termsVersionId };
  }
}
