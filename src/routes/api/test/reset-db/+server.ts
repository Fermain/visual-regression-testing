import * as db from '$lib/server/db';
import { resetQueue } from '$lib/server/queue';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	if (process.env.NODE_ENV !== 'test') {
		return json({ error: 'Only allowed in test mode' }, { status: 403 });
	}

	db.closeDb();
	await db.initDb();
	resetQueue();
	
	return json({ success: true });
};
