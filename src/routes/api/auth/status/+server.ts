import { json } from '@sveltejs/kit';
import { currentSession } from '$lib/server/auth';

export const GET = async (event) => {
  try { return json({ authenticated: await currentSession(event) }); }
  catch { return json({ authenticated: false, configured: false }, { status: 503 }); }
};
