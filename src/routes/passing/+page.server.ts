import { getProjects } from '$lib/server/storage';
import type { PageServerLoad } from './$types';
import fs from 'node:fs/promises';
import path from 'node:path';

export type PassingPath = {
	projectId: string;
	projectName: string;
	label: string;
	viewport: string;
	url: string;
	referenceUrl: string;
};

export const load: PageServerLoad = async () => {
	const projects = await getProjects();
	const passing: PassingPath[] = [];

	for (const project of projects) {
		const reportPath = path.resolve(`data/projects/${project.id}/json_report/jsonReport.json`);
		try {
			const raw = await fs.readFile(reportPath, 'utf-8');
			const report = JSON.parse(raw);
			const tests = Array.isArray(report?.tests) ? report.tests : [];

			for (const t of tests) {
				if (t?.status === 'pass' && t?.pair) {
					passing.push({
						projectId: project.id,
						projectName: project.name,
						label: t.pair.label ?? 'unknown',
						viewport: t.pair.viewportLabel ?? 'unknown',
						url: t.pair.url ?? '',
						referenceUrl: t.pair.referenceUrl ?? ''
					});
				}
			}
		} catch {
			// No report or unreadable
		}
	}

	return { passing };
};

