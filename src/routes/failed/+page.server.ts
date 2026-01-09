import { getProjects, getSettings } from '$lib/server/db';
import { getPairDisplayName } from '$lib/types';
import type { PageServerLoad } from './$types';
import fs from 'node:fs/promises';
import path from 'node:path';

export type FailedPath = {
	projectId: string;
	projectName: string;
	pairId: string;
	pairDisplay: string;
	path: string;
	viewport: string;
	url: string;
	referenceUrl: string;
	mismatch: string;
	diffImage: string;
};

function extractPath(url: string): string {
	try {
		const u = new URL(url);
		return u.pathname || '/';
	} catch {
		return url;
	}
}

export const load: PageServerLoad = async () => {
	const projects = getProjects();
	const settings = getSettings();
	const urlPairs = settings.urlPairs || [];
	const failed: FailedPath[] = [];

	for (const project of projects) {
		for (const pair of urlPairs) {
			const reportPath = path.resolve(
				`data/projects/${project.id}/${pair.id}/json_report/jsonReport.json`
			);
			try {
				const raw = await fs.readFile(reportPath, 'utf-8');
				const report = JSON.parse(raw);
				const tests = Array.isArray(report?.tests) ? report.tests : [];

				for (const t of tests) {
					if (t?.status === 'fail' && t?.pair) {
						const url = t.pair.url ?? '';
						failed.push({
							projectId: project.id,
							projectName: project.name,
							pairId: pair.id,
							pairDisplay: getPairDisplayName(pair),
							path: extractPath(url),
							viewport: t.pair.viewportLabel ?? 'unknown',
							url,
							referenceUrl: t.pair.referenceUrl ?? '',
							mismatch: t.pair.diff?.misMatchPercentage ?? '?',
							diffImage: t.pair.diffImage ?? ''
						});
					}
				}
			} catch {
				// No report or unreadable
			}
		}
	}

	return { failed };
};

