import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

setup('setup database', async () => {
	const testDbDir = path.resolve('data/test');
	if (fs.existsSync(testDbDir)) {
		fs.rmSync(testDbDir, { recursive: true, force: true });
	}
	fs.mkdirSync(testDbDir, { recursive: true });
	console.log('Cleaned up test database directory');
});
