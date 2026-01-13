import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { StorageManager } from '$lib/services/storage/manager';

export const GET: RequestHandler = async () => {
	try {
		// Use the storage manager to get the Google Drive service
		const storageManager = StorageManager.getInstance();
		const googleDrive = await storageManager.getProvider('google-drive');

		// Test connection
		const isValid = await googleDrive.validateConnection();

		if (!isValid) {
			return json(
				{
					success: false,
					error: 'Failed to validate Google Drive connection',
					details: 'Connection validation returned false without throwing an error'
				},
				{ status: 500 }
			);
		}

		return json({
			success: true,
			message: 'Google Drive connection successful',
			config: {
				provider: 'google-drive',
				status: 'active'
			}
		});
	} catch (error: any) {
		console.error('Google Drive test failed:', error);
		
		// Build detailed error information
		let errorMessage = 'Unknown error occurred';
		let errorCode: string | undefined;
		let errorDetails: any = {};
		let suggestions: string[] = [];

		if (error instanceof Error) {
			errorMessage = error.message;
			errorDetails.message = error.message;
			if (error.stack) {
				errorDetails.stack = error.stack;
			}
		}

		// Extract error code and details if available
		if (error?.code) {
			errorCode = error.code.toString();
			errorDetails.code = error.code;
		}

		// Extract nested details
		if (error?.details) {
			errorDetails = { ...errorDetails, ...error.details };
		}

		// Extract Google API specific errors
		if (error?.details?.googleApiError) {
			const apiError = error.details.googleApiError;
			errorCode = apiError.code || errorCode;
			errorMessage = apiError.message || errorMessage;
			errorDetails.googleApiError = apiError;
			
			// Add suggestions based on error code
			if (apiError.code === 401 || apiError.status === 401) {
				suggestions.push('The access token may have expired. Try re-authorizing the application.');
				suggestions.push('Check that the Client ID and Client Secret are correct.');
			} else if (apiError.code === 403 || apiError.status === 403) {
				suggestions.push('The application may not have the required permissions.');
				suggestions.push('Verify that the OAuth scopes include "https://www.googleapis.com/auth/drive.file".');
			} else if (apiError.code === 404 || apiError.status === 404) {
				suggestions.push('The API endpoint may be incorrect or the service may be unavailable.');
			}
		}

		// Add suggestions for authentication errors
		if (error?.details?.authError || errorMessage.toLowerCase().includes('auth') || errorMessage.toLowerCase().includes('token')) {
			suggestions.push('Re-authorize the application by generating a new refresh token.');
			suggestions.push('Verify that the Client ID, Client Secret, and Refresh Token are correct.');
		}

		// Add suggestions for network errors
		if (error?.details?.networkError || error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
			suggestions.push('Check your internet connection.');
			suggestions.push('Verify firewall settings allow outbound connections to Google APIs.');
			suggestions.push('Check if a proxy server is required and configured correctly.');
		}

		// Add suggestions for missing configuration
		if (errorMessage.includes('not configured') || errorMessage.includes('missing')) {
			suggestions.push('Ensure all required configuration fields are filled in the storage settings.');
			suggestions.push('Save the configuration before testing the connection.');
		}

		// Build the response
		const response: any = {
			success: false,
			error: errorMessage,
			details: errorDetails
		};

		if (errorCode) {
			response.errorCode = errorCode;
		}

		if (suggestions.length > 0) {
			response.suggestions = suggestions;
		}

		// Include original error in development mode (but not in production for security)
		if (process.env.NODE_ENV !== 'production' && error?.originalError) {
			response.originalError = {
				message: error.originalError?.message,
				code: error.originalError?.code
			};
		}

		return json(response, { status: 500 });
	}
};
