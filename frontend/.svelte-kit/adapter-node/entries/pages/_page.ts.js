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
export {
  load
};
