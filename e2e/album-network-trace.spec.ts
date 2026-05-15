import { setTimeout as delay } from 'node:timers/promises';
import { devices, expect, test } from '@playwright/test';

/**
 * Quick image/network trace for a **public** album (no login).
 *
 * Prereqs:
 *   - A **public** album reachable without login (local or production).
 *   - Local: `pnpm dev` and default base `http://localhost:4000`.
 *   - Production: set `PLAYWRIGHT_BASE_URL` to your HTTPS origin (no trailing slash), e.g. `https://example.com`.
 *
 * Usage (PowerShell) — local:
 *   $env:TRACE_ALBUM_PATH="/albums/your-alias"
 *   pnpm exec playwright test e2e/album-network-trace.spec.ts
 *
 * Usage — production base URL:
 *   $env:PLAYWRIGHT_BASE_URL="https://example.com"
 *   $env:TRACE_ALBUM_PATH="/albums/your-alias"
 *   pnpm exec playwright test e2e/album-network-trace.spec.ts
 *
 * Browsers: `pnpm exec playwright install chromium` (first time). This spec uses **Chromium** (Pixel 7 preset), not WebKit.
 */

const albumPath = (process.env.TRACE_ALBUM_PATH ?? '').trim();

/** When unset, skip this file so a full `pnpm test:e2e` run does not require Chromium for this manual helper. */
test.skip(!albumPath, 'Set TRACE_ALBUM_PATH to a public album path, e.g. /albums/my-alias');

// Pixel profile uses Chromium (same as `playwright.config` project). iPhone presets use WebKit and require `playwright install webkit`.
test.use({
	...devices['Pixel 7'],
});

function summarizeStorageEntries(
	entries: Array<{
		name: string;
		duration: number;
		transferSize: number;
		initiatorType: string;
		startTime: number;
	}>
) {
	return entries
		.filter(
			(e) =>
				e.name.includes('/api/storage/serve') ||
				(e.initiatorType === 'img' && e.name.length > 0)
		)
		.map((e) => ({
			url: e.name.length > 120 ? `${e.name.slice(0, 117)}…` : e.name,
			ms: Math.round(e.duration),
			kb: e.transferSize > 0 ? Math.round(e.transferSize / 102.4) / 10 : null,
			type: e.initiatorType,
		}))
		.sort((a, b) => b.ms - a.ms);
}

test.describe('Album image network trace (manual)', () => {
	test('log storage / image resource timings for album + optional lightbox', async ({ page }) => {
		const rows: string[] = [];

		await page.goto(albumPath, { waitUntil: 'domcontentloaded', timeout: 60_000 });

		// Public album should not land on login
		await expect(page).not.toHaveURL(/\/login/, { timeout: 5_000 });

		await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {
			rows.push('(networkidle timeout — listing partial timings)');
		});

		const afterGrid = await page.evaluate(() => {
			const list = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
			return list.map((e) => ({
				name: e.name,
				duration: e.duration,
				transferSize: e.transferSize,
				initiatorType: e.initiatorType,
				startTime: e.startTime,
			}));
		});

		const gridSummary = summarizeStorageEntries(afterGrid);
		rows.push('\n--- After album page load (Pixel 7 / Chromium mobile emulation) ---');
		for (const r of gridSummary.slice(0, 25)) {
			rows.push(`${r.ms} ms\t${r.kb != null ? `${r.kb} KB` : '?'}\t${r.type}\t${r.url}`);
		}
		if (gridSummary.length > 25) {
			rows.push(`… ${gridSummary.length - 25} more rows omitted`);
		}

		// Try opening lightbox: first clickable control wrapping a storage image
		const tClick = await page.evaluate(() => performance.now());
		const opener = page.locator('button:has(img[src*="/api/storage"])').first();
		if ((await opener.count()) > 0) {
			await opener.click({ timeout: 10_000 });
			await page.locator('.photo-lightbox-root').waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
			await delay(2000);

			const afterOpen = await page.evaluate((t0) => {
				const list = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
				return list
					.filter((e) => e.startTime >= t0)
					.map((e) => ({
						name: e.name,
						duration: e.duration,
						transferSize: e.transferSize,
						initiatorType: e.initiatorType,
						startTime: e.startTime,
					}));
			}, tClick);

			const lbSummary = summarizeStorageEntries(afterOpen);
			rows.push('\n--- After first lightbox open (resources started after click) ---');
			for (const r of lbSummary.slice(0, 25)) {
				rows.push(`${r.ms} ms\t${r.kb != null ? `${r.kb} KB` : '?'}\t${r.type}\t${r.url}`);
			}
			if (lbSummary.length === 0) {
				rows.push('(no new storage/img entries — template may use different markup)');
			}
		} else {
			rows.push('\n--- Lightbox: no `button:has(img[src*=storage])` found; skip open step ---');
		}

		console.log(`\nTRACE_ALBUM_PATH=${albumPath}\n${rows.join('\n')}\n`);
	});
});
