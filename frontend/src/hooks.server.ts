import type { Handle } from '@sveltejs/kit';
import { jwtVerify } from 'jose';
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
	const serverType = isProduction ? 'FRONTEND (PROD)' : 'FRONTEND (DEV)';
	
	if (isProduction) {
		// Production: Check if timestamp file exists, if not create new one (restart scenario)
		// If it exists, use it (so both servers use the same secret)
		if (existsSync(TIMESTAMP_FILE)) {
			try {
				const existingTimestamp = readFileSync(TIMESTAMP_FILE, 'utf8').trim();
				console.log(`🔐 ${serverType} - Using existing shared timestamp: ${existingTimestamp} (from ${TIMESTAMP_FILE})`);
				// Use existing timestamp so both servers share the same secret
				return existingTimestamp;
			} catch (error) {
				console.warn(`⚠️  ${serverType} - Failed to read timestamp file:`, error);
				// If read fails, create new timestamp
			}
		}
		// Create new timestamp file (first server to start, or after both restart)
		const timestamp = Date.now().toString();
		try {
			writeFileSync(TIMESTAMP_FILE, timestamp, 'utf8');
			console.log(`🔐 ${serverType} - Created new shared timestamp: ${timestamp} (at ${TIMESTAMP_FILE})`);
		} catch (error) {
			console.warn(`⚠️  ${serverType} - Failed to write timestamp file:`, error);
			// If write fails, just use the timestamp (file might not be writable)
		}
		return timestamp;
	} else {
		// Development: Use shared timestamp file so frontend and backend use the same secret
		// First, check if shared timestamp file already exists (from backend or previous start)
		if (existsSync(TIMESTAMP_FILE)) {
			try {
				const existingTimestamp = readFileSync(TIMESTAMP_FILE, 'utf8').trim();
				console.log(`🔐 ${serverType} - Using existing shared timestamp: ${existingTimestamp} (from ${TIMESTAMP_FILE})`);
				// Update PID file for hot reload detection
				const currentPid = process.pid.toString();
				try {
					writeFileSync(PID_FILE, currentPid, 'utf8');
				} catch {
					// PID file write failure is not critical
				}
				return existingTimestamp;
			} catch (error) {
				console.warn(`⚠️  ${serverType} - Failed to read timestamp file:`, error);
				// If read fails, continue to create new timestamp
			}
		}
		
		// No existing timestamp file - check if this is a new process (restart) or same process (hot reload)
		const currentPid = process.pid.toString();
		let isNewProcess = true;
		
		if (existsSync(PID_FILE)) {
			try {
				const storedPid = readFileSync(PID_FILE, 'utf8').trim();
				if (storedPid === currentPid) {
					// Same process - this is a hot reload, but no timestamp file exists
					// This shouldn't happen, but create a new one
					isNewProcess = false;
				}
			} catch {
				// If read fails, treat as new process
			}
		}
		
		// Create new timestamp file (first server to start, or after both restart)
		const timestamp = Date.now().toString();
		try {
			writeFileSync(TIMESTAMP_FILE, timestamp, 'utf8');
			writeFileSync(PID_FILE, currentPid, 'utf8');
			if (isNewProcess) {
				console.log(`🔐 ${serverType} - Created new shared timestamp (restart): ${timestamp} (at ${TIMESTAMP_FILE})`);
			} else {
				console.log(`🔐 ${serverType} - Created new shared timestamp (no existing file): ${timestamp} (at ${TIMESTAMP_FILE})`);
			}
		} catch (error) {
			console.warn(`⚠️  ${serverType} - Failed to write timestamp file:`, error);
			// If write fails, just use the timestamp (file might not be writable)
		}
		return timestamp;
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
	return new TextEncoder().encode(Buffer.from(hash).toString('base64'));
}

const JWT_SECRET = getJWTSecret();

// Log server start (only once when module loads)
if (typeof process !== 'undefined') {
	const mode = isProduction ? 'PRODUCTION' : 'DEVELOPMENT';
	console.log(`🔐 Server started (${mode}) at ${new Date(parseInt(SERVER_START_TIME)).toISOString()}${isProduction ? ' - all previous sessions invalidated' : ''}`);
}

export const handle: Handle = async ({ event, resolve }) => {
	// Default anonymous user
	event.locals.user = null;

	const token = event.cookies.get('auth_token');
	
	if (token) {
		try {
			const { payload } = await jwtVerify(token, JWT_SECRET);
			event.locals.user = {
				id: String(payload.sub),
				email: String(payload.email),
				name: String(payload.name),
				role: (payload.role as 'admin' | 'owner' | 'guest') ?? 'owner'
			};
		} catch (error: any) {
			// Only log unexpected errors - signature verification failures are expected after server restart
			if (error?.code !== 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
				console.error('Token verification failed:', error);
			}
			// Invalid/expired token - clear it
			event.cookies.delete('auth_token', { path: '/' });
		}
	}

	// Protect admin routes
	const path = event.url.pathname;
	if (path.startsWith('/admin')) {
		if (!event.locals.user || event.locals.user.role !== 'admin') {
			return Response.redirect(new URL('/login?redirect=' + encodeURIComponent(path), event.url), 303);
		}
	}

	// Protect owner routes (admin can also access)
	if (path.startsWith('/owner')) {
		if (!event.locals.user || (event.locals.user.role !== 'owner' && event.locals.user.role !== 'admin')) {
			return Response.redirect(new URL('/login?redirect=' + encodeURIComponent(path), event.url), 303);
		}
	}

	return resolve(event);
};
