import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProjects } from '$lib/server/storage';
import { getSettings } from '$lib/server/settings';
import { getPairDisplayName } from '$lib/types';
import archiver from 'archiver';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { PassThrough } from 'node:stream';

export const GET: RequestHandler = async () => {
	const projects = await getProjects();
	const settings = await getSettings();
	const urlPairs = settings.urlPairs || [];

	if (projects.length === 0) {
		throw error(404, 'No projects to export');
	}

	// Create filename
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
	const filename = `visual-regression-reports_${timestamp}.zip`;

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

	// Track what we're exporting for the README
	const exportedReports: { project: string; pair: string; path: string }[] = [];

	// Add each project's reports
	for (const project of projects) {
		const safeName = project.name.replace(/[^a-zA-Z0-9-_]/g, '_');

		for (const pair of urlPairs) {
			const dataDir = path.resolve(`data/projects/${project.id}/${pair.id}`);
			const htmlReportDir = path.join(dataDir, 'html_report');

			// Only include if report exists
			if (!existsSync(htmlReportDir)) continue;

			const pairDisplay = getPairDisplayName(pair);
			const safePairName = pairDisplay.replace(/[^a-zA-Z0-9-_→]/g, '_').replace(/→/g, '-to-');
			const reportPath = `${safeName}/${safePairName}`;

			// Add directories to archive under project/pair folder
			const dirsToInclude = ['html_report', 'bitmaps_reference', 'bitmaps_test', 'json_report'];

			for (const dir of dirsToInclude) {
				const dirPath = path.join(dataDir, dir);
				if (existsSync(dirPath)) {
					archive.directory(dirPath, `${reportPath}/${dir}`);
				}
			}

			exportedReports.push({
				project: project.name,
				pair: pairDisplay,
				path: reportPath
			});
		}
	}

	if (exportedReports.length === 0) {
		throw error(404, 'No reports available to export');
	}

	// Add a master README
	const readme = `Visual Regression Test Reports - Full Export
=============================================

Exported: ${new Date().toISOString()}

Reports Included (${exportedReports.length}):
${exportedReports.map((r) => `- ${r.project} (${r.pair})\n  Path: ${r.path}/`).join('\n')}

How to View
-----------
1. Extract this ZIP file
2. Navigate to any project folder
3. Open html_report/index.html in a web browser

For best results, use a local HTTP server:
  npx serve .
  Then browse to the project folders

Directory Structure
-------------------
${exportedReports.map((r) => `${r.path}/\n  ├── html_report/     - Interactive report\n  ├── bitmaps_reference/ - Baseline screenshots\n  ├── bitmaps_test/    - Test screenshots & diffs\n  └── json_report/     - JSON results`).join('\n\n')}
`;

	archive.append(readme, { name: 'README.txt' });

	// Add an index HTML file for easy navigation
	const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Regression Reports</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background: #0a0a0a;
            color: #fafafa;
        }
        h1 { border-bottom: 1px solid #333; padding-bottom: 0.5rem; }
        .report-card {
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 1rem;
            margin: 1rem 0;
        }
        .report-card h3 { margin: 0 0 0.5rem 0; color: #fafafa; }
        .report-card p { margin: 0.25rem 0; color: #888; font-size: 0.875rem; }
        .report-card a {
            display: inline-block;
            margin-top: 0.75rem;
            padding: 0.5rem 1rem;
            background: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-size: 0.875rem;
        }
        .report-card a:hover { background: #1d4ed8; }
        .note {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 1rem;
            margin: 1rem 0;
            font-size: 0.875rem;
        }
        .note strong { color: #60a5fa; }
        code { background: #333; padding: 0.2rem 0.4rem; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>Visual Regression Reports</h1>
    <p>Exported: ${new Date().toISOString()}</p>
    
    <div class="note">
        <strong>Note:</strong> For images to load correctly, serve this folder with a local HTTP server:<br>
        <code>npx serve .</code> then open <code>http://localhost:3000</code>
    </div>

    <h2>Reports (${exportedReports.length})</h2>
    ${exportedReports
			.map(
				(r) => `
    <div class="report-card">
        <h3>${r.project}</h3>
        <p>${r.pair}</p>
        <a href="${r.path}/html_report/index.html">View Report</a>
    </div>`
			)
			.join('')}
</body>
</html>`;

	archive.append(indexHtml, { name: 'index.html' });

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


