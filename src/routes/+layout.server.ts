import * as db from '$lib/server/storage';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	const projects = await db.getProjects();
	return { projects };
};

