import * as db from '$lib/server/storage';
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import path from 'node:path';
import fs from 'node:fs/promises';

interface TestResult {
	projectId: string;
	projectName: string;
	lastRun: string;
	totalTests: number;
	passedTests: number;
	failedTests: number;
	tests: {
		label: string;
		viewport: string;
		status: 'pass' | 'fail';
		mismatch?: string;
	}[];
}

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const projects = parentData.projects;

	// Load reports for all projects
	const recentRuns: TestResult[] = [];

	for (const project of projects) {
		if (!project.lastRun) continue;

		try {
			const reportPath = path.resolve(`data/projects/${project.id}/json_report/jsonReport.json`);
			const reportData = await fs.readFile(reportPath, 'utf-8');
			const report = JSON.parse(reportData);

			const tests = report.tests.map((t: { pair: { label: string; viewportLabel: string; diff?: { misMatchPercentage: string } }; status: string }) => ({
				label: t.pair.label,
				viewport: t.pair.viewportLabel,
				status: t.status as 'pass' | 'fail',
				mismatch: t.pair.diff?.misMatchPercentage
			}));

			recentRuns.push({
				projectId: project.id,
				projectName: project.name,
				lastRun: project.lastRun,
				totalTests: tests.length,
				passedTests: tests.filter((t: { status: string }) => t.status === 'pass').length,
				failedTests: tests.filter((t: { status: string }) => t.status === 'fail').length,
				tests
			});
		} catch {
			// No report for this project
		}
	}

	// Sort by most recent first
	recentRuns.sort((a, b) => new Date(b.lastRun).getTime() - new Date(a.lastRun).getTime());

	return { projects, recentRuns };
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		if (id) {
			await db.deleteProject(id);
		}
		redirect(303, '/');
	}
};
