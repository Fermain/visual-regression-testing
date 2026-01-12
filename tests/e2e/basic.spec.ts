import { test, expect } from '@playwright/test';

test.describe('Basic Navigation', () => {
	test('should load the dashboard', async ({ page }) => {
		await page.goto('/');
		// Use a more specific selector for the "Tests" breadcrumb or sidebar link
		await expect(page.getByRole('link', { name: 'Tests' }).first()).toBeVisible();
	});

	test('should navigate to settings', async ({ page }) => {
		await page.goto('/');
		// Navigate to settings via sidebar
		await page.getByRole('link', { name: 'Settings' }).click();
		await expect(page).toHaveURL('/settings');
		// Use exact match for the heading to avoid matching summary text
		await expect(page.getByText('URL Pairs', { exact: true })).toBeVisible();
		await expect(page.getByText('Viewports', { exact: true })).toBeVisible();
	});

	test('should navigate to new project page', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('link', { name: 'New Project' }).click();
		await expect(page).toHaveURL('/project/new');
		await expect(page.getByText('Project Name')).toBeVisible();
	});
});
