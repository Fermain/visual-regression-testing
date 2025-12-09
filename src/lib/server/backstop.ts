import backstop from 'backstopjs';
import type { Project } from '$lib/types';
import path from 'node:path';
import fs from 'node:fs/promises';

export async function runBackstop(project: Project, command: 'reference' | 'test' | 'approve') {
	const dataDir = path.resolve(`data/projects/${project.id}`);

	// Ensure project directory exists
	await fs.mkdir(dataDir, { recursive: true });

	const scenarios = project.paths.map((p: string) => {
		// Basic validation to ensure we don't crash on invalid URLs
		let url = project.candidateBaseUrl;
		let referenceUrl = project.canonicalBaseUrl;

		try {
			url = new URL(p, project.candidateBaseUrl).toString();
			referenceUrl = new URL(p, project.canonicalBaseUrl).toString();
		} catch (e) {
			console.warn(`Invalid URL combination: base=${project.candidateBaseUrl} path=${p}`, e);
			// Fallback or skip? For now let's try to proceed, backstop might fail this scenario
		}

		return {
			label: p === '/' ? 'root' : p.replace(/\//g, '_'),
			url,
			referenceUrl,
			selectors: ['document'], // Default to document
			misMatchThreshold: 0.1
			// Add other default scenario options here
		};
	});

	const config = {
		id: project.id,
		viewports: project.viewports,
		onBeforeScript: 'puppeteer/onBefore.cjs',
		onReadyScript: 'puppeteer/onReady.cjs',
		scenarios,
		paths: {
			bitmaps_reference: path.join(dataDir, 'bitmaps_reference'),
			bitmaps_test: path.join(dataDir, 'bitmaps_test'),
			engine_scripts: path.resolve('data/engine_scripts'), // Use a shared folder for scripts
			html_report: path.join(dataDir, 'html_report'),
			ci_report: path.join(dataDir, 'ci_report'),
			json_report: path.join(dataDir, 'json_report')
		},
		report: ['json', 'browser'], // Generate both. 'browser' generates the static HTML report.
		engine: 'puppeteer',
		engineOptions: {
			args: ['--no-sandbox']
		},
		asyncCaptureLimit: 5,
		asyncCompareLimit: 50,
		debug: false,
		debugWindow: false
	};

	try {
		// BackstopJS promise rejects on test failure (diffs found), which is "normal" for tests
		await backstop(command, { config });
		return { success: true };
	} catch (err) {
		// If it's a test failure (mismatch), it's not a system error.
		console.error('Backstop run completed with errors (likely mismatches):', err);
		return { success: false, error: err };
	}
}
