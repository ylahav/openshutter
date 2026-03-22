// See https://svelte.dev/docs/kit/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		type SiteContext =
			| { type: 'global' }
			| { type: 'owner-site'; ownerId: string };

		interface Locals {
			user: {
				id: string;
				email: string;
				name: string;
				role: 'admin' | 'owner' | 'guest';
				forcePasswordChange?: boolean;
			} | null;
			/** Set in hooks from GET /api/site-context + Host forwarding (owner custom domains). */
			siteContext: SiteContext;
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
