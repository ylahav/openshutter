/**
 * Backend API Utility
 * 
 * Helper functions for making requests to the NestJS backend API
 * from SvelteKit server-side routes.
 */

import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';

// Backend API base URL
const BACKEND_URL = env.BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000';
const API_BASE = `${BACKEND_URL}/api`;

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

	// Add Authorization header if token is available
	if (authToken) {
		defaultHeaders['Authorization'] = `Bearer ${authToken}`;
	}

	// Forward cookies for server-to-server requests
	const cookieHeader: string[] = [];
	if (options.cookies) {
		const authCookie = options.cookies.get('auth_token');
		if (authCookie) {
			cookieHeader.push(`auth_token=${authCookie}`);
		}
	}
	if (cookieHeader.length > 0) {
		defaultHeaders['Cookie'] = cookieHeader.join('; ');
	}

	const response = await fetch(url, {
		...options,
		headers: {
			...defaultHeaders,
			...options.headers,
		},
	});

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
 * Parse backend response and handle errors
 * 
 * NestJS returns data directly (not wrapped in {success, data}),
 * but some endpoints may still use the old format.
 */
export async function parseBackendResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
		throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
	}

	const data = await response.json();
	
	// Handle both formats: direct data or {success, data} wrapper
	if (data.success !== undefined) {
		return data.data as T;
	}
	
	return data as T;
}
