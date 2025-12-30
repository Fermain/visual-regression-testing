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

	// Calculate overall progress for active batch
	// A "batch" is all jobs that are queued, running, or recently completed
	const activeJobs = enrichedQueue.filter(
		(j) => j.status === 'queued' || j.status === 'running' || j.status === 'completed' || j.status === 'failed'
	);
	
	const totalJobs = activeJobs.length;
	const completedJobs = activeJobs.filter((j) => j.status === 'completed' || j.status === 'failed').length;
	const successfulJobs = activeJobs.filter((j) => j.status === 'completed').length;
	const failedJobs = activeJobs.filter((j) => j.status === 'failed').length;
	
	// Group by project to show project-level progress
	const projectProgress = new Map<string, { name: string; total: number; completed: number; failed: number }>();
	for (const job of activeJobs) {
		const existing = projectProgress.get(job.projectId) || { 
			name: job.projectName, 
			total: 0, 
			completed: 0,
			failed: 0 
		};
		existing.total++;
		if (job.status === 'completed') existing.completed++;
		if (job.status === 'failed') existing.failed++;
		projectProgress.set(job.projectId, existing);
	}

	return {
		queued,
		running,
		completed,
		progress: {
			total: totalJobs,
			completed: completedJobs,
			successful: successfulJobs,
			failed: failedJobs,
			isActive: queued.length > 0 || running !== undefined,
			projects: Array.from(projectProgress.values())
		}
	};
};

