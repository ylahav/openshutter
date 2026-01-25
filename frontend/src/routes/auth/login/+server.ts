import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SignJWT } from 'jose';
import { env } from '$env/dynamic/private';

// Simple static JWT secret - backend handles all authentication
function getJWTSecret(): Uint8Array {
	const baseSecret = env.AUTH_JWT_SECRET || process.env.AUTH_JWT_SECRET || 'dev-secret-change-me-in-production';
	// Convert string secret to Uint8Array for jose library
	return new TextEncoder().encode(baseSecret);
}

const JWT_SECRET = getJWTSecret();
const JWT_TTL = 60 * 60 * 24 * 7; // 7 days

// Backend API URL - use absolute URL for server-side requests
const BACKEND_URL = env.BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { email, password } = await request.json();

		if (!email || !password) {
			return json({ error: 'Missing credentials' }, { status: 400 });
		}

		// Call NestJS backend auth endpoint
		const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ email, password }),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ error: 'Login failed' }));
			return json({ error: errorData.error || 'Invalid credentials' }, { status: response.status });
		}

		const data = await response.json();
		const { user } = data;

		// Create JWT token for SvelteKit session
		const jwt = await new SignJWT({
			email: user.email,
			name: user.name,
			role: user.role
		})
			.setProtectedHeader({ alg: 'HS256' })
			.setSubject(user.id)
			.setIssuedAt()
			.setExpirationTime(`${JWT_TTL}s`)
			.sign(JWT_SECRET);

		cookies.set('auth_token', jwt, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			path: '/',
			maxAge: JWT_TTL,
			sameSite: 'lax'
		});

		return json({ role: user.role, user });
	} catch (error) {
		console.error('Login error:', error);
		return json({ error: 'Login failed' }, { status: 500 });
	}
};
