import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'node:fs/promises';
import path from 'node:path';

export const GET: RequestHandler = async ({ params, request }) => {
	// This handler now serves everything under data/projects/{project-id}/...

	if (!params.path) {
		throw error(404, 'File path missing');
	}

	// params.path will be like "project-id/html_report/index.html"
	const requestedPath = path.resolve('data/projects', params.path);
	const rootDir = path.resolve('data/projects');

	// Security check: ensure we don't traverse up
	if (!requestedPath.startsWith(rootDir)) {
		throw error(403, 'Access denied');
	}

	try {
		const stats = await fs.stat(requestedPath);
		if (stats.isDirectory()) {
			throw error(403, 'Directory access denied');
		}

		// Handle Conditional GET (304 Not Modified)
		const lastModified = stats.mtime.toUTCString();
		const ifModifiedSince = request.headers.get('if-modified-since');

		if (ifModifiedSince === lastModified) {
			return new Response(null, { status: 304 });
		}

		const file = await fs.readFile(requestedPath);
		const ext = path.extname(requestedPath).toLowerCase();
		let contentType = 'application/octet-stream';
		let isHtml = false;

		switch (ext) {
			case '.html':
				contentType = 'text/html';
				isHtml = true;
				break;
			case '.css':
				contentType = 'text/css';
				break;
			case '.js':
				contentType = 'application/javascript';
				break;
			case '.json':
				contentType = 'application/json';
				break;
			case '.png':
				contentType = 'image/png';
				break;
			case '.jpg':
			case '.jpeg':
				contentType = 'image/jpeg';
				break;
			case '.gif':
				contentType = 'image/gif';
				break;
			case '.svg':
				contentType = 'image/svg+xml';
				break;
			case '.woff':
				contentType = 'font/woff';
				break;
			case '.woff2':
				contentType = 'font/woff2';
				break;
			case '.ttf':
				contentType = 'font/ttf';
				break;
		}

		// Cache Handling
		const fileName = path.basename(requestedPath);
		let cacheControl = 'no-cache';
		if (requestedPath.includes('bitmaps_test') && (ext === '.png' || ext === '.jpg' || ext === '.jpeg')) {
			// Test images are immutable and heavy, cache them aggressively (1 year)
			cacheControl = 'public, max-age=31536000, immutable';
		} else if (fileName === 'config.js') {
			// config.js contains dynamic test results - never cache
			cacheControl = 'no-store, must-revalidate';
		} else if (requestedPath.includes('assets') || ext === '.js' || ext === '.css' || ext === '.woff' || ext === '.woff2' || ext === '.ttf') {
			// Static assets can be cached
			cacheControl = 'public, max-age=86400'; // 1 day
		}

		if (isHtml) {
			// Inject custom script to show Quick Links
			const htmlContent = file.toString('utf-8');
			const script = `
			<script>
				(function() {
					setInterval(function() {
						if (!window.tests || !window.tests.tests) return;
						
						// Find all generic containers that might be test cards
						// We look for elements that contain the filename, which is unique per test
						window.tests.tests.forEach(function(test) {
							if (!test.pair) return;
							var fileName = test.pair.fileName;
							if (!fileName) return;

							// Find element containing this filename
							// Backstop usually puts the filename in a <p> or <span> with a specific class, 
							// but searching by text is more robust to version changes.
							// We look for leaf nodes or close to leaf nodes.
							var xpath = "//*[contains(text(),'" + fileName + "')]";
							var matchingElement = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
							
							if (matchingElement) {
								// Walk up to find the card container. 
								// In standard backstop, there's a ReactModalPortal, and inside that...
								// Actually, the card is usually a few parents up.
								// We want to inject the links in a visible place.
								// The filename is usually at the bottom. Injecting right above it or below it is fine.
								
								var container = matchingElement.parentElement;
								if (container && !container.querySelector('.custom-deep-links')) {
									var div = document.createElement('div');
									div.className = 'custom-deep-links';
									div.style.marginTop = '8px';
									div.style.paddingTop = '8px';
									div.style.borderTop = '1px solid #eee';
									div.style.fontSize = '12px';
									div.style.fontFamily = 'monospace';
									
									div.innerHTML = 
										'<div style="display: flex; gap: 15px;">' +
											'<a href="' + test.pair.referenceUrl + '" target="_blank" style="color: #666; text-decoration: none; display: flex; align-items: center;">' +
												'<span style="margin-right: 4px;">🎯</span> Reference' + 
											'</a>' +
											'<a href="' + test.pair.url + '" target="_blank" style="color: #666; text-decoration: none; display: flex; align-items: center;">' +
												'<span style="margin-right: 4px;">🧪</span> Test' +
											'</a>' +
										'</div>';
									
									container.appendChild(div);
								}
							}
						});
					}, 1000);
				})();
			</script>
			`;
			const injectedHtml = htmlContent.replace('</body>', script + '</body>');
			
			return new Response(injectedHtml, {
				headers: {
					'Content-Type': contentType,
					'Cache-Control': cacheControl,
					'Last-Modified': lastModified
				}
			});
		}

		return new Response(file, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': cacheControl,
				'Last-Modified': lastModified
			}
		});
	} catch (e) {
		if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
			throw error(404, 'File not found');
		}
		throw e;
	}
};
