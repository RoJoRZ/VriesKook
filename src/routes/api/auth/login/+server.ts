import { json } from '@sveltejs/kit';
import { createSession, envFor, passwordIsValid } from '$lib/server/auth';

export const POST = async (event) => {
  const body: unknown = await event.request.json().catch(() => ({}));
  const password = typeof body === 'object' && body !== null && 'password' in body && typeof body.password === 'string' ? body.password : '';
  const env = envFor(event);
  if (!(await passwordIsValid(password, env.AUTH_PASSWORD_HASH))) return json({ error: 'Onjuist wachtwoord.' }, { status: 401 });
  return json({ authenticated: true }, { headers: { 'set-cookie': await createSession(event) } });
};
