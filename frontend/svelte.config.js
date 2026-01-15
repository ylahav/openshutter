import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			// Allow all hosts in production (for reverse proxy setups)
			// In production, set ORIGIN environment variable for CSRF protection
			// ORIGIN should match your domain (e.g., https://demo.openshutter.org)
		}),
		alias: {
			$components: 'src/lib/components',
			$stores: 'src/lib/stores',
			$types: 'src/lib/types',
			$utils: 'src/lib/utils',
		},
	},

	compilerOptions: {
		// Suppress accessibility warnings during build (they're still checked in dev)
		// You can fix these gradually, but they don't break functionality
		enableSourcemap: true,
	},
};

export default config;
