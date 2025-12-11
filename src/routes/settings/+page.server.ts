import { getSettings, saveSettings } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';
import type { Viewport } from '$lib/types';

export const load: PageServerLoad = async () => {
	const settings = await getSettings();
	return { settings };
};

export const actions: Actions = {
	save: async ({ request }) => {
		const data = await request.formData();
		const viewportsJson = data.get('viewports') as string;

		try {
			const viewports: Viewport[] = JSON.parse(viewportsJson);

			// Validate viewports
			if (!Array.isArray(viewports) || viewports.length === 0) {
				return { success: false, error: 'At least one viewport is required' };
			}

			for (const vp of viewports) {
				if (!vp.label || !vp.width || !vp.height) {
					return { success: false, error: 'Each viewport must have a label, width, and height' };
				}
				if (vp.width < 100 || vp.height < 100) {
					return { success: false, error: 'Viewport dimensions must be at least 100px' };
				}
			}

			await saveSettings({ viewports });
			return { success: true };
		} catch (e) {
			return { success: false, error: 'Invalid viewport data' };
		}
	}
};
