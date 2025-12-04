export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["logos/logo.jpeg"]),
	mimeTypes: {".jpeg":"image/jpeg"},
	_: {
		client: {start:"_app/immutable/entry/start.Bcb9ZekD.js",app:"_app/immutable/entry/app.DhyH8VOF.js",imports:["_app/immutable/entry/start.Bcb9ZekD.js","_app/immutable/chunks/DdYhDDtT.js","_app/immutable/chunks/CK0-DIe0.js","_app/immutable/chunks/sJkrieu8.js","_app/immutable/entry/app.DhyH8VOF.js","_app/immutable/chunks/CK0-DIe0.js","_app/immutable/chunks/Bwj96XKz.js","_app/immutable/chunks/Bv0kf0zg.js","_app/immutable/chunks/mVdtGE8-.js","_app/immutable/chunks/BhPWbYAn.js","_app/immutable/chunks/CzzCZe6i.js","_app/immutable/chunks/D2vaGhTI.js","_app/immutable/chunks/DTEFG1b5.js","_app/immutable/chunks/DAVuCwJx.js","_app/immutable/chunks/ux2VXDBy.js","_app/immutable/chunks/BKTEqjJl.js","_app/immutable/chunks/sJkrieu8.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js')),
			__memo(() => import('./nodes/9.js')),
			__memo(() => import('./nodes/10.js')),
			__memo(() => import('./nodes/11.js')),
			__memo(() => import('./nodes/12.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/admin",
				pattern: /^\/admin\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/admin/people",
				pattern: /^\/admin\/people\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/admin/site-config",
				pattern: /^\/admin\/site-config\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/admin/storage",
				pattern: /^\/admin\/storage\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/admin/tags",
				pattern: /^\/admin\/tags\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/admin/templates",
				pattern: /^\/admin\/templates\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/admin/templates/overrides",
				pattern: /^\/admin\/templates\/overrides\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/auth/login",
				pattern: /^\/auth\/login\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/auth/login/_server.ts.js'))
			},
			{
				id: "/auth/logout",
				pattern: /^\/auth\/logout\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/auth/logout/_server.ts.js'))
			},
			{
				id: "/auth/session",
				pattern: /^\/auth\/session\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/auth/session/_server.ts.js'))
			},
			{
				id: "/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 11 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

export const prerendered = new Set([]);

export const base = "";