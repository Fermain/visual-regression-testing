import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as db from './db';
import fs from 'node:fs';
import path from 'node:path';

describe('database', () => {
	beforeEach(async () => {
		// Initialize DB for each test
		await db.initDb();
	});

	afterAll(() => {
		db.closeDb();
		// Clean up test database
		if (fs.existsSync('data/test')) {
			fs.rmSync('data/test', { recursive: true, force: true });
		}
	});

	it('should save and retrieve a project', () => {
		const project = {
			id: 'test-project-' + Date.now(),
			name: 'Test Project',
			paths: ['/']
		};

		db.saveProject(project);
		const saved = db.getProject(project.id);

		expect(saved).toBeDefined();
		expect(saved?.name).toBe('Test Project');
		expect(saved?.paths).toEqual(['/']);
	});

	it('should list all projects', () => {
		const project1 = { id: 'p1', name: 'Alpha', paths: ['/'] };
		const project2 = { id: 'p2', name: 'Beta', paths: ['/'] };

		db.saveProject(project1);
		db.saveProject(project2);

		const projects = db.getProjects();
		expect(projects.length).toBeGreaterThanOrEqual(2);
		expect(projects.some((p) => p.id === 'p1')).toBe(true);
		expect(projects.some((p) => p.id === 'p2')).toBe(true);
	});

	it('should update pair results', () => {
		const projectId = 'p-results';
		db.saveProject({ id: projectId, name: 'Results', paths: ['/'] });

		db.updatePairResult(projectId, 'pair-1', {
			status: 'running',
			progress: { total: 10, completed: 5, current: 'Halfway' }
		});

		const project = db.getProject(projectId);
		expect(project?.pairResults?.['pair-1']).toBeDefined();
		expect(project?.pairResults?.['pair-1'].status).toBe('running');
		expect(project?.pairResults?.['pair-1'].progress?.completed).toBe(5);
	});

	it('should delete a project', () => {
		const id = 'to-delete';
		db.saveProject({ id, name: 'Delete Me', paths: ['/'] });
		expect(db.getProject(id)).toBeDefined();

		db.deleteProject(id);
		expect(db.getProject(id)).toBeUndefined();
	});
});
