import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addJob, getQueue, clearCompletedJobs, cancelJob, getJobStatus } from './queue';
import * as db from './db';
import * as backstop from './backstop';

// Mock dependencies
vi.mock('./db', () => ({
	getProject: vi.fn(),
	saveProject: vi.fn(),
	updatePairResult: vi.fn(),
	addRunRecord: vi.fn(),
	getSettings: vi.fn(() => ({ urlPairs: [{ id: 'pair-1' }] }))
}));

vi.mock('./backstop', () => ({
	runBackstop: vi.fn(() => Promise.resolve({ success: true }))
}));

describe('queue', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset the in-memory queue by clearing it
		clearCompletedJobs();
		// Since we can't easily reset the internal 'queue' variable from outside 
		// without adding a reset function, we'll just be careful with our tests
		// or we could add a resetQueue for testing.
	});

	it('should add a job to the queue', () => {
		const job = addJob('p1', 'pair-1', 'test');
		expect(job.projectId).toBe('p1');
		expect(job.command).toBe('test');
		// First job added starts processing immediately
		expect(['queued', 'running']).toContain(job.status);
		
		const queue = getQueue();
		expect(queue.some(j => j.id === job.id)).toBe(true);
	});

	it('should not add a duplicate queued job', () => {
		// Mock getProject to avoid error logs
		(db.getProject as any).mockReturnValue({ id: 'p1', pairResults: {} });

		const job1 = addJob('p1', 'pair-1', 'test');
		const job2 = addJob('p1', 'pair-1', 'test');
		
		expect(job1.id).toBe(job2.id);
		expect(getQueue().filter(j => j.projectId === 'p1').length).toBe(1);
	});

	it('should return job status', () => {
		addJob('p2', 'pair-1', 'reference');
		const status = getJobStatus('p2', 'pair-1');
		expect(status).not.toBeNull();
		expect(status?.command).toBe('reference');
	});

	it('should cancel a queued job', () => {
		// We add one job that will start running
		addJob('active', 'pair-1', 'test');
		// Then we add another one that will be queued
		const job = addJob('p3', 'pair-1', 'test');
		expect(job.status).toBe('queued');
		
		const result = cancelJob(job.id);
		
		expect(result).toBe(true);
		expect(getQueue().find(j => j.id === job.id)).toBeUndefined();
	});
});
