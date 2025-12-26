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
		const asyncCaptureLimit = Number(data.get('asyncCaptureLimit'));
		const asyncCompareLimit = Number(data.get('asyncCompareLimit'));
		const waitTimeout = Number(data.get('waitTimeout'));
		const gotoTimeout = Number(data.get('gotoTimeout'));

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

			// Validate other settings
			if (asyncCaptureLimit < 1) return { success: false, error: 'Capture concurrency must be at least 1' };
			if (asyncCompareLimit < 1) return { success: false, error: 'Compare concurrency must be at least 1' };
			if (waitTimeout < 1000) return { success: false, error: 'Wait timeout must be at least 1000ms' };
			if (gotoTimeout < 1000) return { success: false, error: 'Goto timeout must be at least 1000ms' };

			await saveSettings({ 
				viewports,
				asyncCaptureLimit,
				asyncCompareLimit,
				waitTimeout,
				gotoTimeout
			});
			return { success: true };
		} catch (e) {
			return { success: false, error: 'Invalid data' };
		}
	}
};


