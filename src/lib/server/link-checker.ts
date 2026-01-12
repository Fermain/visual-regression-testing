import { LinkChecker, LinkState, type LinkResult as LinkinatorResult } from 'linkinator';
import type { Project, UrlPair, LinkCheckRunResult, LinkResult } from '$lib/types';
import { updateLinkCheckResult, getSettings } from './db';

export async function runLinkCheck(
	project: Project,
	urlPair: UrlPair
): Promise<{ success: boolean; error?: string }> {
	const settings = await getSettings();
	const config = project.linkCheckerConfig || settings.linkCheckerConfig || {};

	updateLinkCheckResult(project.id, urlPair.id, {
		status: 'running',
		lastRun: new Date().toISOString()
	});

	try {
		const canonicalResult = await executeCheck(urlPair.canonicalUrl, project.paths, config);
		const candidateResult = await executeCheck(urlPair.candidateUrl, project.paths, config);

		updateLinkCheckResult(project.id, urlPair.id, {
			status: 'idle',
			canonical: canonicalResult,
			candidate: candidateResult
		});

		return { success: true };
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		updateLinkCheckResult(project.id, urlPair.id, {
			status: 'idle',
			error: errorMessage
		});
		return { success: false, error: errorMessage };
	}
}

async function executeCheck(
	baseUrl: string,
	paths: string[],
	config: NonNullable<Project['linkCheckerConfig']>
): Promise<LinkCheckRunResult> {
	const urls = paths.map((p) => {
		try {
			return new URL(p, baseUrl).toString();
		} catch {
			return baseUrl + p;
		}
	});

	const checker = new LinkChecker();
	const allLinks: LinkResult[] = [];

	checker.on('link', (result: LinkinatorResult) => {
		allLinks.push({
			url: result.url,
			status: result.state === LinkState.OK ? 'OK' : result.state === LinkState.SKIPPED ? 'Skipped' : 'Error',
			message: result.status ? `HTTP ${result.status}` : undefined
		});
	});

	console.log(`[LinkChecker] Running check for: ${urls.join(', ')}`);

	const result = await checker.check({
		path: urls,
		recurse: false,
		concurrency: config.maxConcurrency ?? 10,
		timeout: (config.timeout ?? 20) * 1000,
		linksToSkip: config.exclude ?? [],
		retry: true,
		retryErrors: true,
		retryErrorsCount: 3
	});

	const failed = result.links.filter((l) => l.state === LinkState.BROKEN).length;

	return {
		url: baseUrl,
		links: allLinks,
		total: result.links.length,
		failed
	};
}
