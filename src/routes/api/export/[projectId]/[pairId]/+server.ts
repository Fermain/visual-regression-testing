import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProject } from '$lib/server/storage';
import { getSettings } from '$lib/server/settings';
import { getPairDisplayName } from '$lib/types';
import archiver from 'archiver';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { PassThrough } from 'node:stream';

export const GET: RequestHandler = async ({ params }) => {
	const { projectId, pairId } = params;

	const project = await getProject(projectId);
	if (!project) {
		throw error(404, 'Project not found');
	}

	const settings = await getSettings();
	const pair = settings.urlPairs?.find((p) => p.id === pairId);
	if (!pair) {
		throw error(404, 'URL pair not found');
	}

	const dataDir = path.resolve(`data/projects/${projectId}/${pairId}`);

	// Check if report exists
	const htmlReportDir = path.join(dataDir, 'html_report');
	if (!existsSync(htmlReportDir)) {
		throw error(404, 'No report available for export');
	}

	// Create filename
	const safeName = project.name.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 30);
	const pairDisplay = getPairDisplayName(pair).replace(/[^a-zA-Z0-9-_→]/g, '_').slice(0, 40);
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
	const filename = `${safeName}_${timestamp}.zip`;

	// Create a pass-through stream for the response
	const passthrough = new PassThrough();

	// Create archive
	const archive = archiver('zip', {
		zlib: { level: 6 }
	});

	archive.on('error', (err) => {
		console.error('Archive error:', err);
		passthrough.destroy(err);
	});

	// Pipe archive to passthrough
	archive.pipe(passthrough);

	// Add directories to archive
	const dirsToInclude = ['html_report', 'bitmaps_reference', 'bitmaps_test', 'json_report'];

	for (const dir of dirsToInclude) {
		const dirPath = path.join(dataDir, dir);
		if (existsSync(dirPath)) {
			archive.directory(dirPath, dir);
		}
	}

	// Add a README with context
	const readme = `Visual Regression Test Report
=============================

Project: ${project.name}
URL Pair: ${getPairDisplayName(pair)}
  - Reference: ${pair.canonicalUrl}
  - Candidate: ${pair.candidateUrl}

Exported: ${new Date().toISOString()}

How to View
-----------
1. Extract this ZIP file
2. Open html_report/index.html in a web browser

Note: For best results, use a local HTTP server:
  npx serve .
  Then open http://localhost:3000/html_report/

Directories
-----------
- html_report/     - Interactive visual comparison report
- bitmaps_reference/ - Baseline reference screenshots
- bitmaps_test/    - Test screenshots and diff images
- json_report/     - Machine-readable JSON results
`;

	archive.append(readme, { name: 'README.txt' });

	// Finalize archive
	archive.finalize();

	// Return streaming response
	return new Response(passthrough as unknown as ReadableStream, {
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Cache-Control': 'no-cache'
		}
	});
};

