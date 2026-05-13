import { ApiError, parseError } from '$lib/utils/errorHandler';

/**
 * Single string for banners / toasts after a failed submit.
 * Prefer `parseError` so `ApiError`, `BackendHttpError`, and plain `Error` behave consistently.
 */
export function submitErrorMessage(err: unknown): string {
	return parseError(err).userMessage;
}

/**
 * If the backend attached structured `details` (rare today), read a per-field string.
 * Nest often returns only top-level `message`; when you add validation pipes that set `details`, map keys here.
 */
export function fieldHintFromApiError(err: unknown, field: string): string | undefined {
	if (!(err instanceof ApiError) || !err.details || typeof err.details !== 'object') return undefined;
	const d = err.details as Record<string, unknown>;
	const direct = d[field];
	if (typeof direct === 'string' && direct.trim()) return direct;
	if (Array.isArray(direct) && direct.length) return direct.map(String).join(' ');
	const nested = d.errors;
	if (nested && typeof nested === 'object') {
		const v = (nested as Record<string, unknown>)[field];
		if (typeof v === 'string' && v.trim()) return v;
		if (Array.isArray(v) && v.length) return v.map(String).join(' ');
	}
	return undefined;
}
