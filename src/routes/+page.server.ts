import * as db from '$lib/server/storage';
import { getSettings } from '$lib/server/settings';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { randomUUID } from 'node:crypto';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const settings = await getSettings();
	return { projects: parentData.projects, settings };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name') as string;

		if (!name) {
			return fail(400, { missing: true });
		}

		const newProject = {
			id: randomUUID(),
			name,
			canonicalBaseUrl: '',
			candidateBaseUrl: '',
			paths: ['/']
		};

		await db.saveProject(newProject);
		throw redirect(303, `/project/${newProject.id}`);
	},
	delete: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		if (id) {
			await db.deleteProject(id);
		}
	}
};
