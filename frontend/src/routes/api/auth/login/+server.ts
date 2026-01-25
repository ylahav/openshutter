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
		const backendResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ email, password }),
		});

		if (!backendResponse.ok) {
			const errorData = await backendResponse.json().catch(() => ({ error: 'Login failed' }));
			return json({ error: errorData.error || 'Invalid credentials' }, { status: backendResponse.status });
		}

		const data = await backendResponse.json();
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
		
		// Log token creation for debugging
		console.log('[Login API] Token created:', {
			email: user.email,
			role: user.role,
			tokenLength: jwt.length
		});

		// Set the cookie using SvelteKit's cookies API
		// In development, don't use secure flag (allows http://localhost)
		const isProduction = process.env.NODE_ENV === 'production';
		
		cookies.set('auth_token', jwt, {
			httpOnly: true,
			secure: isProduction,
			path: '/',
			maxAge: JWT_TTL,
			sameSite: 'lax'
		});

		return json({ role: user.role, user }, { status: 200 });
	} catch (error) {
		console.error('Login error:', error);
		return json({ error: 'Login failed' }, { status: 500 });
	}
};
