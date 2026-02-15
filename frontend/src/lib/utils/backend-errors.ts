/**
 * Error classes used when the frontend proxies to the backend.
 * Kept in a separate file so errorHandler (used client-side) can import them
 * without pulling in backend-api (which uses $env/dynamic/private, server-only).
 */

/** Thrown when the backend returns 401 Unauthorized. */
export class AuthenticationError extends Error {
	constructor(message: string, public statusCode: number = 401) {
		super(message);
		this.name = 'AuthenticationError';
	}
}

/** Thrown when the backend returns a non-OK HTTP status (e.g. 404, 503). */
export class BackendHttpError extends Error {
	constructor(
		message: string,
		public statusCode: number,
		public body?: unknown
	) {
		super(message);
		this.name = 'BackendHttpError';
	}
}
