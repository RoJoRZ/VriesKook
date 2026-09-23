import { json } from '@sveltejs/kit';
import { currentSession, envFor } from '$lib/server/auth';

export const GET = async (event) => {
  if (!(await currentSession(event))) return json({ error: 'Aanmelden is vereist.' }, { status: 401 });
  const key = event.params.key;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
    return json({ error: 'Foto niet gevonden.' }, { status: 404 });
  }
  const photo = await envFor(event).DISH_PHOTOS.get(`dishes/${key}`);
  if (!photo) return json({ error: 'Foto niet gevonden.' }, { status: 404 });
  return new Response(photo.body, {
    headers: {
      'Content-Type': photo.httpMetadata?.contentType ?? 'application/octet-stream',
      'Content-Length': String(photo.size),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
};
