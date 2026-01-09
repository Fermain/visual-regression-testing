import * as db from '$lib/server/db';
import { getPairDisplayName } from '$lib/types';
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import path from 'node:path';
import fs from 'node:fs/promises';

function extractPath(url: string): string {
	try {
		const u = new URL(url);
		return u.pathname || '/';
	} catch {
		return url;
	}
}

interface TestResult {
	projectId: string;
	projectName: string;
	pairId: string;
	pairDisplay: string;
	lastRun: string;
	totalTests: number;
	passedTests: number;
	failedTests: number;
	tests: {
		path: string;
		viewport: string;
		status: 'pass' | 'fail';
		mismatch?: string;
	}[];
}

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const projects = parentData.projects;
	const settings = db.getSettings();
	const urlPairs = settings.urlPairs || [];

	// Load reports for all projects and URL pairs
	const recentRuns: TestResult[] = [];

	for (const project of projects) {
		for (const pair of urlPairs) {
			const pairResult = project.pairResults?.[pair.id];
			if (!pairResult?.lastRun) continue;

			try {
				const reportPath = path.resolve(
					`data/projects/${project.id}/${pair.id}/json_report/jsonReport.json`
				);
				const reportData = await fs.readFile(reportPath, 'utf-8');
				const report = JSON.parse(reportData);

				// Safely handle missing or malformed tests array
				const rawTests = Array.isArray(report?.tests) ? report.tests : [];
				const tests = rawTests
					.filter((t: unknown) => t && typeof t === 'object' && 'pair' in t && 'status' in t)
					.map(
						(t: {
							pair: { url?: string; viewportLabel: string; diff?: { misMatchPercentage: string } };
							status: string;
						}) => ({
							path: extractPath(t.pair?.url ?? ''),
							viewport: t.pair?.viewportLabel ?? 'unknown',
							status: t.status as 'pass' | 'fail',
							mismatch: t.pair?.diff?.misMatchPercentage
						})
					);

				recentRuns.push({
					projectId: project.id,
					projectName: project.name,
					pairId: pair.id,
					pairDisplay: getPairDisplayName(pair),
					lastRun: pairResult.lastRun,
					totalTests: tests.length,
					passedTests: tests.filter((t: { status: string }) => t.status === 'pass').length,
					failedTests: tests.filter((t: { status: string }) => t.status === 'fail').length,
					tests
				});
			} catch (e) {
				// Log but don't fail - report may be missing, corrupted, or mid-write
				console.warn(`Failed to read report for ${project.id}/${pair.id}:`, e);
			}
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
			db.deleteProject(id);
		}
		redirect(303, '/');
	}
};
