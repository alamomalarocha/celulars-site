import type { IncomingMessage, ServerResponse } from 'node:http';

export async function readJson<T>(request: IncomingMessage, maximumBytes = 64 * 1024): Promise<T> {
  const contentType = request.headers['content-type'] ?? '';
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) throw new Error('UNSUPPORTED_MEDIA_TYPE');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maximumBytes) throw new Error('PAYLOAD_TOO_LARGE');
    chunks.push(buffer);
  }
  const source = Buffer.concat(chunks).toString('utf8');
  if (!source) throw new Error('EMPTY_BODY');
  return JSON.parse(source) as T;
}

export function sendJson(response: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value);
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Content-Length', Buffer.byteLength(body));
  response.end(body);
}

export function sendEmpty(response: ServerResponse, status = 204): void {
  response.statusCode = status;
  response.end();
}
