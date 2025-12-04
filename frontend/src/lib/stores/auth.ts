import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface AuthUser {
	id: string;
	email: string;
	name: string;
	role: 'admin' | 'owner' | 'guest';
}

export interface AuthState {
	authenticated: boolean;
	user?: AuthUser;
}

export const auth = writable<AuthState>({ authenticated: false });

export async function loadSession() {
	if (!browser) return;

	try {
		const res = await fetch('/auth/session');
		const data = await res.json();
		auth.set(data);
	} catch (error) {
		console.error('Failed to load session:', error);
		auth.set({ authenticated: false });
	}
}

export async function logout() {
	if (!browser) return;

	try {
		await fetch('/auth/logout', { method: 'POST' });
		auth.set({ authenticated: false });
		window.location.href = '/login';
	} catch (error) {
		console.error('Failed to logout:', error);
	}
}

