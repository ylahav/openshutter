import * as server from '../entries/pages/owner/_layout.server.ts.js';

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/owner/+layout.server.ts";
export const imports = ["_app/immutable/nodes/3.jXgegPFO.js","_app/immutable/chunks/CVOENrm7.js","_app/immutable/chunks/mVdtGE8-.js","_app/immutable/chunks/CK0-DIe0.js","_app/immutable/chunks/D2vaGhTI.js","_app/immutable/chunks/DTEFG1b5.js","_app/immutable/chunks/CzzCZe6i.js"];
export const stylesheets = [];
export const fonts = [];
