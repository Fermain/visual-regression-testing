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

		switch (ext) {
			case '.html':
				contentType = 'text/html';
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
		let cacheControl = 'no-cache';
		if (requestedPath.includes('bitmaps_test') && (ext === '.png' || ext === '.jpg' || ext === '.jpeg')) {
			// Test images are immutable and heavy, cache them aggressively (1 year)
			cacheControl = 'public, max-age=31536000, immutable';
		} else if (requestedPath.includes('assets') || ext === '.js' || ext === '.css' || ext === '.woff' || ext === '.woff2' || ext === '.ttf') {
			// Static assets can also be cached
			cacheControl = 'public, max-age=86400'; // 1 day
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
