import * as db from '$lib/server/storage';
import { getSettings } from '$lib/server/settings';
import { runBackstop } from '$lib/server/backstop';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import path from 'node:path';
import fs from 'node:fs/promises';

export const load: PageServerLoad = async ({ params, parent }) => {
	const project = await db.getProject(params.id);
	if (!project) throw error(404, 'Project not found');

	// Get selected pair from parent layout
	const parentData = await parent();
	const selectedPair = parentData.selectedPair;

	// Data directory now includes pair ID
	const pairDataDir = selectedPair
		? path.resolve(`data/projects/${params.id}/${selectedPair.id}`)
		: null;

	let report = null;
	if (pairDataDir) {
		try {
			const reportPath = path.join(pairDataDir, 'json_report/jsonReport.json');
			const reportData = await fs.readFile(reportPath, 'utf-8');
			report = JSON.parse(reportData);
		} catch {
			// No report yet
		}
	}

	let hasReference = false;
	let referenceImages: string[] = [];
	if (pairDataDir) {
		try {
			const refPath = path.join(pairDataDir, 'bitmaps_reference');
			const files = await fs.readdir(refPath);
			referenceImages = files.filter((f) => f.endsWith('.png'));
			hasReference = referenceImages.length > 0;
		} catch {
			// No reference folder
		}
	}

	// Get pair-specific result
	const pairResult = selectedPair ? project.pairResults?.[selectedPair.id] : null;

	return {
		project,
		pairResult,
		report,
		hasReference,
		referenceImages
	};
};

export const actions: Actions = {
	run: async ({ request, params, url }) => {
		try {
			const data = await request.formData();
			const command = data.get('command') as 'reference' | 'test' | 'approve';
			const pairId = data.get('pairId') as string;

			if (!['reference', 'test', 'approve'].includes(command)) {
				return fail(400, { error: 'Invalid command', success: false });
			}

			const project = await db.getProject(params.id);
			if (!project) return fail(404, { error: 'Project not found', success: false });

			const settings = await getSettings();
			const urlPair = settings.urlPairs?.find((p) => p.id === pairId);
			if (!urlPair) return fail(400, { error: 'Invalid URL pair', success: false });

			// Check if this pair is already running
			const currentPairResult = project.pairResults?.[pairId];
			if (currentPairResult?.status === 'running') {
				return fail(409, { error: 'Test is already running for this URL pair', success: false });
			}

			// Update status to running for this pair
			project.pairResults = project.pairResults || {};
			project.pairResults[pairId] = {
				...project.pairResults[pairId],
				status: 'running',
				lastRun: new Date().toISOString()
			};
			await db.saveProject(project);

			console.log(`Starting ${command} for project ${project.id} with pair ${pairId}...`);

			// Run Backstop in the background
			(async () => {
				try {
					const result = await runBackstop(project, urlPair, command);

					const p = await db.getProject(params.id);
					if (p) {
						p.pairResults = p.pairResults || {};
						p.pairResults[pairId] = {
							status: 'idle',
							lastRun: new Date().toISOString(),
							lastResult: {
								success: result.success,
								command,
								error: result.error
							}
						};
						await db.saveProject(p);
						console.log(
							`Finished ${command} for project ${project.id} pair ${pairId}. Success: ${result.success}`
						);
					}
				} catch (e) {
					console.error('Background backstop execution failed:', e);
					const p = await db.getProject(params.id);
					if (p) {
						p.pairResults = p.pairResults || {};
						p.pairResults[pairId] = {
							status: 'idle',
							lastRun: new Date().toISOString(),
							lastResult: {
								success: false,
								command,
								error: e instanceof Error ? e.message : String(e)
							}
						};
						await db.saveProject(p);
					}
				}
			})();

			return { success: true, command, status: 'running' };
		} catch (e) {
			console.error('Unexpected error in run action:', e);
			return fail(500, {
				success: false,
				error: e instanceof Error ? e.message : 'Internal Server Error'
			});
		}
	}
};
