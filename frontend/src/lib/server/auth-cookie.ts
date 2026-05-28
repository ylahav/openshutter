/**
 * Whether auth cookies should use the Secure flag.
 * Local production installs use http://localhost — NODE_ENV=production alone must not force Secure cookies.
 */
export function authCookieSecure(requestUrl: URL): boolean {
	const origin = process.env.ORIGIN?.trim();
	if (origin) {
		return origin.startsWith('https://');
	}
	return requestUrl.protocol === 'https:';
}
