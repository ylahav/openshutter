import { writable } from 'svelte/store';

export interface TokenRenewalNotification {
	show: boolean;
	provider: string;
	message: string;
}

function createTokenRenewalStore() {
	const { subscribe, set, update } = writable<TokenRenewalNotification>({
		show: false,
		provider: '',
		message: ''
	});

	let lastShownTime = 0;
	const THROTTLE_MS = 60000; // Only show once per minute

	return {
		subscribe,
		show: (provider: string = 'google-drive', message?: string) => {
			const now = Date.now();
			// Throttle to prevent showing notification repeatedly
			if (now - lastShownTime < THROTTLE_MS) {
				return;
			}
			lastShownTime = now;
			
			set({
				show: true,
				provider,
				message: message || 'Storage authentication token is invalid or expired. Please renew it to continue accessing files.'
			});
		},
		hide: () => {
			update(state => ({ ...state, show: false }));
		}
	};
}

export const tokenRenewalNotification = createTokenRenewalStore();
