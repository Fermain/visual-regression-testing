export type ViewportIcon = 'monitor' | 'laptop' | 'tablet' | 'smartphone' | 'tv' | 'watch';

export interface Viewport {
	label: string;
	width: number;
	height: number;
	icon?: ViewportIcon;
}

export interface UrlPair {
	id: string;
	canonicalUrl: string;
	candidateUrl: string;
}

export interface PairResult {
	status: 'idle' | 'queued' | 'running';
	lastRun?: string;
	lastResult?: {
		success: boolean;
		command: 'reference' | 'test' | 'approve';
		error?: string;
	};
	progress?: {
		total: number;
		completed: number;
		current: string;
	};
}

export interface Project {
	id: string;
	name: string;
	paths: string[];
	delay?: number;
	clickSelector?: string;
	postInteractionWait?: number;
	hideSelectors?: string[];
	pairResults?: Record<string, PairResult>;
}

export interface Settings {
	viewports: Viewport[];
	urlPairs: UrlPair[];
	asyncCaptureLimit: number;
	asyncCompareLimit: number;
	waitTimeout: number;
	gotoTimeout: number;
}

export const DEFAULT_VIEWPORTS: Viewport[] = [
	{ label: 'desktop', width: 1440, height: 900, icon: 'monitor' },
	{ label: 'mobile', width: 390, height: 844, icon: 'smartphone' }
];

export const DEFAULT_URL_PAIRS: UrlPair[] = [];

export const DEFAULT_SETTINGS: Settings = {
	viewports: DEFAULT_VIEWPORTS,
	urlPairs: DEFAULT_URL_PAIRS,
	asyncCaptureLimit: 2,
	asyncCompareLimit: 10,
	waitTimeout: 120000,
	gotoTimeout: 120000
};

export function getPairDisplayName(pair: UrlPair): string {
	try {
		const canonical = new URL(pair.canonicalUrl).hostname;
		const candidate = new URL(pair.candidateUrl).hostname;
		return `${canonical} → ${candidate}`;
	} catch {
		return `${pair.canonicalUrl} → ${pair.candidateUrl}`;
	}
}

export function extractHostname(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return url;
	}
}
