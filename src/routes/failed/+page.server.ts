import { getProjects } from '$lib/server/storage';
import { getSettings } from '$lib/server/settings';
import { getPairDisplayName } from '$lib/types';
import type { PageServerLoad } from './$types';
import fs from 'node:fs/promises';
import path from 'node:path';

export type FailedPath = {
	projectId: string;
	projectName: string;
	pairId: string;
	pairDisplay: string;
	label: string;
	viewport: string;
	url: string;
	referenceUrl: string;
	mismatch: string;
	diffImage: string;
};

export const load: PageServerLoad = async () => {
	const projects = await getProjects();
	const settings = await getSettings();
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
						failed.push({
							projectId: project.id,
							projectName: project.name,
							pairId: pair.id,
							pairDisplay: getPairDisplayName(pair),
							label: t.pair.label ?? 'unknown',
							viewport: t.pair.viewportLabel ?? 'unknown',
							url: t.pair.url ?? '',
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

