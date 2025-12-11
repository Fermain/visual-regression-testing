import * as db from '$lib/server/storage';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const project = await db.getProject(params.id);
	if (!project) throw error(404, 'Project not found');
	return { project };
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const data = await request.formData();
		const project = await db.getProject(params.id);
		if (!project) return fail(404, { error: 'Project not found' });

		const name = data.get('name') as string;
		const canonicalBaseUrl = data.get('canonicalBaseUrl') as string;
		const candidateBaseUrl = data.get('candidateBaseUrl') as string;
		const pathsStr = data.get('paths') as string;
		const clickSelector = data.get('clickSelector') as string;
		const postInteractionWaitStr = data.get('postInteractionWait') as string;

		if (!name?.trim()) {
			return fail(400, { error: 'Project name is required' });
		}

		project.name = name.trim();
		project.canonicalBaseUrl = canonicalBaseUrl?.trim() || '';
		project.candidateBaseUrl = candidateBaseUrl?.trim() || '';
		project.paths = pathsStr
			? pathsStr
					.split('\n')
					.map((p) => p.trim())
					.filter((p) => p)
			: ['/'];
		project.clickSelector = clickSelector?.trim() || undefined;
		project.postInteractionWait = postInteractionWaitStr ? parseInt(postInteractionWaitStr, 10) : undefined;

		await db.saveProject(project);
		redirect(303, `/project/${params.id}`);
	},
	delete: async ({ params }) => {
		await db.deleteProject(params.id);
		redirect(303, '/');
	}
};

