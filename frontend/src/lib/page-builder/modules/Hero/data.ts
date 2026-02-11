// frontend/src/lib/page-builder/modules/Hero/data.ts
export const heroDataSources = [
    {
      key: 'none',
      label: 'No dynamic data (use config only)',
    },
    // later you could add things like:
    // { key: 'home.featuredAlbum', label: 'Featured album title/description' },
  ] as const;
