import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

// Get configuration from environment variables (for development)
// These are only used during development - production uses adapter-node
const DEV_PORT = parseInt(process.env.PORT || process.env.VITE_PORT || '4000', 10);
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '5000', 10);
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${BACKEND_PORT}`;

export default defineConfig({
	plugins: [
		sveltekit({
			// Suppress a11y warnings during build
			compilerOptions: {
				warnings: (warning, defaultHandler) => {
					// Suppress accessibility warnings during builds (both dev and production)
					if (warning.code?.startsWith('a11y-')) {
						return;
					}
					defaultHandler(warning);
				},
			},
		}),
	],
	build: {
		chunkSizeWarningLimit: 1000, // Increase limit to reduce warnings for large chunks
		rollupOptions: {
			onwarn(warning, warn) {
				// Suppress TypeScript import warnings for storage types (false positives)
				if (
					warning.code === 'MODULE_LEVEL_DIRECTIVE' ||
					(warning.message && warning.message.includes('is not exported by'))
				) {
					// These are often false positives in SvelteKit builds
					return;
				}
				// Use default warning handler for other warnings
				warn(warning);
			},
		},
	},
	server: {
		port: DEV_PORT,
		fs: {
			// Allow serving files from the project root (for pnpm workspace)
			allow: [
				'..',
				path.resolve(__dirname, '..'),
			],
		},
		proxy: {
			// Proxy API requests to backend, but exclude routes handled by SvelteKit
			// Use BACKEND_URL environment variable if set, otherwise construct from BACKEND_PORT
			'/api': {
				target: BACKEND_URL,
				changeOrigin: true,
				// Don't proxy routes that have SvelteKit handlers
				bypass: (req) => {
					// Let SvelteKit handle these routes
					const url = req.url || '';
					const method = req.method || 'GET';
					
					if (
						url.startsWith('/api/auth/login') ||
						url.startsWith('/api/auth/google/') ||
						url.startsWith('/api/admin/storage') ||
						url.startsWith('/api/admin/storage-options') ||
						url.startsWith('/api/admin/translations') ||
						url.startsWith('/api/admin/template-builder') ||
						url.startsWith('/api/owner/storage-options') ||
						(url.startsWith('/api/albums') && method === 'POST') ||
						url.startsWith('/api/albums/hierarchy') ||
						url.startsWith('/api/storage/wasabi/test') ||
						url.startsWith('/api/storage/backblaze/test') ||
						url.startsWith('/api/storage/google-drive/test')
					) {
						return req.url;
					}
					// Proxy everything else to backend
					return null;
				},
			},
		},
	},
	preview: {
		port: DEV_PORT,
		host: true, // Allow all hosts, or specify allowed hosts
		// Alternatively, specify allowed hosts explicitly:
		// allowedHosts: [
		// 	'demo.openshutter.org',
		// 	'localhost',
		// 	'127.0.0.1'
		// ]
	},
	css: {
		postcss: './postcss.config.js',
	},
});
