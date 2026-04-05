# Theming and page builder

## Page builder overview

Themes can customize content per page type using the page builder. Each theme stores:

- **pageModules**: `{ home: [...], gallery: [...], album: [...], search: [...], header: [...], footer: [...] }`

### Page types

| Page Type | Description | Available Modules |
|-----------|-------------|-------------------|
| home | Home page | Hero, RichText, FeatureGrid, AlbumGallery, CTA |
| gallery | Albums list | AlbumGallery, RichText, CTA |
| album | Single album view | AlbumGallery, RichText, CTA |
| search | Search results | RichText, AlbumGallery, CTA |
| header | Site header | Logo, SiteTitle, Menu, LanguageSelector, AuthButtons |
| footer | Site footer | FooterMenu, Copyright, SocialLinks |

### Header / footer modules

- **Header:** Logo, SiteTitle, Menu, LanguageSelector, AuthButtons  
- **Footer:** FooterMenu, Copyright, SocialLinks  

### Implementation status

1. **Schema** — `pageModules` and `pageLayout` in theme and site config  
2. **Pages tab** — UI to edit per-page modules (grid, cells, assign module)  
3. **New modules** — Logo, SiteTitle, Menu wrappers + Layout; Hero, RichText, AlbumsGrid in theme overrides  
4. **Rendering** — Home uses `PageRenderer` with theme `pageModules`; Apply theme copies into site config  
5. **Header/Footer** — Future: replace toggle-based config with module-based everywhere  

### Hero module

- **Background image:** When style is "image", hero height preserves photo aspect ratio (`padding-bottom` trick).  
- **Content:** Title, subtitle, CTA, background style (light/dark/image/galleryLeading), optional background image URL — editable in theme overrides modal.

---

## Seeding built-in themes

This section explains how to seed the built-in themes (Modern, Elegant, Minimal) into a new OpenShutter installation.

### Overview

OpenShutter includes three built-in themes that are automatically seeded when the application starts via `DatabaseInitService`. You can also seed manually using the provided scripts.

### Automatic seeding

Themes are seeded when the backend starts if they don't already exist. See `backend/src/database/database-init.service.ts` — `initializeDefaultThemes()`.

### Manual seeding

**Option 1 — MongoDB Shell (mongosh)**

```bash
mongosh mongodb://localhost:27017/openshutter scripts/seed-themes.mongodb.js
```

**Option 2 — Node.js**

```bash
export MONGODB_URI="mongodb://localhost:27017/openshutter"
node scripts/seed-themes.js
```

**Option 3 — Direct MongoDB commands**

```javascript
use openshutter

db.themes.insertMany([
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
    customFonts: { heading: 'Inter', body: 'Inter' },
    customLayout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1.5rem' },
    componentVisibility: {},
    headerConfig: {},
    pageModules: {},
    pageLayout: {},
    isPublished: true,
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date()
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
    customFonts: { heading: 'Playfair Display', body: 'Inter' },
    customLayout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1.5rem' },
    componentVisibility: {},
    headerConfig: {},
    pageModules: {},
    pageLayout: {},
    isPublished: true,
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date()
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
    customFonts: { heading: 'Inter', body: 'Inter' },
    customLayout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1rem' },
    componentVisibility: {},
    headerConfig: {},
    pageModules: {},
    pageLayout: {},
    isPublished: true,
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
])
```

### Theme document shape

Each theme includes `name`, `description`, `baseTemplate`, `customColors`, `customFonts`, `customLayout`, `componentVisibility`, `headerConfig`, `pageModules`, `pageLayout`, `isPublished`, `isBuiltIn`, timestamps. Built-in themes use `isBuiltIn: true`.

### Verification

```javascript
use openshutter
db.themes.find({ isBuiltIn: true }).pretty()
```

Or `GET /api/admin/themes` (authenticated).

### Notes

- Seeding is idempotent.  
- `pageModules` / `pageLayout` start empty and are filled via Theme Builder / Admin.  
