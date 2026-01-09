import type { Project, UrlPair } from '$lib/types';
import { runBackstop } from './backstop';
import { getProject, saveProject, updatePairResult, addRunRecord } from './db';

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
	// Check if same command already queued or running for this project/pair
	const existing = queue.find(
		(j) =>
			j.projectId === projectId &&
			j.pairId === pairId &&
			j.command === command &&
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

export function clearCompletedJobs(): number {
	const before = queue.length;
	queue = queue.filter((j) => j.status === 'queued' || j.status === 'running');
	return before - queue.length;
}

export function cancelJob(jobId: string): boolean {
	const job = queue.find((j) => j.id === jobId && j.status === 'queued');
	if (!job) return false;
	
	// Remove from queue
	queue = queue.filter((j) => j.id !== jobId);
	console.log(`[Queue] Cancelled job: ${jobId}`);
	
	try {
		const project = getProject(job.projectId);
		if (project?.pairResults?.[job.pairId]?.status === 'queued') {
			updatePairResult(job.projectId, job.pairId, { status: 'idle' });
		}
	} catch {}
	
	return true;
}

export function cancelProjectJobs(projectId: string, pairId?: string): number {
	const toCancel = queue.filter(
		(j) => j.projectId === projectId && 
		j.status === 'queued' && 
		(!pairId || j.pairId === pairId)
	);
	
	toCancel.forEach((job) => {
		queue = queue.filter((j) => j.id !== job.id);
	});
	
	console.log(`[Queue] Cancelled ${toCancel.length} jobs for project ${projectId}`);
	
	try {
		const project = getProject(projectId);
		if (project) {
			toCancel.forEach((job) => {
				if (project.pairResults?.[job.pairId]?.status === 'queued') {
					updatePairResult(projectId, job.pairId, { status: 'idle' });
				}
			});
		}
	} catch {}
	
	return toCancel.length;
}

export function cancelAllQueued(): number {
	const toCancel = queue.filter((j) => j.status === 'queued');
	queue = queue.filter((j) => j.status !== 'queued');
	console.log(`[Queue] Cancelled all ${toCancel.length} queued jobs`);
	return toCancel.length;
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

		try {
			updatePairResult(job.projectId, job.pairId, {
				status: 'running',
				lastRun: job.startedAt
			});
		} catch (e) {
			console.error('[Queue] Failed to update project status:', e);
		}

		const startTime = Date.now();
		try {
			const { getSettings } = await import('./db');
			const settings = getSettings();
			const pair = settings.urlPairs?.find((p) => p.id === job.pairId);
			const project = getProject(job.projectId);

			if (!project || !pair) {
				throw new Error('Project or pair not found');
			}

			const result = await runBackstop(project, pair, job.command);
			const durationMs = Date.now() - startTime;

			job.status = result.success ? 'completed' : 'failed';
			job.completedAt = new Date().toISOString();
			job.error = result.error;

			addRunRecord(job.projectId, {
				command: job.command,
				pairId: job.pairId,
				success: result.success,
				durationMs,
				error: result.error
			});

			updatePairResult(job.projectId, job.pairId, {
				status: 'idle',
				lastRun: job.completedAt,
				lastResult: {
					success: result.success,
					command: job.command,
					error: result.error
				},
				progress: null
			});

			console.log(`[Queue] Completed job: ${job.command} for ${job.projectId}/${job.pairId}. Success: ${result.success}. Duration: ${durationMs}ms`);
		} catch (e) {
			const durationMs = Date.now() - startTime;
			job.status = 'failed';
			job.completedAt = new Date().toISOString();
			job.error = e instanceof Error ? e.message : String(e);
			console.error(`[Queue] Job failed: ${job.command} for ${job.projectId}/${job.pairId}:`, e);

			addRunRecord(job.projectId, {
				command: job.command,
				pairId: job.pairId,
				success: false,
				durationMs,
				error: job.error
			});

			try {
				updatePairResult(job.projectId, job.pairId, {
					status: 'idle',
					lastRun: job.completedAt,
					lastResult: {
						success: false,
						command: job.command,
						error: job.error
					},
					progress: null
				});
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
	pairId?: string; // If specified, only run for this pair
}

export function queueRunAll(
	projects: Project[],
	pairs: UrlPair[],
	options: RunAllOptions = { commands: ['reference', 'test'] }
): QueueJob[] {
	const jobs: QueueJob[] = [];

	// Filter to single pair if specified
	const targetPairs = options.pairId 
		? pairs.filter(p => p.id === options.pairId)
		: pairs;

	for (const project of projects) {
		for (const pair of targetPairs) {
			for (const command of options.commands) {
				const job = addJob(project.id, pair.id, command);
				jobs.push(job);
			}
		}
	}

	console.log(`[Queue] Queued Run All: ${jobs.length} jobs for ${projects.length} projects × ${targetPairs.length} pair(s)`);
	return jobs;
}

