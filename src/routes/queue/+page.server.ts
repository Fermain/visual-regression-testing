import { getQueue } from '$lib/server/queue';
import { getProjects, getEstimatedDuration } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const queue = getQueue();
	const projects = getProjects();

	const enrichedQueue = queue.map((job) => {
		const project = projects.find((p) => p.id === job.projectId);
		const estimatedDurationMs = getEstimatedDuration(job.projectId, job.pairId, job.command);
		return {
			...job,
			projectName: project?.name || job.projectId,
			estimatedDurationMs
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

	// Calculate estimated time remaining
	const pendingJobs = [...queued, ...(running ? [running] : [])];
	let estimatedRemainingMs = 0;
	for (const job of pendingJobs) {
		if (job.estimatedDurationMs) {
			// For running job, subtract elapsed time
			if (job.status === 'running' && job.startedAt) {
				const elapsed = Date.now() - new Date(job.startedAt).getTime();
				estimatedRemainingMs += Math.max(0, job.estimatedDurationMs - elapsed);
			} else {
				estimatedRemainingMs += job.estimatedDurationMs;
			}
		}
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
			projects: Array.from(projectProgress.values()),
			estimatedRemainingMs
		}
	};
};

