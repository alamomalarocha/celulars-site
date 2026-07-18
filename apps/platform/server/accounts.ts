import { createCipheriv, createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { PlatformDatabase } from '../database/db.js';
import type { PlatformConfig } from '../src/config.js';
import { hashPassword } from './password.js';
import type { Principal } from './types.js';
import { decryptedSecret, mfaEnabled, totpCode, verifyMfa } from './mfa.js';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 30 * 60 * 1000;

function digest(config: PlatformConfig, value: string): string {
  return createHash('sha256').update(`${config.sessionSecret}:${value}`).digest('hex');
}
function randomToken(): string { return randomBytes(32).toString('base64url'); }
function base32(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = 0; let value = 0; let output = '';
  for (const byte of buffer) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { output += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31]; return output;
}
function cryptKey(config: PlatformConfig): Buffer { return createHash('sha256').update(`mfa:${config.sessionSecret}`).digest(); }
function encrypt(config: PlatformConfig, value: string): string {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', cryptKey(config), iv); const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}
export class AccountLifecycleService {
  constructor(private readonly database: PlatformDatabase, private readonly config: PlatformConfig) {}
  invite(actor: Principal, input: { email: string; displayName: string; roleId: string; companyId?: string | null }, now = new Date()): { invitationId: string; token: string } {
    if (!actor.permissions.includes('users.write')) throw new Error('FORBIDDEN:users.write');
    const email = input.email.trim().toLowerCase(); if (!email.includes('@') || input.displayName.trim().length < 2) throw new Error('INVALID_INVITATION');
    if (this.database.prepare('SELECT id FROM users WHERE email=?').get(email)) throw new Error('USER_EXISTS');
    const token = randomToken(); const invitationId = randomUUID(); const userId = randomUUID(); const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS).toISOString();
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const placeholder = hashPassword(randomToken());
      this.database.prepare(`INSERT INTO users (id,email,display_name,password_hash,password_salt,status,company_id,must_change_password,created_at,updated_at) VALUES (?,?,?,?,?,'SUSPENDED',?,1,?,?)`).run(userId,email,input.displayName.trim(),placeholder.hash,placeholder.salt,input.companyId ?? null,now.toISOString(),now.toISOString());
      this.database.prepare("INSERT INTO user_invitations (id,email,display_name,company_id,role_id,invited_by_user_id,status,expires_at,created_at) VALUES (?,?,?,?,?,?,'PENDING',?,?)").run(invitationId,email,input.displayName.trim(),input.companyId ?? null,input.roleId,actor.userId,expiresAt,now.toISOString());
      this.database.prepare("INSERT INTO account_tokens (id,user_id,token_type,token_hash,expires_at,created_at) VALUES (?,?,'INVITE',?,?,?)").run(randomUUID(),userId,digest(this.config,token),expiresAt,now.toISOString());
      this.database.prepare('INSERT INTO user_roles (user_id,role_id) VALUES (?,?)').run(userId,input.roleId); this.database.exec('COMMIT');
      return { invitationId, token };
    } catch(error) { this.database.exec('ROLLBACK'); throw error; }
  }
  acceptInvitation(token: string, password: string, now = new Date()): string {
    const row = this.database.prepare("SELECT id,user_id FROM account_tokens WHERE token_type='INVITE' AND token_hash=? AND used_at IS NULL AND expires_at>?").get(digest(this.config,token),now.toISOString()) as {id:string;user_id:string}|undefined;
    if (!row) throw new Error('INVALID_OR_EXPIRED_TOKEN'); const passwordData=hashPassword(password);
    this.database.prepare("UPDATE users SET password_hash=?,password_salt=?,status='ACTIVE',must_change_password=0,email_verified_at=?,updated_at=? WHERE id=?").run(passwordData.hash,passwordData.salt,now.toISOString(),now.toISOString(),row.user_id);
    this.database.prepare('UPDATE account_tokens SET used_at=? WHERE id=?').run(now.toISOString(),row.id);
    this.database.prepare("UPDATE user_invitations SET status='ACCEPTED',accepted_at=? WHERE email=(SELECT email FROM users WHERE id=?) AND status='PENDING'").run(now.toISOString(),row.user_id); return row.user_id;
  }
  createPasswordReset(email: string, now = new Date()): { token: string | null } {
    const user=this.database.prepare("SELECT id FROM users WHERE email=? AND status='ACTIVE'").get(email.trim().toLowerCase()) as {id:string}|undefined; if(!user) return {token:null};
    const token=randomToken(); this.database.prepare("INSERT INTO account_tokens (id,user_id,token_type,token_hash,expires_at,created_at) VALUES (?,?,'RESET_PASSWORD',?,?,?)").run(randomUUID(),user.id,digest(this.config,token),new Date(now.getTime()+RESET_TTL_MS).toISOString(),now.toISOString()); return {token};
  }
  resetPassword(token:string,password:string,now=new Date()):void { const row=this.database.prepare("SELECT id,user_id FROM account_tokens WHERE token_type='RESET_PASSWORD' AND token_hash=? AND used_at IS NULL AND expires_at>?").get(digest(this.config,token),now.toISOString()) as {id:string;user_id:string}|undefined; if(!row)throw new Error('INVALID_OR_EXPIRED_TOKEN'); const data=hashPassword(password); this.database.prepare('UPDATE users SET password_hash=?,password_salt=?,failed_login_count=0,locked_until=NULL,updated_at=? WHERE id=?').run(data.hash,data.salt,now.toISOString(),row.user_id); this.database.prepare('UPDATE account_tokens SET used_at=? WHERE id=?').run(now.toISOString(),row.id); this.database.prepare('UPDATE sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL').run(now.toISOString(),row.user_id); }
  sessions(userId:string):unknown[]{ return this.database.prepare('SELECT id,ip_address,user_agent,expires_at,created_at,rotated_at FROM sessions WHERE user_id=? AND revoked_at IS NULL ORDER BY created_at DESC').all(userId); }
  revokeOtherSessions(userId:string,currentSessionId:string,now=new Date()):number { return Number(this.database.prepare('UPDATE sessions SET revoked_at=? WHERE user_id=? AND id<>? AND revoked_at IS NULL').run(now.toISOString(),userId,currentSessionId).changes); }
  startMfa(userId:string,now=new Date()):{secret:string;provisioningUri:string;recoveryCodes:string[]}{ const secret=base32(randomBytes(20)); const codes=Array.from({length:8},()=>randomBytes(5).toString('hex').toUpperCase()); this.database.prepare('INSERT OR REPLACE INTO mfa_credentials (user_id,secret_ciphertext,enabled,created_at,updated_at) VALUES (?,?,0,?,?)').run(userId,encrypt(this.config,secret),now.toISOString(),now.toISOString()); this.database.prepare('DELETE FROM mfa_recovery_codes WHERE user_id=?').run(userId); for(const code of codes)this.database.prepare('INSERT INTO mfa_recovery_codes (id,user_id,code_hash,created_at) VALUES (?,?,?,?)').run(randomUUID(),userId,digest(this.config,code),now.toISOString()); const email=String(this.database.prepare('SELECT email FROM users WHERE id=?').get(userId)?.email ?? userId); return {secret,provisioningUri:`otpauth://totp/CELULARS:${encodeURIComponent(email)}?secret=${secret}&issuer=CELULARS`,recoveryCodes:codes}; }
  confirmMfa(userId:string,code:string,now=new Date()):void { const secret=decryptedSecret(this.database,this.config,userId); const normalized=code.trim(); if(![-1,0,1].some((step)=>{const a=Buffer.from(totpCode(secret,now,step)),b=Buffer.from(normalized);return a.length===b.length&&timingSafeEqual(a,b);}))throw new Error('INVALID_MFA_CODE'); this.database.prepare('UPDATE mfa_credentials SET enabled=1,verified_at=?,updated_at=? WHERE user_id=?').run(now.toISOString(),now.toISOString(),userId); }
  mfaStatus(userId:string):object { return {enabled:mfaEnabled(this.database,userId),recoveryCodesRemaining:Number(this.database.prepare('SELECT COUNT(*) AS count FROM mfa_recovery_codes WHERE user_id=? AND used_at IS NULL').get(userId)?.count??0)}; }
  disableMfa(userId:string,code:string,currentSessionId:string,now=new Date()):number { verifyMfa(this.database,this.config,userId,code,now); this.database.prepare('DELETE FROM mfa_recovery_codes WHERE user_id=?').run(userId); this.database.prepare('DELETE FROM mfa_credentials WHERE user_id=?').run(userId); return Number(this.database.prepare('UPDATE sessions SET revoked_at=? WHERE user_id=? AND id<>? AND revoked_at IS NULL').run(now.toISOString(),userId,currentSessionId).changes); }
  adminResetMfa(actor:Principal,userId:string,now=new Date()):number { if(!actor.permissions.includes('users.write'))throw new Error('FORBIDDEN:users.write'); if(!this.database.prepare('SELECT id FROM users WHERE id=?').get(userId))throw new Error('USER_NOT_FOUND'); this.database.prepare('DELETE FROM mfa_recovery_codes WHERE user_id=?').run(userId); this.database.prepare('DELETE FROM mfa_credentials WHERE user_id=?').run(userId); return Number(this.database.prepare('UPDATE sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL').run(now.toISOString(),userId).changes); }
  currentTotpForDemo(userId:string,now=new Date()):string { if(!this.config.demo)throw new Error('DEMO_ONLY'); return totpCode(decryptedSecret(this.database,this.config,userId),now); }
}
