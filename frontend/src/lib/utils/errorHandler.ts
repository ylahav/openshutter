/**
 * Centralized error handling utility
 * 
 * Provides consistent error handling across the application with:
 * - Standardized error types
 * - User-friendly error messages
 * - Error tracking integration
 * - Consistent error formatting
 */

import { logger } from './logger';

/**
 * API Error class for structured error handling
 */
export class ApiError extends Error {
	constructor(
		public status: number,
		public code: string,
		message: string,
		public userMessage?: string,
		public details?: Record<string, any>
	) {
		super(message);
		this.name = 'ApiError';
		// Maintains proper stack trace for where error was thrown
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, ApiError);
		}
	}
}

/**
 * Network Error class for network-related failures
 */
export class NetworkError extends Error {
	constructor(message: string, public originalError?: Error) {
		super(message);
		this.name = 'NetworkError';
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, NetworkError);
		}
	}
}

/**
 * Parse error from various sources (Error, string, API response, etc.)
 */
export function parseError(error: unknown): {
	message: string;
	userMessage: string;
	status?: number;
	code?: string;
	details?: Record<string, any>;
} {
	// ApiError - already structured
	if (error instanceof ApiError) {
		return {
			message: error.message,
			userMessage: error.userMessage || error.message,
			status: error.status,
			code: error.code,
			details: error.details,
		};
	}

	// NetworkError
	if (error instanceof NetworkError) {
		return {
			message: error.message,
			userMessage: 'Network error. Please check your connection and try again.',
		};
	}

	// Standard Error
	if (error instanceof Error) {
		return {
			message: error.message,
			userMessage: error.message || 'An unexpected error occurred. Please try again.',
		};
	}

	// String error
	if (typeof error === 'string') {
		return {
			message: error,
			userMessage: error || 'An unexpected error occurred. Please try again.',
		};
	}

	// Object with error properties
	if (error && typeof error === 'object') {
		const err = error as any;
		return {
			message: err.message || err.error || 'Unknown error',
			userMessage: err.userMessage || err.message || err.error || 'An unexpected error occurred. Please try again.',
			status: err.status,
			code: err.code,
			details: err.details,
		};
	}

	// Fallback
	return {
		message: 'Unknown error',
		userMessage: 'An unexpected error occurred. Please try again.',
	};
}

/**
 * Handle API error response
 * 
 * @param response - Fetch Response object
 * @returns Promise that rejects with ApiError
 */
export async function handleApiErrorResponse(response: Response): Promise<never> {
	let errorData: any = {};
	
	try {
		const text = await response.text();
		if (text) {
			errorData = JSON.parse(text);
		}
	} catch {
		// If parsing fails, use status text
		errorData = { error: response.statusText || `HTTP ${response.status}` };
	}

	const error = new ApiError(
		response.status,
		errorData.code || 'HTTP_ERROR',
		errorData.message || errorData.error || response.statusText || `HTTP ${response.status}`,
		errorData.userMessage || getDefaultUserMessage(response.status),
		errorData.details
	);

	logger.error('API Error:', {
		status: response.status,
		statusText: response.statusText,
		code: error.code,
		message: error.message,
		url: response.url,
	});

	throw error;
}

/**
 * Get default user-friendly message for HTTP status codes
 */
function getDefaultUserMessage(status: number): string {
	const messages: Record<number, string> = {
		400: 'Invalid request. Please check your input and try again.',
		401: 'You need to be logged in to perform this action.',
		403: 'You don\'t have permission to perform this action.',
		404: 'The requested resource was not found.',
		409: 'This action conflicts with the current state. Please refresh and try again.',
		422: 'The request was well-formed but contains validation errors.',
		429: 'Too many requests. Please wait a moment and try again.',
		500: 'Server error. Please try again later.',
		502: 'Service temporarily unavailable. Please try again later.',
		503: 'Service temporarily unavailable. Please try again later.',
		504: 'Request timeout. Please try again.',
	};

	return messages[status] || 'An error occurred. Please try again.';
}

/**
 * Handle error and return user-friendly message
 * 
 * This is the main function to use in components for error handling
 * 
 * @param error - Error of any type
 * @param fallbackMessage - Fallback message if error can't be parsed
 * @returns User-friendly error message
 * 
 * @example
 * ```typescript
 * try {
 *   await fetchData();
 * } catch (err) {
 *   error = handleError(err, 'Failed to load data');
 * }
 * ```
 */
export function handleError(error: unknown, fallbackMessage: string = 'An error occurred'): string {
	const parsed = parseError(error);
	
	// Log error for debugging
	if (parsed.status && parsed.status >= 500) {
		logger.error('Server error:', parsed);
	} else if (error instanceof NetworkError) {
		logger.warn('Network error:', parsed);
	} else {
		logger.debug('Error handled:', parsed);
	}
	
	return parsed.userMessage || fallbackMessage;
}

/**
 * Wrap async function with error handling
 * 
 * Automatically catches errors and returns user-friendly messages
 * 
 * @example
 * ```typescript
 * const result = await withErrorHandling(
 *   () => fetchData(),
 *   'Failed to load data'
 * );
 * ```
 */
export async function withErrorHandling<T>(
	fn: () => Promise<T>,
	fallbackMessage: string = 'An error occurred'
): Promise<{ data?: T; error?: string }> {
	try {
		const data = await fn();
		return { data };
	} catch (error) {
		return { error: handleError(error, fallbackMessage) };
	}
}

/**
 * Create a safe fetch wrapper with error handling
 * 
 * @example
 * ```typescript
 * const response = await safeFetch('/api/data');
 * if (response.error) {
 *   error = response.error;
 * } else {
 *   data = response.data;
 * }
 * ```
 */
export async function safeFetch(
	url: string,
	options?: RequestInit
): Promise<{ data?: Response; error?: string }> {
	try {
		const response = await fetch(url, options);
		
		if (!response.ok) {
			await handleApiErrorResponse(response);
		}
		
		return { data: response };
	} catch (error) {
		if (error instanceof ApiError) {
			return { error: error.userMessage || error.message };
		}
		
		if (error instanceof NetworkError || error instanceof TypeError) {
			return { error: 'Network error. Please check your connection.' };
		}
		
		return { error: handleError(error, 'Failed to fetch data') };
	}
}
