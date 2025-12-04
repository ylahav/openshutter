const manifest = (() => {
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
			__memo(() => import('./chunks/0-CP62PDUR.js')),
			__memo(() => import('./chunks/1-BbgLw80J.js')),
			__memo(() => import('./chunks/2-4BWLfDiZ.js')),
			__memo(() => import('./chunks/4-DArPClAL.js')),
			__memo(() => import('./chunks/5-DKNLhOPM.js')),
			__memo(() => import('./chunks/6-KTFafWWJ.js')),
			__memo(() => import('./chunks/7-B7xHgOs5.js')),
			__memo(() => import('./chunks/8-CHy4YSYC.js')),
			__memo(() => import('./chunks/9-yyqWY7iZ.js')),
			__memo(() => import('./chunks/10-D9HCInlN.js')),
			__memo(() => import('./chunks/11-B-5l_tC8.js')),
			__memo(() => import('./chunks/12-Dnx4U15-.js'))
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
				endpoint: __memo(() => import('./chunks/_server.ts-DxSvFI8u.js'))
			},
			{
				id: "/auth/logout",
				pattern: /^\/auth\/logout\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-D1W3i3Hw.js'))
			},
			{
				id: "/auth/session",
				pattern: /^\/auth\/session\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BTN_DQ5U.js'))
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

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
