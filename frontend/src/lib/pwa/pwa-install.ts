import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export type BeforeInstallPromptEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** True when Chrome fired `beforeinstallprompt` and we can call `.prompt()`. */
export const pwaInstallAvailable = writable(false);

/** True when we should show manual install steps (no native prompt yet). */
export const pwaInstallManualHint = writable(false);

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listenersBound = false;

export function isStandaloneDisplay(): boolean {
	if (!browser) return false;
	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		(window.navigator as Navigator & { standalone?: boolean }).standalone === true
	);
}

export function bindPwaInstallListeners(): void {
	if (!browser || listenersBound) return;
	listenersBound = true;

	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		deferredPrompt = e as BeforeInstallPromptEvent;
		pwaInstallManualHint.set(false);
		pwaInstallAvailable.set(true);
	});

	window.addEventListener('appinstalled', () => {
		deferredPrompt = null;
		pwaInstallAvailable.set(false);
		pwaInstallManualHint.set(false);
	});
}

if (browser) {
	bindPwaInstallListeners();
}

export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
	if (!deferredPrompt) return 'unavailable';
	await deferredPrompt.prompt();
	const { outcome } = await deferredPrompt.userChoice;
	deferredPrompt = null;
	pwaInstallAvailable.set(false);
	return outcome;
}

const DISMISS_KEY = 'openshutter-pwa-install-dismissed';

export function isPwaInstallDismissed(): boolean {
	if (!browser) return true;
	try {
		return localStorage.getItem(DISMISS_KEY) === '1';
	} catch {
		return false;
	}
}

export function dismissPwaInstallPrompt(): void {
	if (!browser) return;
	try {
		localStorage.setItem(DISMISS_KEY, '1');
	} catch {
		/* ignore */
	}
	pwaInstallAvailable.set(false);
	pwaInstallManualHint.set(false);
}

export async function registerPublicServiceWorker(): Promise<void> {
	if (!browser || !('serviceWorker' in navigator)) return;
	try {
		const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
		await reg.update?.();
	} catch (err) {
		console.warn('[PWA] Service worker registration failed', err);
	}
}

export async function unregisterPublicServiceWorkers(): Promise<void> {
	if (!browser || !('serviceWorker' in navigator)) return;
	try {
		const registrations = await navigator.serviceWorker.getRegistrations();
		await Promise.all(registrations.map((r) => r.unregister()));
	} catch (err) {
		console.warn('[PWA] Service worker unregister failed', err);
	}
}

/** Default on when unset so existing sites keep PWA after upgrade. */
export function isPwaFeatureEnabled(features: { enablePwa?: boolean } | undefined): boolean {
	return features?.enablePwa !== false;
}

/** After SW + manifest load, show manual steps if the browser never offers install. */
export function scheduleManualInstallHint(delayMs = 4000): () => void {
	if (!browser) return () => {};
	const id = window.setTimeout(() => {
		if (isStandaloneDisplay() || isPwaInstallDismissed() || deferredPrompt) return;
		pwaInstallManualHint.set(true);
	}, delayMs);
	return () => window.clearTimeout(id);
}

export async function checkPwaAssetsReachable(): Promise<boolean> {
	if (!browser) return false;
	try {
		const [m, s] = await Promise.all([
			fetch('/manifest.json', { method: 'HEAD' }),
			fetch('/sw.js', { method: 'HEAD' }),
		]);
		return m.ok && s.ok;
	} catch {
		return false;
	}
}
