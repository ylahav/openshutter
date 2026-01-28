/**
 * Backend API Utility
 * 
 * Helper functions for making requests to the NestJS backend API
 * from SvelteKit server-side routes.
 */

import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';
import { logger } from './logger';

// Note: Environment variables should be loaded by start.sh or PM2 before starting the app
// SvelteKit's $env/dynamic/private works during request handling, but for module-level access
// we rely on process.env which should be set by the startup script or PM2 ecosystem.config.js

// Backend API base URL
const BACKEND_URL = env.BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000';
const API_BASE = `${BACKEND_URL}/api`;

// Log backend connection info (only once when module loads)
// This helps identify which backend the frontend is connecting to, especially useful for multiple installations
if (typeof process !== 'undefined') {
	try {
		const url = new URL(BACKEND_URL);
		const port = url.port || (url.protocol === 'https:' ? '443' : url.protocol === 'http:' ? '80' : 'unknown');
		// Show where the BACKEND_URL came from
		const source = env.BACKEND_URL ? 'env.BACKEND_URL' : process.env.BACKEND_URL ? 'process.env.BACKEND_URL' : 'default';
		logger.info(`🔗 Frontend connecting to backend: ${BACKEND_URL} (port: ${port}) [source: ${source}]`);
		
		// Warn if using default value
		if (source === 'default') {
			logger.warn(`⚠️  WARNING: Using default backend URL. Set BACKEND_URL in frontend/.env.production to match your backend port!`);
		}
	} catch (e) {
		// If URL parsing fails, just log the raw value
		const source = env.BACKEND_URL ? 'env.BACKEND_URL' : process.env.BACKEND_URL ? 'process.env.BACKEND_URL' : 'default';
		logger.info(`🔗 Frontend connecting to backend: ${BACKEND_URL} [source: ${source}]`);
	}
}

export interface BackendRequestOptions extends RequestInit {
	// Additional options can be added here
	authToken?: string | null; // JWT token for authentication
	cookies?: Cookies; // SvelteKit cookies object to extract token from
}

/**
 * Make a request to the NestJS backend API
 * 
 * @param endpoint - API endpoint (e.g., '/albums' or '/photos/123')
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Response from the backend
 */
export async function backendRequest(
	endpoint: string,
	options: BackendRequestOptions = {}
): Promise<Response> {
	const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
	
	// Extract auth token from options or cookies
	let authToken = options.authToken;
	if (!authToken && options.cookies) {
		authToken = options.cookies.get('auth_token') || null;
	}

	const defaultHeaders: HeadersInit = {
		'Content-Type': 'application/json',
	};

	// Add Authorization header if token is available (backend checks this too)
	if (authToken) {
		defaultHeaders['Authorization'] = `Bearer ${authToken}`;
		logger.debug('[Backend API] Setting Authorization header:', {
			hasToken: !!authToken,
			tokenLength: authToken?.length || 0,
			tokenPreview: authToken ? authToken.substring(0, 30) + '...' : null,
			endpoint
		});
	} else {
		logger.warn('[Backend API] No auth token available for Authorization header:', {
			hasOptionsAuthToken: !!options.authToken,
			hasCookies: !!options.cookies,
			endpoint
		});
	}

	// Forward cookies for server-to-server requests
	// IMPORTANT: We need to forward the auth_token cookie so the backend can authenticate the request
	const cookieHeader: string[] = [];
	if (options.cookies) {
		const authCookie = options.cookies.get('auth_token');
		if (authCookie) {
			cookieHeader.push(`auth_token=${authCookie}`);
			// Log cookie forwarding for debugging
			logger.debug('[Backend API] Forwarding auth_token cookie:', {
				tokenLength: authCookie.length,
				tokenPreview: authCookie.substring(0, 30) + '...',
				endpoint
			});
		} else {
			// Log all available cookies to help debug
			const allCookies = options.cookies.getAll();
			logger.warn('[Backend API] No auth_token cookie found in cookies object:', {
				hasCookies: !!options.cookies,
				allCookieNames: allCookies.map(c => c.name),
				endpoint
			});
		}
	} else {
		logger.warn('[Backend API] No cookies object provided:', { endpoint });
	}
	
	// Always set Cookie header if we have auth token (even if empty, to ensure proper header format)
	if (cookieHeader.length > 0) {
		defaultHeaders['Cookie'] = cookieHeader.join('; ');
		logger.debug('[Backend API] Cookie header set:', {
			cookieHeaderLength: defaultHeaders['Cookie'].length,
			cookieHeaderPreview: defaultHeaders['Cookie'].substring(0, 80) + '...',
			endpoint
		});
	} else if (authToken) {
		// If we have authToken but no cookie, we're using Authorization header instead
		// This is fine - backend should check Authorization header too
		logger.debug('[Backend API] Using Authorization header instead of Cookie:', {
			hasAuthToken: !!authToken,
			endpoint
		});
	} else {
		logger.error('[Backend API] No authentication method available - neither cookie nor Authorization header:', { 
			endpoint,
			hasCookies: !!options.cookies,
			hasAuthToken: !!authToken
		});
	}

	const finalHeaders = {
		...defaultHeaders,
		...options.headers,
	};

	// Always log request details to help diagnose auth issues
	logger.debug('[Backend API] Making request:', {
		url,
		hasAuthToken: !!authToken,
		hasCookieHeader: !!finalHeaders['Cookie'],
		cookieHeaderPreview: finalHeaders['Cookie'] ? finalHeaders['Cookie'].substring(0, 100) + '...' : null,
		hasAuthorizationHeader: !!finalHeaders['Authorization'],
		authorizationPreview: finalHeaders['Authorization'] ? finalHeaders['Authorization'].substring(0, 50) + '...' : null,
		method: options.method || 'GET',
		allHeaderKeys: Object.keys(finalHeaders)
	});

	let response: Response;
	try {
		response = await fetch(url, {
			...options,
			headers: finalHeaders,
		});
	} catch (fetchError: any) {
		// Handle network errors (connection refused, timeout, etc.)
		const errorMessage = fetchError?.message || String(fetchError);
		logger.error('[Backend API] Network error:', {
			url,
			error: errorMessage
		});
		
		// Create a mock error response for network errors
		const errorResponse = new Response(
			JSON.stringify({ 
				error: `Network error: ${errorMessage}. Check if backend is running on ${BACKEND_URL}` 
			}),
			{ 
				status: 503,
				statusText: 'Service Unavailable',
				headers: { 'Content-Type': 'application/json' }
			}
		);
		return errorResponse;
	}

	// Log response status for debugging (both dev and production)
	if (!response.ok) {
		const errorText = await response.clone().text().catch(() => 'Unable to read error');
		logger.error('[Backend API] Error response:', {
			url,
			status: response.status,
			statusText: response.statusText,
			error: errorText.substring(0, 500)
		});
	}

	return response;
}

/**
 * Make a GET request to the backend API
 */
export async function backendGet(endpoint: string, options: BackendRequestOptions = {}) {
	return backendRequest(endpoint, { ...options, method: 'GET' });
}

/**
 * Make a POST request to the backend API
 */
export async function backendPost(endpoint: string, body?: any, options: BackendRequestOptions = {}) {
	return backendRequest(endpoint, {
		...options,
		method: 'POST',
		body: body ? JSON.stringify(body) : undefined,
	});
}

/**
 * Make a PUT request to the backend API
 */
export async function backendPut(endpoint: string, body?: any, options: BackendRequestOptions = {}) {
	return backendRequest(endpoint, {
		...options,
		method: 'PUT',
		body: body ? JSON.stringify(body) : undefined,
	});
}

/**
 * Make a DELETE request to the backend API
 */
export async function backendDelete(endpoint: string, options: BackendRequestOptions = {}) {
	return backendRequest(endpoint, { ...options, method: 'DELETE' });
}

/**
 * Custom error class for authentication failures
 */
export class AuthenticationError extends Error {
	constructor(message: string, public statusCode: number = 401) {
		super(message);
		this.name = 'AuthenticationError';
	}
}

/**
 * Parse backend response and handle errors
 * 
 * NestJS returns data directly (not wrapped in {success, data}),
 * but some endpoints may still use the old format.
 * 
 * Throws AuthenticationError for 401 responses (caller should redirect to login)
 */
export async function parseBackendResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		// Handle 401 Unauthorized - backend is telling us to redirect to login
		if (response.status === 401) {
			throw new AuthenticationError('Authentication required', 401);
		}
		
		const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
		throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
	}

	// Check if response has content
	const contentType = response.headers.get('content-type');
	if (!contentType || !contentType.includes('application/json')) {
		// Empty response - return empty object or throw based on context
		// For DELETE requests, empty response usually means success
		return {} as T;
	}

	const text = await response.text();
	if (!text || !text.trim()) {
		return {} as T;
	}

	let data: any;
	try {
		data = JSON.parse(text);
	} catch (parseError) {
		logger.warn('Failed to parse backend response as JSON:', parseError);
		return {} as T;
	}
	
	// Handle both formats: direct data or {success, data} wrapper
	if (data.success !== undefined && data.data !== undefined) {
		return data.data as T;
	}
	
	// If success is defined but data is not, return the whole object
	// (e.g., { success: true, message: '...' })
	if (data.success !== undefined) {
		return data as T;
	}
	
	return data as T;
}
