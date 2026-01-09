import * as db from '$lib/server/db';
import { addJob, getQueuePosition, getJobStatus } from '$lib/server/queue';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import path from 'node:path';
import fs from 'node:fs/promises';

export const load: PageServerLoad = async ({ params, parent }) => {
	const project = db.getProject(params.id);
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

	// Get pair-specific result from project
	const pairResult = selectedPair ? project.pairResults?.[selectedPair.id] : null;

	// Get queue status
	const queueJob = selectedPair ? getJobStatus(params.id, selectedPair.id) : null;
	const queuePosition = selectedPair ? getQueuePosition(params.id, selectedPair.id) : -1;

	return {
		project,
		pairResult,
		queueJob,
		queuePosition,
		report,
		hasReference,
		referenceImages
	};
};

export const actions: Actions = {
	run: async ({ request, params }) => {
		try {
			const data = await request.formData();
			const command = data.get('command') as 'reference' | 'test' | 'approve';
			const pairId = data.get('pairId') as string;

			if (!['reference', 'test', 'approve'].includes(command)) {
				return fail(400, { error: 'Invalid command', success: false });
			}

		const project = db.getProject(params.id);
		if (!project) return fail(404, { error: 'Project not found', success: false });

		const settings = db.getSettings();
			const urlPair = settings.urlPairs?.find((p) => p.id === pairId);
			if (!urlPair) return fail(400, { error: 'Invalid URL pair', success: false });

			// Add to queue (queue handles duplicate checking)
			const job = addJob(params.id, pairId, command);

			// Update project status to queued if not already running
			if (job.status === 'queued') {
				db.updatePairResult(params.id, pairId, {
					status: 'queued',
					lastRun: new Date().toISOString()
				});
			}

			return { 
				success: true, 
				command, 
				status: job.status,
				queuePosition: getQueuePosition(params.id, pairId)
			};
		} catch (e) {
			console.error('Unexpected error in run action:', e);
			return fail(500, {
				success: false,
				error: e instanceof Error ? e.message : 'Internal Server Error'
			});
		}
	}
};
