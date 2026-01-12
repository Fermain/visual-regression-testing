import { LinkChecker, LinkState, type LinkResult as LinkinatorResult } from 'linkinator';
import type {
	Project,
	UrlPair,
	LinkCheckRunResult,
	LinkResult,
	LinkCheckerConfig
} from '$lib/types';
import { updateLinkCheckResult, getSettings } from './db';

export const DEFAULT_IGNORED_PARAMS = ['ver', 'v', '_', 't', 'timestamp', 'cache', 'cb', 'nocache'];

export function normalizeUrl(url: string, ignoreParams: string[]): string {
	try {
		const parsed = new URL(url);
		const paramsToRemove = [...DEFAULT_IGNORED_PARAMS, ...ignoreParams];

		for (const param of paramsToRemove) {
			parsed.searchParams.delete(param);
		}

		// Sort remaining params for consistent comparison
		parsed.searchParams.sort();

		return parsed.toString();
	} catch {
		return url;
	}
}

export async function runLinkCheck(
	project: Project,
	urlPair: UrlPair
): Promise<{ success: boolean; error?: string }> {
	const settings = await getSettings();
	const config = project.linkCheckerConfig || settings.linkCheckerConfig || {};

	updateLinkCheckResult(project.id, urlPair.id, {
		status: 'running',
		lastRun: new Date().toISOString(),
		progress: { phase: 'canonical', checked: 0 }
	});

	try {
		const canonicalResult = await executeCheck(
			urlPair.canonicalUrl,
			project.paths,
			config,
			(checked, current) => {
				updateLinkCheckResult(project.id, urlPair.id, {
					progress: { phase: 'canonical', checked, current }
				});
			}
		);

		updateLinkCheckResult(project.id, urlPair.id, {
			progress: { phase: 'candidate', checked: 0 }
		});

		const candidateResult = await executeCheck(
			urlPair.candidateUrl,
			project.paths,
			config,
			(checked, current) => {
				updateLinkCheckResult(project.id, urlPair.id, {
					progress: { phase: 'candidate', checked, current }
				});
			}
		);

		updateLinkCheckResult(project.id, urlPair.id, {
			status: 'idle',
			canonical: canonicalResult,
			candidate: candidateResult,
			progress: null
		});

		return { success: true };
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		updateLinkCheckResult(project.id, urlPair.id, {
			status: 'idle',
			error: errorMessage,
			progress: null
		});
		return { success: false, error: errorMessage };
	}
}

export async function executeCheck(
	baseUrl: string,
	paths: string[],
	config: LinkCheckerConfig,
	onProgress?: (checked: number, current: string) => void
): Promise<LinkCheckRunResult> {
	const urls = paths.map((p) => {
		try {
			return new URL(p, baseUrl).toString();
		} catch {
			return baseUrl + p;
		}
	});

	const ignoreParams = config.ignoreQueryParams ?? [];
	const checker = new LinkChecker();
	const allLinks: LinkResult[] = [];
	let checkedCount = 0;

	checker.on('link', (result: LinkinatorResult) => {
		checkedCount++;

		const link: LinkResult = {
			url: result.url,
			normalizedUrl: normalizeUrl(result.url, ignoreParams),
			status:
				result.state === LinkState.OK
					? 'OK'
					: result.state === LinkState.SKIPPED
						? 'Skipped'
						: 'Error',
			statusCode: result.status,
			parent: result.parent
		};

		if (result.status && result.state !== LinkState.OK) {
			link.message = `HTTP ${result.status}`;
		}

		allLinks.push(link);

		if (onProgress) {
			onProgress(checkedCount, result.url);
		}
	});

	console.log(`[LinkChecker] Running check for: ${urls.join(', ')}`);

	const start = Date.now();
	
	// Add a hard timeout for the entire check
	const timeoutMs = (config.timeout ?? 120) * 1000;
	
	const checkPromise = checker.check({
		path: urls,
		recurse: false,
		concurrency: config.maxConcurrency ?? 10,
		timeout: 30000, // individual link timeout
		linksToSkip: config.exclude ?? [],
		retry: true,
		retryErrors: true,
		retryErrorsCount: 3
	});

	const timeoutPromise = new Promise<never>((_, reject) => 
		setTimeout(() => reject(new Error(`Link check timed out after ${timeoutMs}ms`)), timeoutMs)
	);

	const result = await Promise.race([checkPromise, timeoutPromise]);
	
	const duration = Date.now() - start;
	console.log(`[LinkChecker] Finished check for ${baseUrl} in ${duration}ms. Found ${result.links.length} links.`);

	const failed = result.links.filter((l) => l.state === LinkState.BROKEN).length;

	return {
		url: baseUrl,
		links: allLinks,
		total: result.links.length,
		failed
	};
}
