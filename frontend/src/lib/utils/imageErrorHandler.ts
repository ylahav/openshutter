import { tokenRenewalNotification } from '$lib/stores/tokenRenewal';
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { page } from '$app/stores';
import { logger } from './logger';

/**
 * Check if an image URL failed due to invalid Google Drive token
 * and show notification to admins if needed
 */
export async function handleImageError(imageUrl: string): Promise<boolean> {
	if (!browser) {
		return false;
	}

	// Only check storage URLs
	if (!imageUrl.includes('/api/storage/serve/google-drive/')) {
		return false;
	}

	// Only show notification on admin pages (where admins can actually renew)
	const currentPath = get(page).url.pathname;
	const isAdminPage = currentPath.startsWith('/admin') || currentPath.startsWith('/owner');
	if (!isAdminPage) {
		return false;
	}

	try {
		// Try to fetch the image to get the error details
		const response = await fetch(imageUrl, { method: 'HEAD' });
		
		if (response.status === 401) {
			// Check if it's a token renewal error
			try {
				const errorData = await response.json();
				if (
					errorData.error === 'GOOGLE_DRIVE_TOKEN_INVALID' ||
					errorData.requiresRenewal === true
				) {
					tokenRenewalNotification.show(
						errorData.provider || 'google-drive',
						errorData.message || 'Google Drive authentication token is invalid or expired'
					);
					return true;
				}
			} catch {
				// If response isn't JSON, check status code
				// For Google Drive storage URLs, 401 likely means token issue
				if (imageUrl.includes('/api/storage/serve/google-drive/')) {
					tokenRenewalNotification.show(
						'google-drive',
						'Google Drive authentication token is invalid or expired'
					);
					return true;
				}
			}
		}
	} catch (err) {
		// Network errors or other issues - don't show notification
		logger.debug('Image error check failed:', err);
	}

	return false;
}

/**
 * Enhanced image error handler that checks for token renewal errors
 * Use this in on:error handlers for images
 */
export async function handleImageLoadError(event: Event): Promise<void> {
	const target = event.currentTarget as HTMLImageElement;
	const imageUrl = target.src;

	// Check if this is a token renewal error
	const isTokenError = await handleImageError(imageUrl);
	
	if (isTokenError) {
		// Don't hide the image yet - let user see there's an issue
		// The notification will prompt them to renew
		return;
	}

	// For non-token errors, proceed with normal fallback behavior
	// (This will be handled by the component's existing error handler)
}
