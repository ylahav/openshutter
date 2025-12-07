import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 4000,
		fs: {
			// Allow serving files from the project root (for pnpm workspace)
			allow: [
				'..',
				path.resolve(__dirname, '..'),
			],
		},
		proxy: {
			// Proxy API requests to backend, but exclude routes handled by SvelteKit
			'/api': {
				target: 'http://localhost:5000',
				changeOrigin: true,
				// Don't proxy routes that have SvelteKit handlers
				bypass: (req) => {
					// Let SvelteKit handle these routes
					if (req.url?.startsWith('/api/auth/login')) {
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
