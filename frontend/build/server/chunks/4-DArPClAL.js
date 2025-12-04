const load = async ({ fetch }) => {
  try {
    const backendUrl = "http://localhost:5000";
    const res = await fetch(`${backendUrl}/api/albums?parentId=root`);
    if (!res.ok) {
      console.error("Failed to fetch root albums:", res.status, res.statusText);
      return { rootAlbums: [], albumsError: "Failed to fetch albums" };
    }
    const albums = await res.json();
    if (Array.isArray(albums)) {
      return {
        rootAlbums: albums,
        albumsError: null
      };
    }
    console.error("Unexpected albums response format:", albums);
    return { rootAlbums: [], albumsError: "Failed to fetch albums" };
  } catch (err) {
    console.error("Error fetching root albums:", err);
    return { rootAlbums: [], albumsError: "Failed to fetch albums" };
  }
};

var _page_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 4;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-BL4XO6gW.js')).default;
const universal_id = "src/routes/+page.ts";
const imports = ["_app/immutable/nodes/4.Ddbc7tin.js","_app/immutable/chunks/mVdtGE8-.js","_app/immutable/chunks/CK0-DIe0.js","_app/immutable/chunks/DfpQQ0Vj.js","_app/immutable/chunks/CBTfresD.js","_app/immutable/chunks/ux2VXDBy.js","_app/immutable/chunks/BKTEqjJl.js","_app/immutable/chunks/sJkrieu8.js","_app/immutable/chunks/BhPWbYAn.js","_app/immutable/chunks/CzzCZe6i.js","_app/immutable/chunks/DTEFG1b5.js","_app/immutable/chunks/74aT5YJ6.js","_app/immutable/chunks/Bv0kf0zg.js","_app/immutable/chunks/jNwdByo0.js","_app/immutable/chunks/Bwj96XKz.js","_app/immutable/chunks/BSTdbr_g.js","_app/immutable/chunks/DD5UVB3K.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=4-DArPClAL.js.map
