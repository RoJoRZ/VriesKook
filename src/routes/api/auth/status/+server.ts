import { json } from '@sveltejs/kit';
import { currentSession, envFor, passwordHashMatch } from '$lib/server/auth';

export const GET = async (event) => {
  try {
    const env = envFor(event);
    return json({ authenticated: await currentSession(event), configured: Boolean(passwordHashMatch(env.AUTH_PASSWORD_HASH)) });
  }
  catch { return json({ authenticated: false, configured: false }, { status: 503 }); }
};
