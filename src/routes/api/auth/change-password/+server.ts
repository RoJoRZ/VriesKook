import { json } from '@sveltejs/kit';
import { changePassword, credentialsAreValid, currentSession } from '$lib/server/auth';

export const POST = async (event) => {
  if (!(await currentSession(event))) return json({ error: 'Aanmelden is vereist.' }, { status: 401 });
  const body: unknown = await event.request.json().catch(() => ({}));
  const values = typeof body === 'object' && body !== null ? body as { currentPassword?: unknown; newPassword?: unknown } : {};
  const currentPassword = typeof values.currentPassword === 'string' ? values.currentPassword : '';
  const newPassword = typeof values.newPassword === 'string' ? values.newPassword : '';
  if (!(await credentialsAreValid(event, currentPassword))) return json({ error: 'Het huidige wachtwoord klopt niet.' }, { status: 401 });
  if (newPassword.length < 12) return json({ error: 'Kies minimaal 12 karakters.' }, { status: 400 });
  await changePassword(event, newPassword);
  return json({ changed: true });
};
