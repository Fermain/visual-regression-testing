import * as db from '$lib/server/storage';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { randomUUID } from 'node:crypto';

export const load: PageServerLoad = async () => {
	const projects = await db.getProjects();
	const pathMap: Record<string, string[]> = {};

	for (const project of projects) {
		for (const p of project.paths) {
			if (!pathMap[p]) pathMap[p] = [];
			pathMap[p].push(project.name);
		}
	}

	return { pathMap };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const pathsStr = data.get('paths') as string;
		const delayStr = data.get('delay') as string;
		const clickSelector = data.get('clickSelector') as string;
		const postInteractionWaitStr = data.get('postInteractionWait') as string;
		const hideSelectorsStr = data.get('hideSelectors') as string;

		if (!name?.trim()) {
			return fail(400, { error: 'Project name is required' });
		}

		const paths = pathsStr
			? pathsStr
					.split('\n')
					.map((p) => p.trim())
					.filter((p) => p)
			: ['/'];

		const hideSelectors = hideSelectorsStr
			? hideSelectorsStr
					.split('\n')
					.map((s) => s.trim())
					.filter((s) => s)
			: undefined;

		const newProject = {
			id: randomUUID(),
			name: name.trim(),
			paths,
			delay: delayStr ? parseInt(delayStr, 10) : undefined,
			clickSelector: clickSelector?.trim() || undefined,
			postInteractionWait: postInteractionWaitStr ? parseInt(postInteractionWaitStr, 10) : undefined,
			hideSelectors: hideSelectors && hideSelectors.length > 0 ? hideSelectors : undefined
		};

		await db.saveProject(newProject);
		redirect(303, `/project/${newProject.id}`);
	}
};

