import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: 'html',
	use: {
		baseURL: 'http://localhost:5179',
		trace: 'on-first-retry'
	},
	projects: [
		{
			name: 'setup',
			testMatch: /setup\.ts/
		},
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
			dependencies: ['setup']
		}
	],
	webServer: {
		command: 'NODE_ENV=test npm run dev',
		url: 'http://localhost:5179',
		reuseExistingServer: !process.env.CI
	}
});
