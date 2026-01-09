import { getProjects, getSettings, saveProject, getProject } from '$lib/server/db';
import { getPairDisplayName } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
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

export const actions: Actions = {
	createProject: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const pathsJson = data.get('paths') as string;
		const sourceProjectId = data.get('sourceProjectId') as string | null;

		if (!name?.trim()) {
			return fail(400, { error: 'Project name is required' });
		}

		let paths: string[] = [];
		try {
			paths = JSON.parse(pathsJson);
			if (!Array.isArray(paths) || paths.length === 0) {
				return fail(400, { error: 'At least one path is required' });
			}
		} catch {
			return fail(400, { error: 'Invalid paths data' });
		}

		const uniquePaths = [...new Set(paths)];

		let baseSettings: {
			delay?: number;
			clickSelector?: string;
			postInteractionWait?: number;
			hideSelectors?: string[];
		} = {};

		if (sourceProjectId) {
			const sourceProject = getProject(sourceProjectId);
			if (sourceProject) {
				baseSettings = {
					delay: sourceProject.delay,
					clickSelector: sourceProject.clickSelector,
					postInteractionWait: sourceProject.postInteractionWait,
					hideSelectors: sourceProject.hideSelectors
				};
			}
		}

		const newProject = {
			id: randomUUID(),
			name: name.trim(),
			paths: uniquePaths,
			...baseSettings
		};

		saveProject(newProject);
		redirect(303, `/project/${newProject.id}`);
	}
};

