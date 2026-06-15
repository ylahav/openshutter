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
			$pageBuilder: 'src/lib/page-builder',
			$stores: 'src/lib/stores',
			$types: 'src/lib/types',
			$utils: 'src/lib/utils',
			$templates: 'src/templates'
		},
	},

	compilerOptions: {
		enableSourcemap: true,
	},
};

export default config;
