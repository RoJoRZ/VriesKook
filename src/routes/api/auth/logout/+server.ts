import { json } from '@sveltejs/kit';
import { removeSession } from '$lib/server/auth';

export const POST = async (event) => json({ authenticated: false }, { headers: { 'set-cookie': await removeSession(event) } });
