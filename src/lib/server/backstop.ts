import backstop from 'backstopjs';
import type { Project } from '$lib/types';
import { getSettings } from '$lib/server/settings';
import path from 'node:path';
import fs from 'node:fs/promises';

export async function runBackstop(project: Project, command: 'reference' | 'test' | 'approve') {
	const dataDir = path.resolve(`data/projects/${project.id}`);

	// Ensure project directory exists
	await fs.mkdir(dataDir, { recursive: true });

	// Get global viewports from settings
	const settings = await getSettings();

	const scenarios = project.paths.map((p: string) => {
		let url = project.candidateBaseUrl;
		let referenceUrl = project.canonicalBaseUrl;

		try {
			url = new URL(p, project.candidateBaseUrl).toString();
			referenceUrl = new URL(p, project.canonicalBaseUrl).toString();
		} catch (e) {
			console.warn(`Invalid URL combination: base=${project.candidateBaseUrl} path=${p}`, e);
		}

		const scenario: Record<string, unknown> = {
			label: p === '/' ? 'root' : p.replace(/\//g, '_'),
			url,
			referenceUrl,
			selectors: ['document'],
			misMatchThreshold: 0.1,
			// Default delay to allow lazy-loaded content to appear
			delay: 3000
		};

		// 60 seconds default timeout per scenario
		// This can be overridden by global debug settings if needed, but 60s is safer for heavy pages.
		// Backstop defaults to 30s which might be too short for 50+ concurrent tabs.
		// We'll add this to the scenario config.
		// Note: 'readyEvent' or 'readySelector' are better for waiting, but timeout provides a hard stop.
		// However, backstop scenario config doesn't have a direct 'timeout' property for the test itself, 
		// but engine options can configure navigation timeouts. 
		// Let's set a generous waitTimeout for selectors.
		// Actually, backstop supports selectorExpansion: true, but for timeouts we mainly care about ready/load.

		if (project.delay) {
			scenario.delay = project.delay;
		}
		if (project.clickSelector) {
			scenario.clickSelector = project.clickSelector;
		}
		if (project.postInteractionWait) {
			scenario.postInteractionWait = project.postInteractionWait;
		}

		return scenario;
	});

	const config = {
		id: project.id,
		viewports: settings.viewports,
		onBeforeScript: 'puppeteer/onBefore.cjs',
		onReadyScript: 'puppeteer/onReady.cjs',
		scenarios,
		paths: {
			bitmaps_reference: path.join(dataDir, 'bitmaps_reference'),
			bitmaps_test: path.join(dataDir, 'bitmaps_test'),
			engine_scripts: path.resolve('data/engine_scripts'),
			html_report: path.join(dataDir, 'html_report'),
			ci_report: path.join(dataDir, 'ci_report'),
			json_report: path.join(dataDir, 'json_report')
		},
		report: ['json', 'browser'],
		engine: 'puppeteer',
		engineOptions: {
			args: ['--no-sandbox'],
			// Increase browser navigation timeout to 60s (default is 30s)
			waitTimeout: settings.waitTimeout ?? 120000,
			gotoTimeout: settings.gotoTimeout ?? 120000,
		},
		// Limit concurrency to reduce load on the machine and network
		asyncCaptureLimit: settings.asyncCaptureLimit ?? 2, // Reduced from 5 to 2
		asyncCompareLimit: settings.asyncCompareLimit ?? 10, // Reduced from 50 to 10
		debug: false,
		debugWindow: false,
		openReport: false
	};

	try {
		// Clean up previous report before running
		if (command === 'test' || command === 'reference') {
			try {
				await fs.rm(path.join(dataDir, 'json_report'), { recursive: true, force: true });
				await fs.rm(path.join(dataDir, 'html_report'), { recursive: true, force: true });
			} catch (e) {
				console.warn('Failed to clean up previous report:', e);
			}
		}

		// Since BackstopJS doesn't expose a progress event directly in its public API easily,
		// we can at least simulate start/end or use the fact that we know the total scenarios.
		// For now, we will just rely on the running state.
		// A more complex implementation would hook into stdout or custom engine scripts to write progress to DB.
		// Let's at least initialize progress.
		
		// We can't easily get real-time progress from Backstop without parsing stdout or using a custom reporter.
		// But we can set the total count so the UI knows how much work is expected.
		// We'll update the project with the total count.
		const { saveProject } = await import('$lib/server/storage');
		project.progress = {
			total: scenarios.length * settings.viewports.length, // Total screenshots = paths * viewports
			completed: 0,
			current: 'Starting...'
		};
		await saveProject(project);

		// Helper to update progress
		// We need to poll the bitmaps directory to guess progress
		const bitmapsDir = command === 'reference' 
			? path.join(dataDir, 'bitmaps_reference')
			: path.join(dataDir, 'bitmaps_test');

		const pollProgress = setInterval(async () => {
			try {
				const files = await fs.readdir(bitmapsDir).catch(() => []);
				const pngs = files.filter(f => f.endsWith('.png')).length;
				
				// In test mode, we might see folders with timestamps, need to check latest
				// But backstop usually puts them in timestamped folders inside bitmaps_test
				// Let's just update based on what we find. 
				// Actually, simpler heuristic:
				// If reference: count pngs in bitmaps_reference
				// If test: count pngs in latest timestamp folder in bitmaps_test
				
				let count = 0;
				if (command === 'reference') {
					count = pngs;
				} else {
					// Test mode - backstop creates timestamped folders like "20251209-115317"
					const subdirs = await fs.readdir(bitmapsDir).catch(() => []);
					const timestampDirs = subdirs.filter(d => /^\d{8}-\d{6}$/.test(d)).sort().reverse();
					if (timestampDirs.length > 0) {
						const latestDir = path.join(bitmapsDir, timestampDirs[0]);
						const latestFiles = await fs.readdir(latestDir).catch(() => []);
						count = latestFiles.filter(f => f.endsWith('.png')).length;
					}
				}

				const { getProject, saveProject } = await import('$lib/server/storage');
				const currentProject = await getProject(project.id);
				if (currentProject && currentProject.progress) {
					currentProject.progress.completed = count;
					currentProject.progress.current = `Processed ${count} of ${currentProject.progress.total}`;
					await saveProject(currentProject);
				}
			} catch {
				// Ignore polling errors
			}
		}, 2000);

		await backstop(command, { config });
		
		clearInterval(pollProgress);
		return { success: true };
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		console.error('Backstop run completed with errors (likely mismatches):', errorMessage);
		return { success: false, error: errorMessage };
	}
}
