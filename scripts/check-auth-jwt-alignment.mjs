#!/usr/bin/env node
/**
 * Verifies AUTH_JWT_SECRET matches between backend and frontend env files.
 * Run from repo root: node scripts/check-auth-jwt-alignment.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const DEV_DEFAULT = 'dev-secret-change-me-in-production';

function readSecret(filePath) {
	if (!fs.existsSync(filePath)) return null;
	const text = fs.readFileSync(filePath, 'utf8');
	for (const line of text.split(/\r?\n/)) {
		const m = line.match(/^\s*AUTH_JWT_SECRET=(.+)$/);
		if (m) return m[1].trim().replace(/^["']|["']$/g, '');
	}
	return null;
}

const rootLocal = readSecret(path.join(root, '.env.local'));
const backend = readSecret(path.join(root, 'backend', '.env')) ?? rootLocal ?? DEV_DEFAULT;
const frontend =
	readSecret(path.join(root, 'frontend', '.env.development')) ??
	readSecret(path.join(root, 'frontend', '.env.local')) ??
	rootLocal ??
	DEV_DEFAULT;

const backendExplicit =
	readSecret(path.join(root, 'backend', '.env')) != null || rootLocal != null;
const frontendExplicit =
	readSecret(path.join(root, 'frontend', '.env.development')) != null ||
	readSecret(path.join(root, 'frontend', '.env.local')) != null ||
	rootLocal != null;

console.log('backend AUTH_JWT_SECRET:', backendExplicit ? '(set in backend/.env)' : `(default: ${DEV_DEFAULT})`);
console.log(
	'frontend AUTH_JWT_SECRET:',
	frontendExplicit ? '(set in frontend env)' : `(default: ${DEV_DEFAULT})`,
);

if (backend === frontend) {
	console.log('OK: secrets match.');
	process.exit(0);
}

console.error('ERROR: AUTH_JWT_SECRET mismatch.');
console.error('Set the same AUTH_JWT_SECRET in backend/.env and frontend/.env.development (or .env.local).');
console.error('Quick fix: node scripts/sync-auth-jwt-secret.mjs');
console.error('Then log out, restart pnpm dev, and log in again.');
process.exit(1);
