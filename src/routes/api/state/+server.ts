import { json } from '@sveltejs/kit';
import { currentSession, envFor } from '$lib/server/auth';

const unauthorized = () => json({ error: 'Aanmelden is vereist.' }, { status: 401 });

export const GET = async (event) => {
  if (!(await currentSession(event))) return unauthorized();
  const row = await envFor(event).DB.prepare('SELECT state_json, version FROM app_state WHERE id = 1').bind().first<{ state_json: string; version: number }>();
  return json({ state: row ? JSON.parse(row.state_json) : null, version: row?.version ?? 0 });
};

export const PUT = async (event) => {
  if (!(await currentSession(event))) return unauthorized();
  const body: unknown = await event.request.json().catch(() => null);
  const state = body && typeof body === 'object' && 'state' in body ? body.state : null;
  const version = body && typeof body === 'object' && 'version' in body ? body.version : null;
  if (!state || typeof state !== 'object') return json({ error: 'Ongeldige gegevens.' }, { status: 400 });
  if (!Number.isInteger(version) || typeof version !== 'number' || version < 0) return json({ error: 'Ongeldige versie.' }, { status: 400 });
  const serialized = JSON.stringify(state);
  if (serialized.length > 2_000_000) return json({ error: 'De gegevens zijn te groot.' }, { status: 413 });
  const db = envFor(event).DB;
  const current = await db.prepare('SELECT version FROM app_state WHERE id = 1').bind().first<{ version: number }>();
  if (!current) {
    if (version !== 0) return json({ error: 'De gegevens zijn intussen gewijzigd.' }, { status: 409 });
    const inserted = await db.prepare('INSERT INTO app_state (id, state_json, updated_at, version) VALUES (1, ?, CURRENT_TIMESTAMP, 1) ON CONFLICT(id) DO NOTHING').bind(serialized).run();
    if (inserted.meta?.changes !== 1) return json({ error: 'De gegevens zijn intussen gewijzigd.' }, { status: 409 });
    return json({ saved: true, version: 1 });
  }
  if (current.version !== version) return json({ error: 'De gegevens zijn intussen gewijzigd.' }, { status: 409 });
  const updated = await db.prepare('UPDATE app_state SET state_json = ?, updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = 1 AND version = ?').bind(serialized, version).run();
  if (updated.meta?.changes !== 1) return json({ error: 'De gegevens zijn intussen gewijzigd.' }, { status: 409 });
  return json({ saved: true, version: version + 1 });
};
