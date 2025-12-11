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
	try {
		const refPath = path.resolve(`data/projects/${params.id}/bitmaps_reference`);
		const files = await fs.readdir(refPath);
		hasReference = files.some(f => f.endsWith('.png'));
	} catch {
		// No reference folder
	}

	return { project, report, hasReference };
};

export const actions: Actions = {
	run: async ({ request, params }) => {
		const data = await request.formData();
		const command = data.get('command') as 'reference' | 'test' | 'approve';

		if (!['reference', 'test', 'approve'].includes(command)) {
			return fail(400, { error: 'Invalid command' });
		}

		const project = await db.getProject(params.id);
		if (!project) return fail(404, { error: 'Project not found' });

		// Save timestamp
		project.lastRun = new Date().toISOString();
		await db.saveProject(project);

		console.log(`Starting ${command} for project ${project.id}...`);
		const result = await runBackstop(project, command);
		console.log(`Finished ${command} for project ${project.id}. Success: ${result.success}`);

		return { success: result.success, command, error: result.error };
	}
};
