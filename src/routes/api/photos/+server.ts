import { json } from '@sveltejs/kit';
import { currentSession, envFor } from '$lib/server/auth';

const maxPhotoBytes = 5_000_000;
const imageTypes = new Set(['image/webp', 'image/jpeg', 'image/png']);

function matchesImageType(bytes: Uint8Array, type: string) {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') return [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  return bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 &&
    bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80;
}

export const POST = async (event) => {
  if (!(await currentSession(event))) return json({ error: 'Aanmelden is vereist.' }, { status: 401 });
  const type = event.request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() ?? '';
  if (!imageTypes.has(type)) return json({ error: 'Kies een JPG-, PNG- of WebP-foto.' }, { status: 415 });
  const length = Number(event.request.headers.get('content-length'));
  if (length > maxPhotoBytes) return json({ error: 'De foto is te groot (maximaal 5 MB na verkleinen).' }, { status: 413 });
  if (!event.request.body) return json({ error: 'Er is geen foto ontvangen.' }, { status: 400 });

  const reader = event.request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxPhotoBytes) {
      await reader.cancel();
      return json({ error: 'De foto is te groot (maximaal 5 MB na verkleinen).' }, { status: 413 });
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  if (!total || !matchesImageType(bytes, type)) return json({ error: 'Dit is geen geldige foto.' }, { status: 415 });

  const key = crypto.randomUUID();
  await envFor(event).DISH_PHOTOS.put(`dishes/${key}`, bytes, { httpMetadata: { contentType: type } });
  return json({ url: `/api/photos/${key}` }, { status: 201 });
};
