export interface Viewport {
	label: string;
	width: number;
	height: number;
}

export interface Project {
	id: string;
	name: string;
	canonicalBaseUrl: string;
	candidateBaseUrl: string;
	paths: string[];
	viewports: Viewport[];
	lastRun?: string;
}

export const DEFAULT_VIEWPORTS: Viewport[] = [
	{ label: 'desktop', width: 1440, height: 900 },
	{ label: 'mobile', width: 390, height: 844 }
];
