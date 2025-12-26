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

			if (project.status === 'running') {
				return fail(409, { error: 'Test is already running', success: false });
			}

			// Update status to running
			project.status = 'running';
			project.lastRun = new Date().toISOString();
			await db.saveProject(project);

			console.log(`Starting ${command} for project ${project.id}...`);

			// Run Backstop in the background (fire and forget)
			(async () => {
				try {
					const result = await runBackstop(project, command);
					
					// Re-fetch project to get latest state (in case of other updates)
					const p = await db.getProject(params.id);
					if (p) {
						p.status = 'idle';
						p.lastResult = {
							success: result.success,
							command,
							error: result.error
						};
						await db.saveProject(p);
						console.log(`Finished ${command} for project ${project.id}. Success: ${result.success}`);
					}
				} catch (e) {
					console.error('Background backstop execution failed:', e);
					const p = await db.getProject(params.id);
					if (p) {
						p.status = 'idle';
						p.lastResult = {
							success: false,
							command,
							error: e instanceof Error ? e.message : String(e)
						};
						await db.saveProject(p);
					}
				}
			})();

			// Return immediately indicating the process started
			return { success: true, command, status: 'running' };
		} catch (e) {
			console.error('Unexpected error in run action:', e);
			// If we fail here, we should try to reset the project status if we set it
			try {
				const project = await db.getProject(params.id);
				if (project && project.status === 'running') {
					project.status = 'idle';
					await db.saveProject(project);
				}
			} catch { /* ignore */ }

			return fail(500, {
				success: false,
				error: e instanceof Error ? e.message : 'Internal Server Error'
			});
		}
	}
};
