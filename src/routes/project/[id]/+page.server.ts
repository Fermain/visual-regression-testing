import * as db from '$lib/server/storage';
import { runBackstop } from '$lib/server/backstop';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import path from 'node:path';
import fs from 'node:fs/promises';

export const load: PageServerLoad = async ({ params }) => {
	const project = await db.getProject(params.id);
	if (!project) throw error(404, 'Project not found');

	let report = null;
	try {
		const reportPath = path.resolve(`data/projects/${params.id}/json_report/jsonReport.json`);
		const reportData = await fs.readFile(reportPath, 'utf-8');
		report = JSON.parse(reportData);
	} catch {
		// No report yet or error reading
	}

	let hasReference = false;
	let referenceImages: string[] = [];
	try {
		const refPath = path.resolve(`data/projects/${params.id}/bitmaps_reference`);
		const files = await fs.readdir(refPath);
		referenceImages = files.filter(f => f.endsWith('.png'));
		hasReference = referenceImages.length > 0;
	} catch {
		// No reference folder
	}

	return { project, report, hasReference, referenceImages };
};

export const actions: Actions = {
	run: async ({ request, params }) => {
		try {
			const data = await request.formData();
			const command = data.get('command') as 'reference' | 'test' | 'approve';

			if (!['reference', 'test', 'approve'].includes(command)) {
				return fail(400, { error: 'Invalid command', success: false });
			}

			const project = await db.getProject(params.id);
			if (!project) return fail(404, { error: 'Project not found', success: false });

			// Save timestamp
			project.lastRun = new Date().toISOString();
			await db.saveProject(project);

			console.log(`Starting ${command} for project ${project.id}...`);
			const result = await runBackstop(project, command);
			console.log(`Finished ${command} for project ${project.id}. Success: ${result.success}`);

			if (!result.success) {
				// If it's a test run, failure usually means mismatches, which is a valid state where we want to see the report.
				// If it's a reference creation, failure is an actual error.
				// In both cases, we return the result. We don't use fail(500) because that might be interpreted as a system crash.
				// For reference creation errors, the UI will show the error message from the result object.
				return { 
					success: false, 
					command, 
					error: result.error || 'Backstop execution failed' 
				};
			}

			return { success: result.success, command, error: result.error };
		} catch (e) {
			console.error('Unexpected error in run action:', e);
			return fail(500, {
				success: false,
				error: e instanceof Error ? e.message : 'Internal Server Error'
			});
		}
	}
};
