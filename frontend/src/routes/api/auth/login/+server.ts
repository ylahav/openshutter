import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SignJWT } from 'jose';
import { env } from '$env/dynamic/private';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// In production: Use shared timestamp file so frontend and backend use the same JWT secret
// In development: Use shared timestamp file so frontend and backend use the same JWT secret
const isProduction = process.env.NODE_ENV === 'production';
// Use project root directory for shared timestamp file (both frontend and backend can access it)
// Frontend is typically at <root>/frontend, so go up one level to get to root
const ROOT_DIR = join(process.cwd(), '..');
const TIMESTAMP_FILE = join(ROOT_DIR, '.server-start-time');
const PID_FILE = join(process.cwd(), '.server-pid');

function getServerStartTime(): string {
	// Both production and development use shared timestamp file
	// This ensures frontend and backend always use the same JWT secret
	if (isProduction) {
		// Production: Check if timestamp file exists, if not create new one (restart scenario)
		// If it exists, use it (so both servers use the same secret)
		if (existsSync(TIMESTAMP_FILE)) {
			try {
				const existingTimestamp = readFileSync(TIMESTAMP_FILE, 'utf8').trim();
				// Use existing timestamp so both servers share the same secret
				return existingTimestamp;
			} catch {
				// If read fails, create new timestamp
			}
		}
		// Create new timestamp file (first server to start, or after both restart)
		const timestamp = Date.now().toString();
		try {
			writeFileSync(TIMESTAMP_FILE, timestamp, 'utf8');
		} catch {
			// If write fails, just use the timestamp (file might not be writable)
		}
		return timestamp;
	} else {
		// Development: Check if this is a new process (restart) or same process (hot reload)
		const currentPid = process.pid.toString();
		let isNewProcess = true;
		
		if (existsSync(PID_FILE)) {
			try {
				const storedPid = readFileSync(PID_FILE, 'utf8').trim();
				if (storedPid === currentPid) {
					// Same process - this is a hot reload, reuse existing timestamp
					isNewProcess = false;
				}
			} catch {
				// If read fails, treat as new process
			}
		}
		
		if (isNewProcess) {
			// New process (restart) - generate new timestamp to invalidate sessions
			const timestamp = Date.now().toString();
			try {
				writeFileSync(TIMESTAMP_FILE, timestamp, 'utf8');
				writeFileSync(PID_FILE, currentPid, 'utf8');
			} catch {
				// If write fails, just use the timestamp (file might not be writable)
			}
			return timestamp;
		} else {
			// Same process (hot reload) - reuse existing timestamp
			if (existsSync(TIMESTAMP_FILE)) {
				try {
					return readFileSync(TIMESTAMP_FILE, 'utf8').trim();
				} catch {
					// If read fails, create new timestamp
				}
			}
			// Fallback: create new timestamp
			const timestamp = Date.now().toString();
			try {
				writeFileSync(TIMESTAMP_FILE, timestamp, 'utf8');
			} catch {
				// If write fails, just use the timestamp
			}
			return timestamp;
		}
	}
}

const SERVER_START_TIME = getServerStartTime();

// Derive JWT secret from base secret + server start time
// In production: This ensures all tokens issued before server restart become invalid
// In development: Uses persistent timestamp to avoid invalidating on hot reload
function getJWTSecret(): Uint8Array {
	const baseSecret = env.AUTH_JWT_SECRET || process.env.AUTH_JWT_SECRET || 'dev-secret-change-me-in-production';
	const combinedSecret = `${baseSecret}:${SERVER_START_TIME}`;
	const hash = createHash('sha256').update(combinedSecret).digest();
	const secret = new TextEncoder().encode(Buffer.from(hash).toString('base64'));
	
	// Always log secret derivation for debugging authentication issues
	console.log('[Login API] JWT Secret derived:', {
		serverStartTime: SERVER_START_TIME,
		baseSecretLength: baseSecret.length,
		baseSecretPreview: baseSecret.substring(0, 10) + '...',
		secretLength: secret.length,
		secretHash: Buffer.from(hash).toString('hex').substring(0, 16) + '...'
	});
	
	return secret;
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
		
		// Log token creation for debugging (always log in dev, conditional in prod)
		console.log('[Login API] Token created:', {
			email: user.email,
			role: user.role,
			serverStartTime: SERVER_START_TIME,
			tokenLength: jwt.length,
			tokenPreview: jwt.substring(0, 30) + '...',
			baseSecretLength: (env.AUTH_JWT_SECRET || process.env.AUTH_JWT_SECRET || 'dev-secret-change-me-in-production').length
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
