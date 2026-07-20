import type { Principal } from './types.js';

export function hasPermission(principal: Principal, permission: string): boolean {
  return principal.permissions.includes(permission);
}

export function requirePermission(principal: Principal, permission: string): void {
  if (!hasPermission(principal, permission)) throw new Error(`FORBIDDEN:${permission}`);
}
