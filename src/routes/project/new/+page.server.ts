import * as db from '$lib/server/storage';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { randomUUID } from 'node:crypto';

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const canonicalBaseUrl = data.get('canonicalBaseUrl') as string;
		const candidateBaseUrl = data.get('candidateBaseUrl') as string;
		const pathsStr = data.get('paths') as string;

		if (!name?.trim()) {
			return fail(400, { error: 'Project name is required' });
		}

		const paths = pathsStr
			? pathsStr
					.split('\n')
					.map((p) => p.trim())
					.filter((p) => p)
			: ['/'];

		const newProject = {
			id: randomUUID(),
			name: name.trim(),
			canonicalBaseUrl: canonicalBaseUrl?.trim() || '',
			candidateBaseUrl: candidateBaseUrl?.trim() || '',
			paths
		};

		await db.saveProject(newProject);
		redirect(303, `/project/${newProject.id}`);
	}
};

