import type { PlatformConfig } from '../src/config.js';

export const sessionCookieName = 'celulars_platform_session';

export function parseCookies(header: string | undefined): Readonly<Record<string, string>> {
  const cookies: Record<string, string> = {};
  for (const pair of (header ?? '').split(';')) {
    const separator = pair.indexOf('=');
    if (separator < 1) continue;
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (name) cookies[name] = decodeURIComponent(value);
  }
  return cookies;
}

export function sessionCookie(token: string, config: PlatformConfig): string {
  const secure = config.secureCookies ? '; Secure' : '';
  return `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${config.sessionTtlMinutes * 60}${secure}`;
}

export function clearSessionCookie(config: PlatformConfig): string {
  const secure = config.secureCookies ? '; Secure' : '';
  return `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
