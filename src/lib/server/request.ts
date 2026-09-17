import { error } from '@sveltejs/kit';

export async function readJson<T>(
  request: Request,
  maxBytes = 16 * 1024
): Promise<T | null> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > maxBytes) throw error(413, 'Request body is too large.');
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw error(413, 'Request body is too large.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(bytes);
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function randomHex(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return `0x${Array.from(value, (item) => item.toString(16).padStart(2, '0')).join('')}`;
}

export function isSameOrigin(request: Request, origin: string) {
  const supplied = request.headers.get('origin');
  return supplied === origin;
}
