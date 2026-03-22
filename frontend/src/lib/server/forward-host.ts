/**
 * Headers to send to the NestJS backend so SiteContextMiddleware can resolve
 * owner custom domains (matches Host / X-Forwarded-Host the visitor used).
 */
export function forwardedHostHeadersFromRequest(request: Request): Record<string, string> {
	const raw = request.headers.get('x-forwarded-host') || request.headers.get('host');
	if (!raw) return {};
	const host = raw.split(',')[0]?.trim().toLowerCase() || '';
	return host ? { 'X-Forwarded-Host': host } : {};
}
