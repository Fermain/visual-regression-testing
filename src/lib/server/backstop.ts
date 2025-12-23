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
			misMatchThreshold: 0.1
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
			args: ['--no-sandbox']
		},
		asyncCaptureLimit: 5,
		asyncCompareLimit: 50,
		debug: false,
		debugWindow: false,
		openReport: false
	};

	try {
		await backstop(command, { config });
		return { success: true };
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		console.error('Backstop run completed with errors (likely mismatches):', errorMessage);
		return { success: false, error: errorMessage };
	}
}
