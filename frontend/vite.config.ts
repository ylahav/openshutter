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
			'/api': {
				target: 'http://localhost:5000',
				changeOrigin: true,
			},
		},
	},
	css: {
		postcss: './postcss.config.js',
	},
});
