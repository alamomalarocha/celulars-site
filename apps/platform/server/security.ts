import type { ServerResponse } from 'node:http';
import type { PlatformConfig } from '../src/config.js';

export function applySecurityHeaders(response: ServerResponse): void {
  response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  response.setHeader('Cache-Control', 'no-store');
}

export function validUnsafeOrigin(origin: string | undefined, config: PlatformConfig): boolean {
  return origin === config.allowedOrigin;
}
