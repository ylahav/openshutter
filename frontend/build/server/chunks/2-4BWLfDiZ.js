import { r as redirect } from './index-wpIsICWW.js';

const load = async ({ locals }) => {
  if (!locals.user || locals.user.role !== "admin") {
    throw redirect(303, "/login?redirect=" + encodeURIComponent("/admin"));
  }
  return {
    user: locals.user
  };
};

var _layout_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 2;
let component_cache;
const component = async () => component_cache ??= (await import('./layout.svelte-CUjz1HvX.js')).default;
const server_id = "src/routes/admin/+layout.server.ts";
const imports = ["_app/immutable/nodes/2.jXgegPFO.js","_app/immutable/chunks/CVOENrm7.js","_app/immutable/chunks/mVdtGE8-.js","_app/immutable/chunks/CK0-DIe0.js","_app/immutable/chunks/D2vaGhTI.js","_app/immutable/chunks/DTEFG1b5.js","_app/immutable/chunks/CzzCZe6i.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=2-4BWLfDiZ.js.map
