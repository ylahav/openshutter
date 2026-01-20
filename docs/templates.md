# Creating a New Template

This guide explains how to create and register a new gallery template in OpenShutter.

## Overview

Templates live under `frontend/src/lib/templates/<templateName>/` and provide:
- Visual components (hero, cards, list, navigation, footer)
- Pages for `Home`, `Gallery`, `Album`, `Login`, and `Search`
- Template configuration defined in the backend (see `backend/src/templates/templates.controller.ts`)

OpenShutter uses static template configurations defined in the backend. Templates are Svelte components (`.svelte` files), not React/TSX. The system currently includes three demo templates: `minimal`, `modern`, and `elegant`.

## Folder Structure

```
frontend/src/lib/templates/my-template/
├── components/          # Optional shared components
│   ├── Hero.svelte
│   ├── AlbumCard.svelte
│   ├── AlbumList.svelte
│   ├── Header.svelte    # Template-specific header (optional, falls back to default)
│   └── Footer.svelte    # Template-specific footer (optional, falls back to default)
├── Home.svelte         # Home page template
├── Gallery.svelte       # Gallery page template
├── Album.svelte         # Album detail page template
├── Login.svelte         # Login page template
└── Search.svelte        # Search page template
```

**Important**: Templates can provide their own `Header.svelte` and `Footer.svelte` components in the `components/` folder. These will be automatically used when the template is active. If not provided, the system falls back to the default template's header/footer.

**Note**: Templates are Svelte components, not React/TSX. The page builder system (`lib/page-builder/`) is separate and used for custom pages created through the admin interface.

## template.config.json Schema

The config file must match the `TemplateConfig` structure. Paths are relative to the template folder root.

```json
{
  "templateName": "my-template",
  "displayName": "My Template",
  "description": "A custom theme",
  "version": "1.0.0",
  "author": "Your Name",
  "thumbnail": "/templates/my-template/thumbnail.jpg",
  "category": "custom",
  "features": {
    "responsive": true,
    "darkMode": false,
    "animations": true,
    "seoOptimized": true
  },
  "colors": {
    "primary": "#3B82F6",
    "secondary": "#1F2937",
    "accent": "#F59E0B",
    "background": "#FFFFFF",
    "text": "#111827",
    "muted": "#6B7280"
  },
  "fonts": {
    "heading": "Inter",
    "body": "Inter"
  },
  "layout": {
    "maxWidth": "1200px",
    "containerPadding": "1rem",
    "gridGap": "1.5rem"
  },
  "components": {
    "hero": "components/Hero.tsx",
    "albumCard": "components/AlbumCard.tsx",
    "photoCard": "components/PhotoCard.tsx",
    "albumList": "components/AlbumList.tsx",
    "gallery": "components/Gallery.tsx",
    "navigation": "components/Navigation.tsx",
    "footer": "components/Footer.tsx"
  },
  "visibility": {
    "hero": true,
    "languageSelector": true,
    "authButtons": true,
    "footerMenu": true,
    "statistics": true,
    "promotion": true
  },
  "pages": {
    "home": "pages/Home.tsx",
    "gallery": "pages/Gallery.tsx",
    "album": "pages/Album.tsx"
  }
}
```

**Important Notes**:
- Template files are Svelte components (`.svelte`), not TSX files
- The `components` and `pages` paths in the config are legacy and not actively used
- Templates are loaded dynamically using webpack's `require.context` based on folder structure
- `thumbnail` should use the public path: `/templates/<name>/thumbnail.jpg`. Place the file in `public/templates/<name>/thumbnail.jpg`

## Coding Guidelines

### Svelte Component Structure

Templates are Svelte components. Each page component should:
- Use Svelte's reactive statements (`$:`) for computed values
- Import from `$stores/language` for language support
- Use `$utils/multiLang` for multi-language text/HTML handling
- Export props using `export let` syntax

Example structure:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { currentLanguage } from '$stores/language';
  import { MultiLangUtils } from '$utils/multiLang';
  import type { PageData } from '../../../routes/$types';

  export let data: PageData;

  let albums: any[] = [];
  let loading = true;

  onMount(async () => {
    await fetchAlbums();
  });

  async function fetchAlbums() {
    // Fetch logic here
  }
</script>

<div class="min-h-screen">
  <!-- Template content -->
</div>
```

### Simplifying Album Pages

For album pages, fetch data using the API:

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';

  let albumData: any = null;
  let lightboxOpen = false;
  let lightboxIndex = 0;

  $: alias = $page.params.alias || $page.params.id;

  onMount(async () => {
    if (alias) {
      const res = await fetch(`/api/albums/by-alias/${alias}/data`);
      if (res.ok) {
        albumData = await res.json();
      }
    }
  });
</script>
```

### PhotoLightbox Integration

All templates should integrate the `PhotoLightbox` component for consistent photo viewing experience:

```svelte
<script lang="ts">
  import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';
  import { currentLanguage } from '$stores/language';

  let lightboxOpen = false;
  let lightboxIndex = 0;

  function openLightbox(index: number) {
    lightboxIndex = index;
    lightboxOpen = true;
  }
</script>

<PhotoLightbox
  photos={photos.map(p => ({
    _id: p._id,
    url: p.storage?.url || p.url || '/placeholder.jpg',
    thumbnailUrl: p.storage?.thumbnailPath,
    title: typeof p.title === 'string' ? p.title : (p.title as any)?.[$currentLanguage] || (p.title as any)?.en,
    takenAt: (p as any).exif?.dateTimeOriginal,
    exif: (p as any).exif ? { /* EXIF data */ } : undefined,
    metadata: (p as any).metadata ? { /* metadata */ } : undefined,
  }))}
  startIndex={lightboxIndex}
  isOpen={lightboxOpen}
  onClose={() => lightboxOpen = false}
  autoPlay={false}
  intervalMs={4000}
/>
```

Features provided by PhotoLightbox:
- Previous/Next navigation (buttons, arrow keys, swipe)
- EXIF data display (toggle with button or "I" key)
- Autoplay slideshow (toggle with button or spacebar)
- Fullscreen support (F key)
- Keyboard shortcuts (Arrow keys, Space, Escape, F, I)

## Template Discovery

Templates are discovered at build time using webpack's `require.context`:
- The system scans `frontend/src/lib/templates/*/` for Svelte page files
- Page files must be named: `Home.svelte`, `Gallery.svelte`, `Album.svelte`, `Login.svelte`, `Search.svelte`
- Templates are registered in `backend/src/templates/templates.controller.ts`
- The `GET /api/admin/templates` endpoint returns all registered templates

## Switching Templates

Templates can be switched in two ways:

1. **Admin Users**: Via the Admin UI (`/admin/templates`) or API (`PUT /api/admin/site-config`)
   - Changes apply globally to all users
   - Stored in site configuration

2. **Regular Users**: Via the template selector in the header (if enabled)
   - Changes apply only to the current user's view
   - Stored in `localStorage` as `preferredTemplate`

The active template controls:
- **Header**: Template-specific header component with styling
- **Body**: Background colors, gradients, and overall page styling
- **Footer**: Template-specific footer component with styling
- **Pages**: All page components (Home, Gallery, Album, etc.)

Template switcher components (`HeaderTemplateSwitcher`, `FooterTemplateSwitcher`, `BodyTemplateWrapper`) automatically load the correct template-specific components based on the active template.

## Page Builder Integration

OpenShutter includes a page builder system (`lib/page-builder/`) for creating custom pages through the admin interface. The page builder is separate from templates:
- **Templates**: Control the visual design of core pages (Home, Gallery, Album, etc.)
- **Page Builder**: Allows admins to create custom content pages with modules (Hero, RichText, FeatureGrid, AlbumsGrid, CTA)

Templates can optionally integrate with the page builder by using the `PageRenderer` component.

## Troubleshooting

- Template not appearing: verify the template is registered in `backend/src/templates/templates.controller.ts`
- Import errors: ensure Svelte component files exist in `frontend/src/lib/templates/<templateName>/`
- Component not loading: check that page files are named correctly (`Home.svelte`, `Gallery.svelte`, etc.)
- Thumbnail not shown: check the `thumbnail` path and that the file exists in `public/templates/<name>/`

---

## Available Templates

OpenShutter includes three demo templates:

### Minimal Template
- Ultra-minimal and clean design
- Black and white color scheme
- No animations for maximum performance
- Category: `minimal`

### Modern Template
- Contemporary and sleek design
- Dark gradient backgrounds (slate-900 via purple-900)
- Bold white text with purple accents
- Dynamic hover effects and smooth transitions
- Rounded cards with scale animations
- Category: `modern`

### Elegant Template
- Sophisticated and refined design
- Black background with animated purple/pink gradients
- Elegant typography (Playfair Display for headings)
- Rich animations and decorative elements
- Luxury aesthetic with backdrop blur effects
- Category: `elegant`

---

## Template Updates

### January 2025
- Updated documentation to reflect Svelte-based template system
- Clarified template structure and file locations
- Added page builder integration notes
- Documented three demo templates: minimal, modern, elegant
- **Template-specific Header and Footer**: Templates can now provide their own header and footer components
- **Body styling**: Templates control the entire page appearance including header, body background, and footer
- **Template switcher components**: Added `HeaderTemplateSwitcher`, `FooterTemplateSwitcher`, and `BodyTemplateWrapper` for dynamic template loading
- **Enhanced visual differences**: Each template now has distinct styling across all page elements
- **Fixed dropdown z-index issues**: Language and template selector dropdowns now properly display above content in all templates

Last updated: January 2025
