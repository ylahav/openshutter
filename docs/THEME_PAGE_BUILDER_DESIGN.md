# Theme Page Builder Design

## Overview

Themes can now customize content per page type using the page builder. Each theme stores:
- **pageModules**: `{ home: [...], gallery: [...], album: [...], search: [...], header: [...], footer: [...] }`

## Page Types

| Page Type | Description | Available Modules |
|-----------|-------------|-------------------|
| home | Home page | Hero, RichText, FeatureGrid, AlbumGallery, CTA |
| gallery | Albums list | AlbumGallery, RichText, CTA |
| album | Single album view | AlbumGallery, RichText, CTA |
| search | Search results | RichText, AlbumGallery, CTA |
| header | Site header | Logo, SiteTitle, Menu, LanguageSelector, AuthButtons |
| footer | Site footer | FooterMenu, Copyright, SocialLinks |

## New Modules

### Header Modules
- **Logo** – Site logo image (from site config)
- **SiteTitle** – Site name/title
- **Menu** – Navigation menu
- **LanguageSelector** – Language switcher
- **AuthButtons** – Login/Logout

### Footer Modules
- **FooterMenu** – Footer navigation links
- **Copyright** – Copyright text
- **SocialLinks** – Social media links

## Implementation Phases

1. **Schema** ✅ – `pageModules` and `pageLayout` in theme and site config
2. **Pages tab** ✅ – UI to edit per-page modules (grid, multi-select cells, assign module, edit modal for Hero/RichText/AlbumsGrid)
3. **New modules** ✅ – Logo, SiteTitle, Menu (wrappers + Layout); Hero, RichText, AlbumsGrid configurable in theme overrides
4. **Rendering** ✅ – Home page uses `PageRenderer` with theme `pageModules` when configured; apply theme copies `pageModules`/`pageLayout` to site config
5. **Header/Footer** – Replace toggle-based config with module-based (future)

## Hero Module

- **Background image**: When background style is "image", the hero height preserves the photo aspect ratio (width/height). The image loads, aspect ratio is computed, and the section uses `padding-bottom` so the hero height matches the image proportions.
- **Content**: Title, subtitle, CTA label/URL, background style (light/dark/image/galleryLeading), and optional background image URL are editable in the theme overrides "Edit" modal.
