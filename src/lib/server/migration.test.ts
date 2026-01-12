import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as db from './db';
import fs from 'node:fs';
import path from 'node:path';

describe.sequential('database migration', () => {
	const testDir = 'data/test';
	const projectsFile = path.join(testDir, 'projects.json');
	const settingsFile = path.join(testDir, 'settings.json');
	const historyFile = path.join(testDir, 'run-history.json');
	const dbFile = path.join(testDir, 'app.db');

	beforeEach(() => {
		db.closeDb();
		if (fs.existsSync(testDir)) {
			const files = fs.readdirSync(testDir);
			for (const file of files) {
				fs.unlinkSync(path.join(testDir, file));
			}
		} else {
			fs.mkdirSync(testDir, { recursive: true });
		}
	});

	afterEach(() => {
		db.closeDb();
	});

	it('should migrate data from legacy JSON files to SQLite', async () => {
		// 1. Setup legacy JSON files
		const legacyProjects = [
			{
				id: 'legacy-p1',
				name: 'Legacy Project',
				paths: ['/', '/about'],
				pairResults: {
					'pair-1': {
						status: 'idle',
						lastRun: '2023-01-01T00:00:00.000Z',
						lastResult: { success: true, command: 'test' }
					}
				}
			}
		];

		const legacySettings = {
			viewports: [{ label: 'mobile', width: 390, height: 844 }],
			urlPairs: [{ id: 'pair-1', canonicalUrl: 'https://a.com', candidateUrl: 'https://b.com' }],
			asyncCaptureLimit: 5
		};

		const legacyHistory = {
			projects: {
				'legacy-p1': [
					{
						pairId: 'pair-1',
						command: 'test',
						success: true,
						durationMs: 1234,
						date: '2023-01-01T00:00:00.000Z'
					}
				]
			}
		};

		fs.writeFileSync(projectsFile, JSON.stringify(legacyProjects));
		fs.writeFileSync(settingsFile, JSON.stringify(legacySettings));
		fs.writeFileSync(historyFile, JSON.stringify(legacyHistory));

		// 2. Initialize DB (this should trigger migration)
		await db.initDb();

		// 3. Verify Projects Migration
		const projects = db.getProjects();
		expect(projects).toHaveLength(1);
		expect(projects[0].id).toBe('legacy-p1');
		expect(projects[0].name).toBe('Legacy Project');
		expect(projects[0].paths).toEqual(['/', '/about']);
		expect(projects[0].pairResults?.['pair-1']).toBeDefined();
		expect(projects[0].pairResults?.['pair-1'].status).toBe('idle');

		// 4. Verify Settings Migration
		const settings = db.getSettings();
		expect(settings.viewports).toHaveLength(1);
		expect(settings.viewports[0].label).toBe('mobile');
		expect(settings.urlPairs).toHaveLength(1);
		expect(settings.asyncCaptureLimit).toBe(5);

		// 5. Verify History Migration
		const history = db.getProjectHistory('legacy-p1');
		expect(history).toHaveLength(1);
		expect(history[0].pairId).toBe('pair-1');
		expect(history[0].success).toBe(true);
		expect(history[0].durationMs).toBe(1234);

		// 6. Verify migration flag is set
		// We can check if migration doesn't run again by deleting the JSON files and re-initing
		db.closeDb();
		if (fs.existsSync(projectsFile)) fs.unlinkSync(projectsFile);
		
		await db.initDb();
		const projectsAfter = db.getProjects();
		// Use find to be robust against parallel tests adding other projects
		expect(projectsAfter.find((p) => p.id === 'legacy-p1')).toBeDefined();
	});
});
