import { getQueue } from '$lib/server/queue';
import { getProjects } from '$lib/server/storage';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const queue = getQueue();
	const projects = await getProjects();

	// Enrich queue items with project names
	const enrichedQueue = queue.map((job) => {
		const project = projects.find((p) => p.id === job.projectId);
		return {
			...job,
			projectName: project?.name || job.projectId
		};
	});

	const queued = enrichedQueue.filter((j) => j.status === 'queued');
	const running = enrichedQueue.find((j) => j.status === 'running');
	const completed = enrichedQueue
		.filter((j) => j.status === 'completed' || j.status === 'failed')
		.reverse()
		.slice(0, 20);

	return {
		queued,
		running,
		completed
	};
};

