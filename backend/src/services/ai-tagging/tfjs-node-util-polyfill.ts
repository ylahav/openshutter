/**
 * TensorFlow.js Node still calls Node's legacy `util.isNullOrUndefined` / `util.isArray`
 * (removed in Node.js 23+), which breaks MobileNet load.
 *
 * Must run before any `require('@tensorflow/tfjs-node')`. Loaded from `main.ts` and again
 * from `local.provider.ts` so dev/watch and dynamic imports are covered.
 *
 * We use `require('util')` so we mutate the exact object CommonJS consumers get from `require('util')`.
 * `import * as u from 'node:util'` can be a live binding namespace that does not patch `require('util')` reliably.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
function patchUtil(u: Record<string, unknown>): void {
	if (typeof u.isNullOrUndefined !== 'function') {
		u.isNullOrUndefined = (v: unknown) => v == null;
	}
	if (typeof u.isArray !== 'function') {
		u.isArray = Array.isArray;
	}
}

const utilMod = require('util') as Record<string, unknown>;
patchUtil(utilMod);

try {
	const nu = require('node:util') as Record<string, unknown>;
	if (nu !== utilMod) {
		patchUtil(nu);
	}
} catch {
	// ignore
}

export {};
