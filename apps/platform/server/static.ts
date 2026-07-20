import { readFileSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import path from 'node:path';
import type { PlatformConfig } from '../src/config.js';

const publicFiles: Readonly<Record<string, { file: string; type: string }>> = {
  '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/index.html': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/app.js': { file: 'app.js', type: 'text/javascript; charset=utf-8' },
  '/style.css': { file: 'style.css', type: 'text/css; charset=utf-8' }
};

export function serveStatic(pathname: string, response: ServerResponse, config: PlatformConfig): boolean {
  const asset = publicFiles[pathname];
  if (!asset) return false;
  const publicRoot = path.join(config.platformRoot, 'public');
  const filePath = path.join(publicRoot, asset.file);
  const body = readFileSync(filePath);
  response.statusCode = 200;
  response.setHeader('Content-Type', asset.type);
  response.setHeader('Content-Length', body.length);
  response.end(body);
  return true;
}
