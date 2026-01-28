/**
 * Authentication Error Handler
 * 
 * Utility functions to handle authentication errors and redirect to login
 */

import { browser } from '$app/environment';
import { logger } from './logger';

/**
 * Check if an error message indicates an authentication error
 */
export function isAuthError(errorMessage: string): boolean {
	const authErrorPatterns = [
		'invalid or expired token',
		'invalid token',
		'expired token',
		'unauthorized',
		'authentication failed',
		'token verification failed',
		'admin access required'
	];
	
	const lowerMessage = errorMessage.toLowerCase();
	return authErrorPatterns.some(pattern => lowerMessage.includes(pattern));
}

/**
 * Check if an HTTP status code indicates an authentication error
 */
export function isAuthErrorStatus(status: number): boolean {
	return status === 401 || status === 403;
}

/**
 * Handle authentication errors by redirecting to login
 * 
 * @param error - The error object or message
 * @param currentPath - Current pathname to redirect back after login
 * @returns true if redirected, false otherwise
 */
export function handleAuthError(error: any, currentPath?: string): boolean {
	if (!browser) {
		// Server-side: can't use goto, return false to let hooks.server.ts handle it
		return false;
	}

	// Don't redirect if we're already on the login page (prevents redirect loops)
	const currentPathname = currentPath || window.location.pathname;
	if (currentPathname.startsWith('/login') || currentPathname.startsWith('/auth/login')) {
		logger.warn('[Auth Error Handler] Already on login page, skipping redirect to prevent loop');
		return false;
	}

	let errorMessage = '';
	let status: number | undefined;

	if (error instanceof Error) {
		errorMessage = error.message;
	} else if (typeof error === 'string') {
		errorMessage = error;
	} else if (error?.error) {
		errorMessage = error.error;
		status = error.status;
	} else if (error?.message) {
		errorMessage = error.message;
		status = error.status;
	}

	// Check if it's an auth error
	if (isAuthError(errorMessage) || (status !== undefined && isAuthErrorStatus(status))) {
		const redirectPath = currentPathname;
		const loginUrl = `/login?redirect=${encodeURIComponent(redirectPath)}`;
		
		logger.warn('[Auth Error Handler] Authentication error detected, redirecting to login:', {
			error: errorMessage,
			status,
			redirectPath
		});
		
		// Use window.location.href for a full page reload to ensure cookie is cleared
		window.location.href = loginUrl;
		return true;
	}

	return false;
}

/**
 * Wrapper for fetch that automatically handles auth errors
 * 
 * @param url - URL to fetch
 * @param options - Fetch options
 * @returns Response or redirects to login if auth error
 */
export async function fetchWithAuthHandling(
	url: string,
	options?: RequestInit
): Promise<Response> {
	const response = await fetch(url, options);
	
	if (!response.ok) {
		const errorText = await response.clone().text().catch(() => '');
		let errorData: any = {};
		
		try {
			errorData = JSON.parse(errorText);
		} catch {
			errorData = { error: errorText || `HTTP ${response.status}` };
		}

		// Check if it's an auth error
		if (isAuthErrorStatus(response.status) || isAuthError(errorData.error || errorData.message || '')) {
			handleAuthError({ error: errorData.error || errorData.message, status: response.status });
			// Return a rejected promise since we're redirecting
			throw new Error('Authentication required');
		}
	}

	return response;
}
