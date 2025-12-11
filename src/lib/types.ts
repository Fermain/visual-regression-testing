export type ViewportIcon = 'monitor' | 'laptop' | 'tablet' | 'smartphone' | 'tv' | 'watch';

export interface Viewport {
	label: string;
	width: number;
	height: number;
	icon?: ViewportIcon;
}

export interface Project {
	id: string;
	name: string;
	canonicalBaseUrl: string;
	candidateBaseUrl: string;
	paths: string[];
	clickSelector?: string;
	postInteractionWait?: number;
	lastRun?: string;
}

export interface Settings {
	viewports: Viewport[];
}

export const DEFAULT_VIEWPORTS: Viewport[] = [
	{ label: 'desktop', width: 1440, height: 900, icon: 'monitor' },
	{ label: 'mobile', width: 390, height: 844, icon: 'smartphone' }
];

export const DEFAULT_SETTINGS: Settings = {
	viewports: DEFAULT_VIEWPORTS
};
