/**
 * MongoDB shell script to seed built-in themes
 * 
 * Usage:
 *   mongosh mongodb://localhost:27017/openshutter scripts/seed-themes.mongodb.js
 * 
 * Or if already connected:
 *   load('scripts/seed-themes.mongodb.js')
 */

// Default page layouts and modules
const DEFAULT_PAGE_LAYOUTS = {
  home: { gridRows: 2, gridColumns: 1 },
  gallery: { gridRows: 1, gridColumns: 1 },
  album: { gridRows: 1, gridColumns: 1 },
  search: { gridRows: 1, gridColumns: 1 },
  header: { gridRows: 1, gridColumns: 3 },
  footer: { gridRows: 1, gridColumns: 1 }
};

const DEFAULT_PAGE_MODULES = {
  home: [
    {
      _id: 'mod_default_home_hero',
      type: 'hero',
      props: {
        title: { en: 'Welcome to Our Gallery' },
        subtitle: { en: 'Discover amazing moments captured in time' },
        ctaLabel: { en: 'Explore Albums' },
        ctaUrl: '/albums',
        backgroundStyle: 'light'
      },
      rowOrder: 0,
      columnIndex: 0,
      rowSpan: 1,
      colSpan: 1
    },
    {
      _id: 'mod_default_home_albums',
      type: 'albumsGrid',
      props: { albumSource: 'root' },
      rowOrder: 1,
      columnIndex: 0,
      rowSpan: 1,
      colSpan: 1
    }
  ],
  gallery: [
    {
      _id: 'mod_default_gallery_albums',
      type: 'albumsGrid',
      props: { albumSource: 'root' },
      rowOrder: 0,
      columnIndex: 0,
      rowSpan: 1,
      colSpan: 1
    }
  ],
  album: [
    {
      _id: 'mod_default_album_gallery',
      type: 'albumGallery',
      props: { albumSource: 'current' },
      rowOrder: 0,
      columnIndex: 0,
      rowSpan: 1,
      colSpan: 1
    }
  ],
  search: [
    {
      _id: 'mod_default_search_text',
      type: 'richText',
      props: {
        title: { en: 'Search Results' },
        body: { en: '<p>Use the search bar to find photos, albums, people, and locations.</p>' },
        background: 'white'
      },
      rowOrder: 0,
      columnIndex: 0,
      rowSpan: 1,
      colSpan: 1
    }
  ],
  header: [
    {
      _id: 'mod_default_header_logo',
      type: 'logo',
      props: { showAsLink: true },
      rowOrder: 0,
      columnIndex: 0,
      rowSpan: 1,
      colSpan: 1
    },
    {
      _id: 'mod_default_header_title',
      type: 'siteTitle',
      props: { showAsLink: true },
      rowOrder: 0,
      columnIndex: 1,
      rowSpan: 1,
      colSpan: 1
    },
    {
      _id: 'mod_default_header_menu',
      type: 'menu',
      props: {},
      rowOrder: 0,
      columnIndex: 2,
      rowSpan: 1,
      colSpan: 1
    }
  ],
  footer: [
    {
      _id: 'mod_default_footer_text',
      type: 'richText',
      props: {
        title: {},
        body: { en: '<p>&copy; 2024 OpenShutter. All rights reserved.</p>' },
        background: 'gray'
      },
      rowOrder: 0,
      columnIndex: 0,
      rowSpan: 1,
      colSpan: 1
    }
  ]
};

const BUILT_IN_THEMES = [
  {
    name: 'Modern',
    description: 'Contemporary and sleek design',
    baseTemplate: 'modern',
    basePalette: null,
    customColors: {
      primary: '#3b82f6',
      secondary: '#6b7280',
      accent: '#10b981',
      background: '#ffffff',
      text: '#111827',
      muted: '#6b7280'
    },
    customFonts: {
      heading: 'Inter',
      body: 'Inter'
    },
    customLayout: {
      maxWidth: '1200px',
      containerPadding: '1rem',
      gridGap: '1.5rem'
    },
    componentVisibility: {},
    headerConfig: {},
    pageModules: DEFAULT_PAGE_MODULES,
    pageLayout: DEFAULT_PAGE_LAYOUTS,
    isPublished: true,
    isBuiltIn: true
  },
  {
    name: 'Elegant',
    description: 'Elegant and sophisticated design',
    baseTemplate: 'elegant',
    basePalette: null,
    customColors: {
      primary: '#8b5cf6',
      secondary: '#a78bfa',
      accent: '#f59e0b',
      background: '#ffffff',
      text: '#1f2937',
      muted: '#6b7280'
    },
    customFonts: {
      heading: 'Playfair Display',
      body: 'Inter'
    },
    customLayout: {
      maxWidth: '1200px',
      containerPadding: '1rem',
      gridGap: '1.5rem'
    },
    componentVisibility: {},
    headerConfig: {},
    pageModules: DEFAULT_PAGE_MODULES,
    pageLayout: DEFAULT_PAGE_LAYOUTS,
    isPublished: true,
    isBuiltIn: true
  },
  {
    name: 'Minimal',
    description: 'Ultra-minimal and clean design',
    baseTemplate: 'minimal',
    basePalette: null,
    customColors: {
      primary: '#000000',
      secondary: '#6b7280',
      accent: '#000000',
      background: '#ffffff',
      text: '#000000',
      muted: '#6b7280'
    },
    customFonts: {
      heading: 'Inter',
      body: 'Inter'
    },
    customLayout: {
      maxWidth: '1200px',
      containerPadding: '1rem',
      gridGap: '1rem'
    },
    componentVisibility: {},
    headerConfig: {},
    pageModules: DEFAULT_PAGE_MODULES,
    pageLayout: DEFAULT_PAGE_LAYOUTS,
    isPublished: true,
    isBuiltIn: true
  }
];

const collection = db.getCollection('themes');
const now = new Date();

print('Seeding built-in themes (Modern, Elegant, Minimal)...');

BUILT_IN_THEMES.forEach(theme => {
  const existing = collection.findOne({ 
    baseTemplate: theme.baseTemplate, 
    isBuiltIn: true 
  });
  
  if (!existing) {
    collection.insertOne({
      ...theme,
      createdAt: now,
      updatedAt: now
    });
    print(`  ✓ Created theme: ${theme.name} (${theme.baseTemplate})`);
  } else {
    print(`  - Theme already exists: ${theme.name} (${theme.baseTemplate}) - skipping`);
  }
});

print('✅ Theme seeding completed');
