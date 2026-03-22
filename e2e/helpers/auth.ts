import type { Page } from '@playwright/test';

/** Clears session cookies, opens login, submits credentials, waits for post-login redirect. */
export async function loginAs(page: Page, email: string, password: string) {
	await page.context().clearCookies();
	await page.goto('/login');
	await page.locator('#email').fill(email);
	await page.locator('#password').fill(password);
	await page.getByRole('button', { name: /sign in/i }).click();
	await page.waitForURL(/\/(admin|owner|member)(\/|$)/, { timeout: 30_000 });
}

export function e2eCredentials() {
	const adminEmail = process.env.E2E_ADMIN_EMAIL ?? '';
	const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? '';
	const ownerEmail = process.env.E2E_OWNER_EMAIL ?? '';
	const ownerPassword = process.env.E2E_OWNER_PASSWORD ?? '';
	const ok = !!(adminEmail && adminPassword && ownerEmail && ownerPassword);
	return { adminEmail, adminPassword, ownerEmail, ownerPassword, ok };
}
