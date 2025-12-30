import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProjects } from '$lib/server/storage';
import { getSettings } from '$lib/server/settings';
import { queueRunAll, getQueue } from '$lib/server/queue';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const commands = body.commands || ['reference', 'test'];

	const projects = await getProjects();
	const settings = await getSettings();
	const pairs = settings.urlPairs || [];

	if (projects.length === 0) {
		return json({ error: 'No projects to run' }, { status: 400 });
	}

	if (pairs.length === 0) {
		return json({ error: 'No URL pairs configured' }, { status: 400 });
	}

	const jobs = queueRunAll(projects, pairs, { commands });

	return json({
		success: true,
		message: `Queued ${jobs.length} jobs`,
		totalProjects: projects.length,
		totalPairs: pairs.length,
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

