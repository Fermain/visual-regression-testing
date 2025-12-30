import * as db from '$lib/server/storage';
import { getSettings } from '$lib/server/settings';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url }) => {
	const projects = await db.getProjects();
	const settings = await getSettings();
	const urlPairs = settings.urlPairs || [];

	// Get selected pair from URL param, or use first pair
	const pairId = url.searchParams.get('pair') || urlPairs[0]?.id;
	const selectedPair = urlPairs.find((p) => p.id === pairId) || urlPairs[0];

	return { projects, urlPairs, selectedPair };
};

