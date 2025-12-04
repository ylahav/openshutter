
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/admin" | "/admin/albums" | "/admin/albums/[id]" | "/admin/albums/[id]/edit" | "/admin/analytics" | "/admin/backup-restore" | "/admin/blog-categories" | "/admin/deployment" | "/admin/groups" | "/admin/locations" | "/admin/pages" | "/admin/people" | "/admin/photos" | "/admin/photos/[id]" | "/admin/photos/[id]/edit" | "/admin/site-config" | "/admin/storage" | "/admin/tags" | "/admin/templates" | "/admin/templates/overrides" | "/admin/users" | "/albums" | "/albums/new" | "/albums/[alias]" | "/auth" | "/auth/login" | "/auth/logout" | "/auth/session" | "/login" | "/owner";
		RouteParams(): {
			"/admin/albums/[id]": { id: string };
			"/admin/albums/[id]/edit": { id: string };
			"/admin/photos/[id]": { id: string };
			"/admin/photos/[id]/edit": { id: string };
			"/albums/[alias]": { alias: string }
		};
		LayoutParams(): {
			"/": { id?: string; alias?: string };
			"/admin": { id?: string };
			"/admin/albums": { id?: string };
			"/admin/albums/[id]": { id: string };
			"/admin/albums/[id]/edit": { id: string };
			"/admin/analytics": Record<string, never>;
			"/admin/backup-restore": Record<string, never>;
			"/admin/blog-categories": Record<string, never>;
			"/admin/deployment": Record<string, never>;
			"/admin/groups": Record<string, never>;
			"/admin/locations": Record<string, never>;
			"/admin/pages": Record<string, never>;
			"/admin/people": Record<string, never>;
			"/admin/photos": { id?: string };
			"/admin/photos/[id]": { id: string };
			"/admin/photos/[id]/edit": { id: string };
			"/admin/site-config": Record<string, never>;
			"/admin/storage": Record<string, never>;
			"/admin/tags": Record<string, never>;
			"/admin/templates": Record<string, never>;
			"/admin/templates/overrides": Record<string, never>;
			"/admin/users": Record<string, never>;
			"/albums": { alias?: string };
			"/albums/new": Record<string, never>;
			"/albums/[alias]": { alias: string };
			"/auth": Record<string, never>;
			"/auth/login": Record<string, never>;
			"/auth/logout": Record<string, never>;
			"/auth/session": Record<string, never>;
			"/login": Record<string, never>;
			"/owner": Record<string, never>
		};
		Pathname(): "/" | "/admin" | "/admin/" | "/admin/albums" | "/admin/albums/" | `/admin/albums/${string}` & {} | `/admin/albums/${string}/` & {} | `/admin/albums/${string}/edit` & {} | `/admin/albums/${string}/edit/` & {} | "/admin/analytics" | "/admin/analytics/" | "/admin/backup-restore" | "/admin/backup-restore/" | "/admin/blog-categories" | "/admin/blog-categories/" | "/admin/deployment" | "/admin/deployment/" | "/admin/groups" | "/admin/groups/" | "/admin/locations" | "/admin/locations/" | "/admin/pages" | "/admin/pages/" | "/admin/people" | "/admin/people/" | "/admin/photos" | "/admin/photos/" | `/admin/photos/${string}` & {} | `/admin/photos/${string}/` & {} | `/admin/photos/${string}/edit` & {} | `/admin/photos/${string}/edit/` & {} | "/admin/site-config" | "/admin/site-config/" | "/admin/storage" | "/admin/storage/" | "/admin/tags" | "/admin/tags/" | "/admin/templates" | "/admin/templates/" | "/admin/templates/overrides" | "/admin/templates/overrides/" | "/admin/users" | "/admin/users/" | "/albums" | "/albums/" | "/albums/new" | "/albums/new/" | `/albums/${string}` & {} | `/albums/${string}/` & {} | "/auth" | "/auth/" | "/auth/login" | "/auth/login/" | "/auth/logout" | "/auth/logout/" | "/auth/session" | "/auth/session/" | "/login" | "/login/" | "/owner" | "/owner/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/logos/logo.jpeg" | "/models/face-api/face_landmark_68/face_landmark_68_model-shard1" | "/models/face-api/face_landmark_68/face_landmark_68_model-weights_manifest.json" | "/models/face-api/face_recognition/face_recognition_model-shard1" | "/models/face-api/face_recognition/face_recognition_model-shard2" | "/models/face-api/face_recognition/face_recognition_model-weights_manifest.json" | "/models/face-api/tiny_face_detector/tiny_face_detector_model-shard1" | "/models/face-api/tiny_face_detector/tiny_face_detector_model-weights_manifest.json" | string & {};
	}
}