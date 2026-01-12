import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

setup('setup database', async ({ request }) => {
	const testDbDir = path.resolve('data/test');
	if (fs.existsSync(testDbDir)) {
		fs.rmSync(testDbDir, { recursive: true, force: true });
	}
	fs.mkdirSync(testDbDir, { recursive: true });
	console.log('Cleaned up test database directory');

	// Call the reset endpoint to ensure the server process also re-inits its DB connection
	const response = await request.post('/api/test/reset-db');
	if (!response.ok()) {
		throw new Error(`Failed to reset test database: ${response.statusText()}`);
	}
	console.log('Server database connection reset');
});
