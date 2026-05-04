import { handleApiErrorResponse } from './errorHandler';

const LIST_PAGE_SIZE = 50_000;

/**
 * GET admin list endpoints that return `{ data: T[], pagination?: ... }`.
 */
export async function fetchAdminPaginatedList(endpoint: string): Promise<unknown[]> {
	const sep = endpoint.includes('?') ? '&' : '?';
	const url = `${endpoint}${sep}page=1&limit=${LIST_PAGE_SIZE}`;
	const response = await fetch(url, { credentials: 'include' });
	if (!response.ok) {
		await handleApiErrorResponse(response);
	}
	const result = await response.json();
	if (Array.isArray(result)) return result;
	if (result?.data && Array.isArray(result.data)) return result.data;
	return [];
}

export function downloadJson(filename: string, payload: unknown): void {
	const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

/**
 * Accepts a raw JSON array, or an envelope `{ items: [] }` / `{ data: [] }` (export format).
 */
export function parseImportItems(jsonText: string): unknown[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(jsonText);
	} catch {
		throw new Error('INVALID_JSON');
	}
	if (Array.isArray(parsed)) return parsed;
	if (parsed && typeof parsed === 'object') {
		const o = parsed as Record<string, unknown>;
		if (Array.isArray(o.items)) return o.items;
		if (Array.isArray(o.data)) return o.data;
	}
	throw new Error('INVALID_SHAPE');
}

export async function adminPostJson(endpoint: string, body: unknown): Promise<void> {
	const res = await fetch(endpoint, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		let msg = `HTTP ${res.status}`;
		try {
			const j = (await res.json()) as { message?: string; error?: string };
			msg = (j.message || j.error || msg) as string;
		} catch {
			/* ignore */
		}
		throw new Error(msg);
	}
}

export function applyTemplateVars(template: string, vars: Record<string, string | number>): string {
	return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}
