import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests assume the app is already running (e.g. `pnpm dev`).
 * Set PLAYWRIGHT_BASE_URL if the UI is not on http://localhost:4000.
 */
export default defineConfig({
	testDir: 'e2e',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'off',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
