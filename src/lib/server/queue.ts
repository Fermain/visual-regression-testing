import type { Project, UrlPair } from '$lib/types';
import { runBackstop } from './backstop';
import { getProject, saveProject } from './storage';

export interface QueueJob {
	id: string;
	projectId: string;
	pairId: string;
	command: 'reference' | 'test' | 'approve';
	status: 'queued' | 'running' | 'completed' | 'failed';
	createdAt: string;
	startedAt?: string;
	completedAt?: string;
	error?: string;
}

// In-memory queue
let queue: QueueJob[] = [];
let isProcessing = false;

export function getQueue(): QueueJob[] {
	return [...queue];
}

export function getQueuePosition(projectId: string, pairId: string): number {
	const idx = queue.findIndex(
		(j) => j.projectId === projectId && j.pairId === pairId && j.status === 'queued'
	);
	return idx === -1 ? -1 : idx + 1;
}

export function getJobStatus(projectId: string, pairId: string): QueueJob | null {
	// Check running or queued jobs first
	const active = queue.find(
		(j) => j.projectId === projectId && j.pairId === pairId && 
		(j.status === 'queued' || j.status === 'running')
	);
	return active || null;
}

export function addJob(
	projectId: string,
	pairId: string,
	command: 'reference' | 'test' | 'approve'
): QueueJob {
	// Check if already queued or running
	const existing = queue.find(
		(j) =>
			j.projectId === projectId &&
			j.pairId === pairId &&
			(j.status === 'queued' || j.status === 'running')
	);
	if (existing) {
		return existing;
	}

	const job: QueueJob = {
		id: `${projectId}-${pairId}-${Date.now()}`,
		projectId,
		pairId,
		command,
		status: 'queued',
		createdAt: new Date().toISOString()
	};

	queue.push(job);
	console.log(`[Queue] Added job: ${job.command} for ${projectId}/${pairId}. Queue length: ${queue.filter(j => j.status === 'queued').length}`);

	// Start processing if not already
	processQueue();

	return job;
}

export function clearCompletedJobs(): void {
	queue = queue.filter((j) => j.status === 'queued' || j.status === 'running');
}

async function processQueue(): Promise<void> {
	if (isProcessing) return;
	isProcessing = true;

	while (true) {
		// Get next queued job
		const job = queue.find((j) => j.status === 'queued');
		if (!job) {
			isProcessing = false;
			console.log('[Queue] No more jobs, stopping processor');
			return;
		}

		// Mark as running
		job.status = 'running';
		job.startedAt = new Date().toISOString();
		console.log(`[Queue] Starting job: ${job.command} for ${job.projectId}/${job.pairId}`);

		// Update project status
		try {
			const project = await getProject(job.projectId);
			if (project) {
				project.pairResults = project.pairResults || {};
				project.pairResults[job.pairId] = {
					status: 'running',
					lastRun: job.startedAt
				};
				await saveProject(project);
			}
		} catch (e) {
			console.error('[Queue] Failed to update project status:', e);
		}

		// Run the job
		try {
			const { getSettings } = await import('./settings');
			const settings = await getSettings();
			const pair = settings.urlPairs?.find((p) => p.id === job.pairId);
			const project = await getProject(job.projectId);

			if (!project || !pair) {
				throw new Error('Project or pair not found');
			}

			const result = await runBackstop(project, pair, job.command);

			job.status = result.success ? 'completed' : 'failed';
			job.completedAt = new Date().toISOString();
			job.error = result.error;

			// Update project with result
			const updatedProject = await getProject(job.projectId);
			if (updatedProject) {
				updatedProject.pairResults = updatedProject.pairResults || {};
				updatedProject.pairResults[job.pairId] = {
					status: 'idle',
					lastRun: job.completedAt,
					lastResult: {
						success: result.success,
						command: job.command,
						error: result.error
					}
				};
				await saveProject(updatedProject);
			}

			console.log(`[Queue] Completed job: ${job.command} for ${job.projectId}/${job.pairId}. Success: ${result.success}`);
		} catch (e) {
			job.status = 'failed';
			job.completedAt = new Date().toISOString();
			job.error = e instanceof Error ? e.message : String(e);
			console.error(`[Queue] Job failed: ${job.command} for ${job.projectId}/${job.pairId}:`, e);

			// Update project with error
			try {
				const project = await getProject(job.projectId);
				if (project) {
					project.pairResults = project.pairResults || {};
					project.pairResults[job.pairId] = {
						status: 'idle',
						lastRun: job.completedAt,
						lastResult: {
							success: false,
							command: job.command,
							error: job.error
						}
					};
					await saveProject(project);
				}
			} catch {}
		}

		// Clean up old completed jobs (keep last 50)
		const completed = queue.filter((j) => j.status === 'completed' || j.status === 'failed');
		if (completed.length > 50) {
			const toRemove = completed.slice(0, completed.length - 50);
			queue = queue.filter((j) => !toRemove.includes(j));
		}
	}
}

// Run All functionality
export interface RunAllOptions {
	commands: ('reference' | 'test')[];
}

export function queueRunAll(
	projects: Project[],
	pairs: UrlPair[],
	options: RunAllOptions = { commands: ['reference', 'test'] }
): QueueJob[] {
	const jobs: QueueJob[] = [];

	for (const project of projects) {
		for (const pair of pairs) {
			for (const command of options.commands) {
				const job = addJob(project.id, pair.id, command);
				jobs.push(job);
			}
		}
	}

	console.log(`[Queue] Queued Run All: ${jobs.length} jobs for ${projects.length} projects × ${pairs.length} pairs`);
	return jobs;
}

