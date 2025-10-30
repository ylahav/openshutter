# Creating a New Template

This guide explains how to create and register a new gallery template in OpenShutter.

## Overview

Templates live under `src/templates/<templateName>/` and provide:
- Visual components (hero, cards, list, navigation, footer)
- Pages for `Home`, `Gallery`, and `Album`
- A `template.config.json` describing metadata, paths, and defaults

OpenShutter auto-discovers templates by scanning `src/templates/*/template.config.json`. If no config is found, the built-in templates (`default`, `modern`, `minimal`, `dark`) remain available as a fallback.

## Folder Structure

```
src/templates/my-template/
├── components/
│   ├── Hero.tsx
│   ├── AlbumCard.tsx
│   ├── PhotoCard.tsx
│   ├── AlbumList.tsx
│   ├── Navigation.tsx
│   └── Footer.tsx
├── pages/
│   ├── Home.tsx
│   ├── Gallery.tsx
│   └── Album.tsx
├── styles/
│   └── animations.css (optional)
├── thumbnail.jpg (recommended)
└── template.config.json
```

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

Notes:
- `templateName` is inferred from the folder name if omitted, but include it for clarity.
- `thumbnail` should use the public path: `/templates/<name>/thumbnail.jpg`. Place the file in `public/templates/<name>/thumbnail.jpg` or reference your own asset handling.

## Coding Guidelines

- Export each component/page as default or named export compatible with dynamic import.
- Use Tailwind classes and existing UI components where convenient.
- Keep props simple; pull data via existing hooks/services as needed.

### Simplifying Album Pages with Shared Hooks

OpenShutter provides a shared `useAlbumData` hook to reduce boilerplate when creating album pages:

```tsx
import { useAlbumData } from '@/hooks/useAlbumData'
import PhotoLightbox from '@/components/PhotoLightbox'

export default function AlbumPage() {
  const params = useParams()
  const alias = params?.alias as string
  const { currentLanguage } = useLanguage()
  const { album, photos, subAlbums, loading, error, subAlbumCoverPhotos } = useAlbumData(alias)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Use the data returned by the hook...
  // The hook automatically:
  // - Fetches album by alias
  // - Fetches photos for the album
  // - Fetches sub-albums
  // - Fetches cover photos for sub-albums
  // - Handles loading and error states
  // - Uses no-cache fetches to prevent stale data
}
```

### PhotoLightbox Integration

All templates should integrate the `PhotoLightbox` component for consistent photo viewing experience across templates:

```tsx
<PhotoLightbox
  photos={photos.map(p => ({
    _id: p._id,
    url: p.storage?.url || p.url || '/placeholder.jpg',
    thumbnailUrl: p.storage?.thumbnailPath,
    title: typeof p.title === 'string' ? p.title : (p.title as any)?.[currentLanguage] || (p.title as any)?.en,
    takenAt: (p as any).exif?.dateTimeOriginal,
    exif: (p as any).exif ? { /* EXIF data */ } : undefined,
    metadata: (p as any).metadata ? { /* metadata */ } : undefined,
  }))}
  startIndex={lightboxIndex}
  isOpen={lightboxOpen}
  onClose={() => setLightboxOpen(false)}
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

## Auto-Discovery

At runtime, the system scans `src/templates` for folders containing `template.config.json`. Discovered templates are returned by the `GET /api/admin/templates` endpoint and shown in the admin UI.

If no config files are found, the built-in templates are used as a fallback to ensure the app continues to work.

## Switching Templates

- From the Admin UI: choose a template and save.
- Programmatically: call `PUT /api/admin/templates` with `{ "templateName": "my-template" }`.

## Troubleshooting

- Template not appearing: verify `template.config.json` exists and is valid JSON.
- Import errors: ensure component/page paths match files and export defaults.
- Thumbnail not shown: check the `thumbnail` path and that the file exists.

---

## Template Updates

### Minimal Template (October 2025)
- Header: horizontal layout with desktop nav and mobile toggle; sticky, glass background.
- Hero: improved text readability with dark gradient overlay and text-shadow.
- Home Albums: responsive grid using `minimal-gallery-grid` (1/2/3 columns).
- Albums Page (`/albums`): implemented. Displays root albums grid with cover images, title, and photo count; loading and empty states included.

Key classes available globally (via `globals.css`):
- `minimal-header`, `minimal-nav`, `minimal-nav-menu`, `minimal-actions`
- `minimal-hero`, `minimal-hero-bg`, `minimal-hero-title`, `minimal-hero-description`
- `minimal-gallery`, `minimal-container`, `minimal-gallery-grid`, `minimal-gallery-item`, `minimal-gallery-image`

Last updated: October 2025
