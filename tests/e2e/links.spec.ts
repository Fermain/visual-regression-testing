import { test, expect } from '@playwright/test';

test.describe('Link Checker Workflow', () => {
	const projectName = 'Link Test Project';
	const testUrl = 'http://127.0.0.1:5179';

	test('should complete a link check cycle', async ({ page }) => {
		test.setTimeout(120000);

		// 1. Setup URL Pair
		await page.goto('/settings');
		await page.getByPlaceholder('https://www.example.com').fill(testUrl);
		await page.getByPlaceholder('https://staging.example.com').fill(testUrl);
		
		const addPairBtn = page.locator('button:has(svg.lucide-plus)').nth(0);
		await expect(addPairBtn).toBeEnabled();
		await addPairBtn.click();
		
		// 2. Add exclude pattern to make test fast (skip external links)
		const excludeTextarea = page.locator('#linkCheckerExclude');
		await excludeTextarea.fill('^(?!http://127\\.0\\.0\\.1:5179).*');
		
		await page.getByRole('button', { name: 'Save Settings' }).click();
		await expect(page.getByText('Settings saved successfully')).toBeVisible();

		// 3. Create project
		await page.goto('/project/new');
		await page.getByLabel('Project Name').fill(projectName);
		await page.getByRole('button', { name: 'Create Project' }).click();
		
		await expect(page).toHaveURL(/\/project\/[a-f0-9-]+/);

		// 4. Select the URL pair
		await page.getByRole('button', { name: /127\.0\.0\.1/ }).first().click();
		await page.getByRole('option').filter({ hasText: '127.0.0.1' }).first().click();

		// 5. Run Link Check
		await page.getByRole('button', { name: 'Check Links' }).click();
		
		// Wait for job to complete (Check Links button becomes enabled again)
		await expect(page.getByRole('button', { name: 'Check Links' })).toBeEnabled({ timeout: 90000 });

		// 6. Verify results in Link Report tab
		await page.getByRole('tab', { name: 'Link Report' }).click();
		
		// Verify table headers or some content
		await expect(page.getByRole('table')).toBeVisible();
		
		const rows = page.locator('table tbody tr');
		await expect(rows.first()).toBeVisible();
	});
});
