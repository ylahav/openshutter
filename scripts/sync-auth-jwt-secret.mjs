#!/usr/bin/env node
/**
 * Copies AUTH_JWT_SECRET from backend/.env into frontend env files so JWT verification works.
 * Run from repo root: node scripts/sync-auth-jwt-secret.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const DEV_DEFAULT = 'dev-secret-change-me-in-production';

function readSecret(filePath) {
	if (!fs.existsSync(filePath)) return null;
	const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
	for (const line of lines) {
		const m = line.match(/^\s*AUTH_JWT_SECRET=(.+)$/);
		if (m) return m[1].trim().replace(/^["']|["']$/g, '');
	}
	return null;
}

function upsertSecret(filePath, secret) {
	const line = `AUTH_JWT_SECRET=${secret}`;
	let lines = [];
	if (fs.existsSync(filePath)) {
		lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
		let found = false;
		lines = lines.map((l) => {
			if (/^\s*AUTH_JWT_SECRET=/.test(l)) {
				found = true;
				return line;
			}
			return l;
		});
		if (!found) {
			if (lines.length && lines[lines.length - 1] !== '') lines.push('');
			lines.push('# Synced by scripts/sync-auth-jwt-secret.mjs');
			lines.push(line);
		}
	} else {
		lines = ['# Local frontend env', line, ''];
	}
	fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
	console.log('Updated', path.relative(root, filePath));
}

const backendPath = path.join(root, 'backend', '.env');
const secret = readSecret(backendPath) ?? DEV_DEFAULT;

if (!readSecret(backendPath)) {
	console.warn('backend/.env has no AUTH_JWT_SECRET; using dev default.');
}

upsertSecret(path.join(root, 'frontend', '.env.development'), secret);
upsertSecret(path.join(root, 'frontend', '.env.local'), secret);

const rootLocal = path.join(root, '.env.local');
if (fs.existsSync(rootLocal)) {
	upsertSecret(rootLocal, secret);
}

console.log('\nDone. Restart pnpm dev, log out, and log in again.');
console.log('Verify: node scripts/check-auth-jwt-alignment.mjs');
