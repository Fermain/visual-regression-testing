import { initDb } from '$lib/server/db';

let initialized = false;

export async function handle({ event, resolve }) {
	if (!initialized) {
		await initDb();
		initialized = true;
	}
	return resolve(event);
}

