import { expect, test } from '@playwright/test';
import { e2eCredentials, loginAs } from './helpers/auth';

/**
 * Covers admin “Use dedicated per-owner storage”, owner dashboard storage card,
 * and /owner/storage dedicated vs site-admin panels.
 *
 * Requires a running stack (`pnpm dev`) and env:
 *   E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_OWNER_EMAIL, E2E_OWNER_PASSWORD
 *
 * The owner account must exist, role owner, not blocked, and must not be stuck
 * on “force password change” (complete first login manually if needed).
 */
test.describe.serial('Dedicated owner storage', () => {
	const creds = e2eCredentials();

	test.beforeAll(() => {
		test.skip(!creds.ok, 'Set E2E_ADMIN_* and E2E_OWNER_* environment variables');
	});

	test('admin enables dedicated storage for owner', async ({ page }) => {
		await loginAs(page, creds.adminEmail, creds.adminPassword);
		await page.goto('/admin/users');
		await expect(page.getByRole('heading', { name: /users management/i })).toBeVisible({
			timeout: 20_000,
		});

		const row = page.getByRole('row').filter({ hasText: creds.ownerEmail });
		await expect(row).toBeVisible({ timeout: 15_000 });
		await row.getByRole('button', { name: /^edit$/i }).click();

		await expect(page.getByTestId('user-form-use-dedicated-storage')).toBeVisible();
		const dedicated = page.getByTestId('user-form-use-dedicated-storage');
		await dedicated.check();
		await expect(dedicated).toBeChecked();

		await page.getByTestId('admin-users-save-edit').click();
		await expect(page.getByRole('heading', { name: /edit user/i })).toBeHidden({ timeout: 20_000 });
	});

	test('owner sees storage card and dedicated notice on /owner/storage', async ({ page }) => {
		await loginAs(page, creds.ownerEmail, creds.ownerPassword);
		await page.goto('/owner');
		await expect(page.getByTestId('owner-dashboard-storage-card')).toBeVisible({ timeout: 20_000 });
		await page.getByTestId('owner-dashboard-storage-link').click();
		await page.waitForURL('**/owner/storage', { timeout: 15_000 });
		await expect(page.getByTestId('owner-storage-dedicated-notice')).toBeVisible({ timeout: 20_000 });
	});

	test('admin disables dedicated storage', async ({ page }) => {
		await loginAs(page, creds.adminEmail, creds.adminPassword);
		await page.goto('/admin/users');
		const row = page.getByRole('row').filter({ hasText: creds.ownerEmail });
		await row.getByRole('button', { name: /^edit$/i }).click();

		const dedicated = page.getByTestId('user-form-use-dedicated-storage');
		await dedicated.uncheck();
		await expect(dedicated).not.toBeChecked();

		await page.getByTestId('admin-users-save-edit').click();
		await expect(page.getByRole('heading', { name: /edit user/i })).toBeHidden({ timeout: 20_000 });
	});

	test('owner does not see storage card when using site storage (default admin save)', async ({
		page,
	}) => {
		await loginAs(page, creds.ownerEmail, creds.ownerPassword);
		await page.goto('/owner');
		await expect(page.getByTestId('owner-dashboard-storage-card')).toBeHidden({ timeout: 20_000 });
		await page.goto('/owner/storage');
		await expect(page.getByTestId('owner-storage-site-admin-panel')).toBeVisible({ timeout: 20_000 });
	});

	test('admin re-enables dedicated storage (restore)', async ({ page }) => {
		await loginAs(page, creds.adminEmail, creds.adminPassword);
		await page.goto('/admin/users');
		const row = page.getByRole('row').filter({ hasText: creds.ownerEmail });
		await row.getByRole('button', { name: /^edit$/i }).click();
		await page.getByTestId('user-form-use-dedicated-storage').check();
		await page.getByTestId('admin-users-save-edit').click();
		await expect(page.getByRole('heading', { name: /edit user/i })).toBeHidden({ timeout: 20_000 });
	});
});
