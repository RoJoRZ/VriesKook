import { json } from '@sveltejs/kit';
import { currentSession, envFor } from '$lib/server/auth';

const unauthorized = () => json({ error: 'Aanmelden is vereist.' }, { status: 401 });

export const GET = async (event) => {
  if (!(await currentSession(event))) return unauthorized();
  const row = await envFor(event).DB.prepare('SELECT state_json FROM app_state WHERE id = 1').bind().first<{ state_json: string }>();
  return json({ state: row ? JSON.parse(row.state_json) : null });
};

export const PUT = async (event) => {
  if (!(await currentSession(event))) return unauthorized();
  const state: unknown = await event.request.json().catch(() => null);
  if (!state || typeof state !== 'object') return json({ error: 'Ongeldige gegevens.' }, { status: 400 });
  const serialized = JSON.stringify(state);
  if (serialized.length > 2_000_000) return json({ error: 'De gegevens zijn te groot.' }, { status: 413 });
  await envFor(event).DB.prepare('INSERT INTO app_state (id, state_json, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json, updated_at = CURRENT_TIMESTAMP').bind(serialized).run();
  return json({ saved: true });
};
