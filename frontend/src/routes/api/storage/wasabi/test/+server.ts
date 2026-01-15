import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';

/**
 * Test Wasabi storage connection
 * Supports both GET and POST - proxies to backend POST endpoint
 */
const handleTest: RequestHandler = async ({ cookies }) => {
	try {
		// Proxy to backend API - backend expects POST
		const response = await backendPost('/admin/storage/wasabi/test', undefined, { cookies });
		const result = await parseBackendResponse<any>(response);
		
		// Backend returns { success, message } or { success, error, details, suggestions }
		return json(result);
	} catch (error: any) {
		console.error('Wasabi test failed:', error);
		
		// Try to extract error details from the response
		let errorMessage = 'Unknown error occurred';
		let errorDetails: any = {};
		let suggestions: string[] = [];
		
		if (error instanceof Error) {
			errorMessage = error.message;
			errorDetails.message = error.message;
		}
		
		// If error has details from backend, extract them
		if (error?.details) {
			errorDetails = { ...errorDetails, ...error.details };
			if (error.details.suggestions && Array.isArray(error.details.suggestions)) {
				suggestions.push(...error.details.suggestions);
			}
		}
		
		const response: any = {
			success: false,
			error: `Connection test failed: ${errorMessage}`,
			details: errorDetails
		};
		
		if (suggestions.length > 0) {
			response.suggestions = suggestions;
		}
		
		return json(response, { status: 500 });
	}
};

// Support both GET and POST for compatibility
export const GET = handleTest;
export const POST = handleTest;
