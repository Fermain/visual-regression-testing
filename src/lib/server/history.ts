import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = 'data';
const HISTORY_FILE = path.join(DATA_DIR, 'run-history.json');

export interface RunRecord {
	date: string;
	command: 'reference' | 'test' | 'approve';
	pairId: string;
	success: boolean;
	durationMs: number;
	error?: string;
}

export interface ProjectHistory {
	projectId: string;
	runs: RunRecord[];
}

export interface HistoryData {
	projects: Record<string, RunRecord[]>;
}

async function ensureDataDir() {
	await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function getHistory(): Promise<HistoryData> {
	await ensureDataDir();
	try {
		const data = await fs.readFile(HISTORY_FILE, 'utf-8');
		return JSON.parse(data);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return { projects: {} };
		}
		console.error('Error reading history file:', error);
		return { projects: {} };
	}
}

export async function addRunRecord(
	projectId: string,
	record: Omit<RunRecord, 'date'>
): Promise<void> {
	const history = await getHistory();
	
	if (!history.projects[projectId]) {
		history.projects[projectId] = [];
	}
	
	history.projects[projectId].push({
		...record,
		date: new Date().toISOString()
	});
	
	// Keep only last 100 runs per project to prevent unbounded growth
	if (history.projects[projectId].length > 100) {
		history.projects[projectId] = history.projects[projectId].slice(-100);
	}
	
	await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
}

export async function getProjectHistory(projectId: string): Promise<RunRecord[]> {
	const history = await getHistory();
	return history.projects[projectId] || [];
}

export async function getProjectStats(projectId: string): Promise<{
	totalRuns: number;
	successRate: number;
	avgDurationMs: number;
	lastRun?: RunRecord;
}> {
	const runs = await getProjectHistory(projectId);
	
	if (runs.length === 0) {
		return { totalRuns: 0, successRate: 0, avgDurationMs: 0 };
	}
	
	const successful = runs.filter(r => r.success).length;
	const totalDuration = runs.reduce((sum, r) => sum + r.durationMs, 0);
	
	return {
		totalRuns: runs.length,
		successRate: Math.round((successful / runs.length) * 100),
		avgDurationMs: Math.round(totalDuration / runs.length),
		lastRun: runs[runs.length - 1]
	};
}

export async function getAllStats(): Promise<Record<string, {
	totalRuns: number;
	successRate: number;
	avgDurationMs: number;
	lastRun?: RunRecord;
}>> {
	const history = await getHistory();
	const stats: Record<string, any> = {};
	
	for (const projectId of Object.keys(history.projects)) {
		stats[projectId] = await getProjectStats(projectId);
	}
	
	return stats;
}

export async function getEstimatedDuration(
	projectId: string,
	pairId: string,
	command: 'reference' | 'test' | 'approve'
): Promise<number | null> {
	const runs = await getProjectHistory(projectId);
	
	// Filter to matching runs (same pair and command)
	const matchingRuns = runs.filter(
		r => r.pairId === pairId && r.command === command && r.success
	);
	
	if (matchingRuns.length === 0) {
		// Fall back to any successful run for this project with same command
		const commandRuns = runs.filter(r => r.command === command && r.success);
		if (commandRuns.length === 0) {
			// Fall back to any successful run
			const anyRuns = runs.filter(r => r.success);
			if (anyRuns.length === 0) return null;
			return anyRuns[anyRuns.length - 1].durationMs;
		}
		return commandRuns[commandRuns.length - 1].durationMs;
	}
	
	// Use the most recent matching run's duration
	return matchingRuns[matchingRuns.length - 1].durationMs;
}

export async function getEstimatesForQueue(
	jobs: Array<{ projectId: string; pairId: string; command: 'reference' | 'test' | 'approve' }>
): Promise<Map<string, number | null>> {
	const estimates = new Map<string, number | null>();
	
	for (const job of jobs) {
		const key = `${job.projectId}-${job.pairId}-${job.command}`;
		if (!estimates.has(key)) {
			const estimate = await getEstimatedDuration(job.projectId, job.pairId, job.command);
			estimates.set(key, estimate);
		}
	}
	
	return estimates;
}

