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

	return { project, report };
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const data = await request.formData();
		const project = await db.getProject(params.id);
		if (!project) return fail(404, { message: 'Project not found' });

		const name = data.get('name') as string;
		const canonicalBaseUrl = data.get('canonicalBaseUrl') as string;
		const candidateBaseUrl = data.get('candidateBaseUrl') as string;
		const pathsStr = data.get('paths') as string;

		project.name = name;
		project.canonicalBaseUrl = canonicalBaseUrl;
		project.candidateBaseUrl = candidateBaseUrl;
		project.paths = pathsStr
			.split('\n')
			.map((p) => p.trim())
			.filter((p) => p);

		await db.saveProject(project);
		return { success: true };
	},
	run: async ({ request, params }) => {
		const data = await request.formData();
		const command = data.get('command') as 'reference' | 'test' | 'approve';

		if (!['reference', 'test', 'approve'].includes(command)) {
			return fail(400, { message: 'Invalid command' });
		}

		const project = await db.getProject(params.id);
		if (!project) return fail(404, { message: 'Project not found' });

		// Save timestamp
		project.lastRun = new Date().toISOString();
		await db.saveProject(project);

		console.log(`Starting ${command} for project ${project.id}...`);
		const result = await runBackstop(project, command);
		console.log(`Finished ${command} for project ${project.id}. Success: ${result.success}`);

		return { success: result.success, command, error: result.error };
	}
};
