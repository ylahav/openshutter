import * as universal from '../entries/pages/_page.ts.js';

export const index = 4;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+page.ts";
export const imports = ["_app/immutable/nodes/4.Ddbc7tin.js","_app/immutable/chunks/mVdtGE8-.js","_app/immutable/chunks/CK0-DIe0.js","_app/immutable/chunks/DfpQQ0Vj.js","_app/immutable/chunks/CBTfresD.js","_app/immutable/chunks/ux2VXDBy.js","_app/immutable/chunks/BKTEqjJl.js","_app/immutable/chunks/sJkrieu8.js","_app/immutable/chunks/BhPWbYAn.js","_app/immutable/chunks/CzzCZe6i.js","_app/immutable/chunks/DTEFG1b5.js","_app/immutable/chunks/74aT5YJ6.js","_app/immutable/chunks/Bv0kf0zg.js","_app/immutable/chunks/jNwdByo0.js","_app/immutable/chunks/Bwj96XKz.js","_app/immutable/chunks/BSTdbr_g.js","_app/immutable/chunks/DD5UVB3K.js"];
export const stylesheets = [];
export const fonts = [];
