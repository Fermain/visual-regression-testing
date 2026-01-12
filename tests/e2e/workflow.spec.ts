import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test.describe('Core Workflow', () => {
	const projectName = 'E2E Test Project';
	const testUrl = 'http://localhost:5179';

	test('should complete a full visual regression cycle', async ({ page }) => {
		test.setTimeout(120000); // Increase timeout for visual regression

		// 1. Setup URL Pair in Settings
		await page.goto('/settings');
		
		// Fill in a new URL pair
		await page.getByPlaceholder('https://www.example.com').fill(testUrl);
		await page.getByPlaceholder('https://staging.example.com').fill(testUrl);
		
		// The button might be disabled if it's already there (unlikely in clean setup)
		const addPairBtn = page.locator('button:has(svg.lucide-plus)').nth(0);
		await expect(addPairBtn).toBeEnabled();
		await addPairBtn.click();
		
		await page.getByRole('button', { name: 'Save Settings' }).click();
		await expect(page.getByText('Settings saved successfully')).toBeVisible();

		// 2. Create a new project
		await page.goto('/project/new');
		await page.getByLabel('Project Name').fill(projectName);
		// Path '/' is already present by default, so we don't need to add it.
		// Let's just verify it's there.
		await expect(page.getByRole('code').filter({ hasText: '/' })).toBeVisible();
		
		await page.getByRole('button', { name: 'Create Project' }).click();
		
		// Should redirect to project page
		await expect(page).toHaveURL(/\/project\/[a-f0-9-]+/);
		await expect(page.getByLabel('breadcrumb').getByText(projectName)).toBeVisible();

		// 3. Select the URL pair
		// It should be selected by default if it's the only one, but let's be sure.
		// The select trigger shows the hostname
		await page.getByRole('button', { name: /localhost/ }).first().click();
		await page.getByRole('option').filter({ hasText: 'localhost' }).first().click();

		// 4. Create Reference
		await page.getByRole('button', { name: 'Create Reference' }).click();
		
		// Wait for job to start (status: running)
		await expect(page.getByText('Visual test running...')).toBeVisible({ timeout: 15000 });
		
		// Wait for job to complete (status: idle, "Run Test" button appears)
		await expect(page.getByRole('button', { name: 'Run Test' }).first()).toBeVisible({ timeout: 90000 });
		await expect(page.getByText('Reference Images')).toBeVisible();

		// 5. Run Test
		await page.getByRole('button', { name: 'Run Test' }).first().click();
		
		// Wait for job to start
		await expect(page.getByText('Visual test running...')).toBeVisible({ timeout: 15000 });
		
		// Wait for job to complete and report to appear
		// BackstopJS report is in an iframe
		await expect(page.locator('iframe[title="BackstopJS Report"]')).toBeVisible({ timeout: 90000 });
		
		// Verify report content
		const iframe = page.frameLocator('iframe[title="BackstopJS Report"]');
		// "Passed" might take a moment to appear inside the iframe
		await expect(iframe.getByText('Passed')).toBeVisible({ timeout: 15000 });
	});
});
