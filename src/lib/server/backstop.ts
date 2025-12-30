import backstop from 'backstopjs';
import type { Project, UrlPair } from '$lib/types';
import { getSettings } from '$lib/server/settings';
import path from 'node:path';
import fs from 'node:fs/promises';

export async function runBackstop(
	project: Project,
	urlPair: UrlPair,
	command: 'reference' | 'test' | 'approve'
) {
	// Data directory now includes URL pair ID
	const dataDir = path.resolve(`data/projects/${project.id}/${urlPair.id}`);

	// Ensure directory exists
	await fs.mkdir(dataDir, { recursive: true });

	// Get global settings
	const settings = await getSettings();

	const scenarios = project.paths.map((p: string) => {
		let url = urlPair.candidateUrl;
		let referenceUrl = urlPair.canonicalUrl;

		try {
			url = new URL(p, urlPair.candidateUrl).toString();
			referenceUrl = new URL(p, urlPair.canonicalUrl).toString();
		} catch (e) {
			console.warn(`Invalid URL combination: base=${urlPair.candidateUrl} path=${p}`, e);
		}

		const scenario: Record<string, unknown> = {
			label: p === '/' ? 'root' : p.replace(/\//g, '_'),
			url,
			referenceUrl,
			selectors: ['document'],
			misMatchThreshold: 0.1,
			delay: 3000
		};

		if (project.delay) {
			scenario.delay = project.delay;
		}
		if (project.clickSelector) {
			scenario.clickSelector = project.clickSelector;
		}
		if (project.postInteractionWait) {
			scenario.postInteractionWait = project.postInteractionWait;
		}
		if (project.hideSelectors && project.hideSelectors.length > 0) {
			scenario.hideSelectors = project.hideSelectors;
		}

		return scenario;
	});

	// Use combined ID for BackstopJS to avoid filename collisions
	const backstopId = `${project.id}_${urlPair.id}`;

	const config = {
		id: backstopId,
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
			waitTimeout: settings.waitTimeout ?? 120000,
			gotoTimeout: settings.gotoTimeout ?? 120000
		},
		asyncCaptureLimit: settings.asyncCaptureLimit ?? 2,
		asyncCompareLimit: settings.asyncCompareLimit ?? 10,
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
			} catch {
				// Ignore cleanup errors
			}
		}

		// Initialize progress for this URL pair
		const { saveProject, getProject } = await import('$lib/server/storage');
		const pairResult = {
			status: 'running' as const,
			lastRun: new Date().toISOString(),
			progress: {
				total: scenarios.length * settings.viewports.length,
				completed: 0,
				current: 'Starting...'
			}
		};

		project.pairResults = project.pairResults || {};
		project.pairResults[urlPair.id] = pairResult;
		await saveProject(project);

		// Poll progress
		const bitmapsDir =
			command === 'reference'
				? path.join(dataDir, 'bitmaps_reference')
				: path.join(dataDir, 'bitmaps_test');

		const pollProgress = setInterval(async () => {
			try {
				let count = 0;
				if (command === 'reference') {
					const files = await fs.readdir(bitmapsDir).catch(() => []);
					count = files.filter((f) => f.endsWith('.png')).length;
				} else {
					const subdirs = await fs.readdir(bitmapsDir).catch(() => []);
					const timestampDirs = subdirs
						.filter((d) => /^\d{8}-\d{6}$/.test(d))
						.sort()
						.reverse();
					if (timestampDirs.length > 0) {
						const latestDir = path.join(bitmapsDir, timestampDirs[0]);
						const latestFiles = await fs.readdir(latestDir).catch(() => []);
						count = latestFiles.filter((f) => f.endsWith('.png')).length;
					}
				}

				const currentProject = await getProject(project.id);
				if (currentProject?.pairResults?.[urlPair.id]?.progress) {
					currentProject.pairResults[urlPair.id].progress!.completed = count;
					currentProject.pairResults[urlPair.id].progress!.current =
						`Processed ${count} of ${currentProject.pairResults[urlPair.id].progress!.total}`;
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
