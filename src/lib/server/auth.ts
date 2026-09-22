import type { RequestEvent } from '@sveltejs/kit';

type DatabaseStatement = { bind(...values: unknown[]): { first<T = unknown>(): Promise<T | null>; run(): Promise<unknown> } };
type AuthEnv = { DB: { prepare(query: string): DatabaseStatement }; AUTH_PASSWORD_HASH?: string };
const encoder = new TextEncoder();
const sessionDays = 30;

export function envFor(event: RequestEvent) {
  const platform = event.platform as (typeof event.platform & { env?: AuthEnv }) | undefined;
  const env = platform?.env;
  if (!env?.DB) throw new Error('De online gegevensopslag is nog niet geconfigureerd.');
  return env;
}

function bytesToBase64(bytes: Uint8Array) {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

function base64ToBytes(value: string) {
  const text = atob(value);
  return Uint8Array.from(text, (character) => character.charCodeAt(0));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToBase64(new Uint8Array(digest));
}

function sameBytes(first: Uint8Array, second: Uint8Array) {
  if (first.length !== second.length) return false;
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) difference |= first[index] ^ second[index];
  return difference === 0;
}

export async function passwordIsValid(password: string, stored?: string) {
  const match = stored?.match(/^pbkdf2-sha256\$(\d+)\$([^$]+)\$([^$]+)$/);
  if (!match) return false;
  const [, iterationsText, salt, expected] = match;
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: Number(iterationsText) }, key, 256);
  return sameBytes(new Uint8Array(derived), base64ToBytes(expected));
}

function cookieValue(header: string | null, name: string) {
  return header?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

export async function currentSession(event: RequestEvent) {
  const token = cookieValue(event.request.headers.get('cookie'), 'helpmenu_session');
  if (!token) return false;
  const row = await envFor(event).DB.prepare('SELECT id FROM sessions WHERE token_hash = ? AND expires_at > ?').bind(await sha256(token), new Date().toISOString()).first();
  return Boolean(row);
}

export async function createSession(event: RequestEvent) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = bytesToBase64(bytes).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  const expiresAt = new Date(Date.now() + sessionDays * 86_400_000).toISOString();
  await envFor(event).DB.prepare('INSERT INTO sessions (id, token_hash, expires_at) VALUES (?, ?, ?)').bind(crypto.randomUUID(), await sha256(token), expiresAt).run();
  return `helpmenu_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${sessionDays * 86_400};`;
}

export async function removeSession(event: RequestEvent) {
  const token = cookieValue(event.request.headers.get('cookie'), 'helpmenu_session');
  if (token) await envFor(event).DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  return 'helpmenu_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0;';
}
