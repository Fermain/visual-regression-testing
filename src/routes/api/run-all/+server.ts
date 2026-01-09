import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProjects, getSettings } from '$lib/server/db';
import { queueRunAll, getQueue, clearCompletedJobs, cancelAllQueued, cancelJob } from '$lib/server/queue';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const commands = body.commands || ['reference', 'test'];
	const pairId = body.pairId;

	const projects = getProjects();
	const settings = getSettings();
	const pairs = settings.urlPairs || [];

	if (projects.length === 0) {
		return json({ error: 'No projects to run' }, { status: 400 });
	}

	if (pairs.length === 0) {
		return json({ error: 'No URL pairs configured' }, { status: 400 });
	}

	if (pairId && !pairs.find(p => p.id === pairId)) {
		return json({ error: 'Selected URL pair not found' }, { status: 400 });
	}

	const jobs = queueRunAll(projects, pairs, { commands, pairId });

	return json({
		success: true,
		message: `Queued ${jobs.length} jobs`,
		totalProjects: projects.length,
		totalPairs: pairId ? 1 : pairs.length,
		commands,
		queueLength: getQueue().filter((j) => j.status === 'queued').length
	});
};

export const GET: RequestHandler = async () => {
	const queue = getQueue();
	const queued = queue.filter((j) => j.status === 'queued');
	const running = queue.find((j) => j.status === 'running');
	const recent = queue
		.filter((j) => j.status === 'completed' || j.status === 'failed')
		.slice(-10);

	return json({
		queueLength: queued.length,
		running: running || null,
		queued: queued.slice(0, 20),
		recent
	});
};

export const DELETE: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const action = body.action;

	if (action === 'clear-history') {
		const cleared = clearCompletedJobs();
		return json({ success: true, cleared });
	}

	if (action === 'cancel-all') {
		const cancelled = cancelAllQueued();
		return json({ success: true, cancelled });
	}

	if (action === 'cancel-job' && body.jobId) {
		const cancelled = cancelJob(body.jobId);
		return json({ success: cancelled });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};

