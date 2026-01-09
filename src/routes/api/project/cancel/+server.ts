import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cancelProjectJobs } from '$lib/server/queue';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const { projectId, pairId } = body;

	if (!projectId) {
		return json({ error: 'Project ID required' }, { status: 400 });
	}

	const cancelled = cancelProjectJobs(projectId, pairId);
	return json({ success: true, cancelled });
};


