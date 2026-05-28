/**
 * Converts `let loading = …` + `{#if loading}` to writable stores for Svelte 5.
 * Run from repo root: node scripts/fix-svelte5-loading.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const roots = [
	path.join(import.meta.dirname, '..', 'frontend', 'src', 'routes', 'admin'),
	path.join(import.meta.dirname, '..', 'frontend', 'src', 'routes', 'owner'),
];

function walk(dir, acc = []) {
	for (const name of fs.readdirSync(dir)) {
		const p = path.join(dir, name);
		const st = fs.statSync(p);
		if (st.isDirectory()) walk(p, acc);
		else if (name.endsWith('.svelte')) acc.push(p);
	}
	return acc;
}

for (const root of roots) {
for (const file of walk(root)) {
	let src = fs.readFileSync(file, 'utf8');
	if (!/\blet loading = /.test(src) || !/\{#if loading\}/.test(src)) continue;
	if (src.includes('$loading')) continue;

	if (!/\bwritable\b/.test(src)) {
		src = src.replace(
			/<script lang="ts">\r?\n/,
			'<script lang="ts">\n\timport { writable } from \'svelte/store\';\n',
		);
	}

	src = src.replace(/\blet loading = (true|false);/, (_, val) => `const loading = writable(${val});`);
	src = src.replace(/\bloading = true\b/g, 'loading.set(true)');
	src = src.replace(/\bloading = false\b/g, 'loading.set(false)');
	src = src.replace(/\{#if loading\}/g, '{#if $loading}');

	fs.writeFileSync(file, src, 'utf8');
	console.log('fixed', path.relative(root, file));
}
}
