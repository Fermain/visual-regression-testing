import { test, expect } from '@playwright/test';

test.describe('Core Workflow', () => {
	const projectName = 'E2E Test Project';
	const testUrl = 'http://127.0.0.1:5179';

	test('should complete a full visual regression cycle', async ({ page }) => {
		test.setTimeout(120000);

		// 1. Setup URL Pair in Settings
		await page.goto('/settings');
		
		await page.getByPlaceholder('https://www.example.com').fill(testUrl);
		await page.getByPlaceholder('https://staging.example.com').fill(testUrl);
		
		const addPairBtn = page.locator('button:has(svg.lucide-plus)').nth(0);
		await expect(addPairBtn).toBeEnabled();
		await addPairBtn.click();
		
		await page.getByRole('button', { name: 'Save Settings' }).click();
		await expect(page.getByText('Settings saved successfully')).toBeVisible();

		// 2. Create a new project
		await page.goto('/project/new');
		await page.getByLabel('Project Name').fill(projectName);
		await expect(page.getByRole('code').filter({ hasText: '/' })).toBeVisible();
		
		await page.getByRole('button', { name: 'Create Project' }).click();
		
		// Should redirect to project page
		await expect(page).toHaveURL(/\/project\/[a-f0-9-]+/);
		await expect(page.getByLabel('breadcrumb').getByText(projectName)).toBeVisible();

		// URL pair should be auto-selected (it's the only one)
		await page.waitForLoadState('networkidle');

		// 3. Create Reference
		const createRefBtn = page.getByRole('button', { name: 'Create Reference' });
		await expect(createRefBtn).toBeEnabled({ timeout: 10000 });
		await createRefBtn.click();
		
		// Wait for job to start
		await expect(page.getByText('Visual test running...')).toBeVisible({ timeout: 15000 });
		
		// Wait for job to complete ("Run Test" button appears)
		const runTestBtn = page.getByRole('button', { name: 'Run Test' }).first();
		await expect(runTestBtn).toBeVisible({ timeout: 90000 });
		await expect(page.getByText('Reference Images')).toBeVisible();

		// 4. Run Test
		await runTestBtn.click();
		
		// Wait for job to start
		await expect(page.getByText('Visual test running...')).toBeVisible({ timeout: 15000 });
		
		// Wait for report to appear (BackstopJS report is in an iframe)
		await expect(page.locator('iframe[title="BackstopJS Report"]')).toBeVisible({ timeout: 90000 });
		
		// Verify report content in iframe
		const iframe = page.frameLocator('iframe[title="BackstopJS Report"]');
		await expect(iframe.getByText('Passed')).toBeVisible({ timeout: 15000 });
	});
});
