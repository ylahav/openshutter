import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

// Get configuration from environment variables (for development)
// These are only used during development - production uses adapter-node
const DEV_PORT = parseInt(process.env.PORT || process.env.VITE_PORT || '4000', 10);
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '5000', 10);
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${BACKEND_PORT}`;

export default defineConfig({
	plugins: [sveltekit()],
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
						if (
							url.startsWith('/api/auth/login') ||
							url.startsWith('/api/admin/storage-options') ||
							url.startsWith('/api/owner/storage-options')
						) {
							return req.url;
						}
						// Proxy everything else to backend
						return null;
					},
				},
			},
	},
	css: {
		postcss: './postcss.config.js',
	},
});
