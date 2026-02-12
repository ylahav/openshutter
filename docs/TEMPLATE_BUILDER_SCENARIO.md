עןא # Template Builder — Scenario & User Flow

### OpenShutter · NestJS + SvelteKit · TypeScript · MongoDB

---

## Overview

This document describes the scenario, user flows, and technical touchpoints for the **Template Builder** feature of OpenShutter — a photo gallery web application. The app is built with **NestJS** (backend), **SvelteKit** (frontend), and **MongoDB**, all written in TypeScript.

---

## Scenario

> **"The app admin designs visual themes — colors, fonts, and spacing — that are applied globally across all page types of the gallery app. End users (photographers and consumers) simply pick a template; they never touch design settings themselves."**

The template builder is an **admin-only tool**. It outputs a structured design token set that the SvelteKit frontend consumes at runtime, driven by the NestJS API. A theme is a set of design tokens scoped to each page type, injected as CSS custom properties or merged into the active template config via the existing `TemplateOverridesService`. Themes extend the base templates (default, minimal, elegant, modern) with custom overrides stored in site configuration.

---

## What Is a Theme?

A theme is a **design token set** scoped across OpenShutter’s page types. This is the core data structure:

```ts
Theme {
  id: string
  name: string
  thumbnail: string
  baseTemplate?: string  // 'default' | 'minimal' | 'elegant' | 'modern'
  tokens: {
    global: DesignTokens         // shared across all pages
    home: DesignTokens          // overrides for Home
    gallery: DesignTokens       // overrides for Gallery (albums list)
    album: DesignTokens         // overrides for Album (single collection)
    photo: DesignTokens         // overrides for Photo lightbox
    search: DesignTokens        // overrides for Search
    pageBuilder: DesignTokens   // overrides for custom Page Builder pages
  }
}

DesignTokens {
  colors: { primary, secondary, accent, background, text, muted }
  typography: { headingFont, bodyFont, headingSize, bodySize, lineHeight }
  spacing: { sectionGap, cardGap, contentPadding }
  layout: { maxWidth, imageRadius, gridColumns }
}
```

This aligns with OpenShutter’s existing `template.customColors`, `template.customFonts`, and `template.customLayout` in site config, extended with per-page overrides.

---

## Pages a Theme Applies To

| Page | Route / Component | Description |
|------|-------------------|-------------|
| **Home** | `/` | Home page with hero, albums preview, services |
| **Gallery** | `/albums` | Overview of all photo albums (collections) |
| **Album** | `/albums/:alias` | Single album / collection display |
| **Photo** | Lightbox (in-page) | Single photo view (lightbox overlay) |
| **Search** | `/search` | Search across photos, albums, people, locations |
| **Page Builder** | `/[alias]` (e.g. `/about`, `/test`) | Custom pages built with modules (Hero, RichText, FeatureGrid, AlbumsGrid, CTA) |

---

## Admin User Flow

### 1. Enter the Template Builder
- Accessible from the admin dashboard under **"Templates"** (`/admin/templates`) or **"Site Config"** (`/admin/site-config`) → Templates tab
- Admin sees existing templates (default, minimal, elegant, modern) and any saved theme overrides
- Call to action: **"Create new theme"** or **"Customize theme"**

---

### 2. Theme Setup
- Set a theme name and optional description
- Choose a **base template** as starting point: default, minimal, elegant, or modern
- Choose a **base palette**: light, dark, high-contrast, or muted
- All design tokens are pre-populated from the chosen base — the admin never starts from blank

---

### 3. The Editor — Two-Panel Layout

**Left panel — Token controls**, organized in tabs:
- **Colors** — pickers for each semantic color role (primary, secondary, accent, background, text, muted)
- **Typography** — font selector (heading, body), size scale, line height
- **Spacing** — sliders for section gaps, card gaps, content padding, max-width
- **Per-page overrides** — diverge from global tokens for any specific page type (Home, Gallery, Album, Photo, Search, Page Builder)

**Right panel — Live preview**, with a page type switcher at the top:
- Home
- Gallery
- Album
- Photo (lightbox)
- Search
- Page Builder (sample custom page)

As tokens are adjusted in the left panel, the right panel updates in real time. The preview renders with **realistic dummy content** — placeholder photos, fake album names, sample search results — to show genuine visual impact.

---

### 4. Per-Page Fine-Tuning
Each page type tab includes an **"Override globals"** toggle. When enabled, that specific page type can diverge from the shared token values. Examples:
- The Photo lightbox uses a darker overlay than the rest of the app
- The Page Builder pages use a larger body font size for readability
- Overrides **stack on top of** global tokens — they do not replace them

---

### 5. Accessibility Check
Before saving, an automatic contrast check runs:
- Flags any color combination that fails **WCAG AA**
- Identifies which page type and which element pair is failing
- Admin must either fix the issue or explicitly acknowledge it before proceeding

---

### 6. Save & Publish
| Action | Behaviour |
|--------|-----------|
| **Save as draft** | Stored in MongoDB (e.g. `site_config` or `themes` collection), not visible to end users yet |
| **Publish** | Theme becomes the active site theme; merged into site config; applied to all users |
| **Set as default** | Stored in `siteConfig.template`; used when no user preference is set |
| **Thumbnail** | Auto-generated from the Home or Gallery preview render |

---

### 7. Theme Management
- **Duplicate** an existing theme to iterate from it
- **Archive** — soft delete; preserves historical data for accounts already using the theme
- **Version history** — each save creates a snapshot; admin can roll back to any previous version
- **Usage count** — shows how many user accounts (or sessions) are currently using this theme (if per-user theme selection is enabled)

---

## End User Flow

This is intentionally minimal — the design work is done entirely by the admin.

1. User navigates to their **Display Settings** or uses the **template selector** in the header (if enabled via `siteConfig.template.headerConfig.showTemplateSelector`)
2. A visual grid of all published themes is shown (thumbnail + name)
3. User clicks a theme → live preview renders with their own gallery content
4. User confirms → theme is saved to their account or `localStorage` (`preferredTemplate`)
5. All page types update instantly with the new theme applied

---

## NestJS + SvelteKit Technical Touchpoints

| Concern | NestJS (backend) | SvelteKit (frontend) |
|---------|------------------|----------------------|
| Store themes | MongoDB `site_config` or `themes` collection, token JSON | — |
| Base templates | `templates.controller.ts` (static config: default, minimal, elegant, modern) | — |
| Merge overrides | `TemplateOverridesService.mergeTemplateWithOverrides()` | — |
| Serve active theme | `GET /api/admin/site-config`, `GET /api/admin/templates` | Fetch on app init, store in `siteConfigData` / `currentTemplate` store |
| Apply theme | — | Inject as CSS custom properties on `<body>` or merge into template config |
| Admin builder | CRUD endpoints + publish/draft logic | Builder UI component, reactive token preview |
| Per-page overrides | Merged token resolution on API response | Page components read from scoped store |
| Template selection | Site config `template.frontendTemplate` | `BodyTemplateWrapper`, `HeaderTemplateSwitcher` load template by name |

---

## Existing OpenShutter Alignment

- **Site config** (`SiteConfig.template`): `customColors`, `customFonts`, `customLayout`, `headerConfig` — theme tokens extend these
- **Template overrides**: `TemplateOverridesService` merges site config overrides with base template config
- **Templates**: Svelte components under `frontend/src/lib/templates/<name>/` (Home, Gallery, Album, Login, Search)
- **Page Builder**: Custom pages at `/[alias]` built with modules (Hero, RichText, FeatureGrid, AlbumsGrid, CTA)
- **Admin routes**: `/admin/templates`, `/admin/site-config`, `/admin/templates/overrides`

---

## Summary

The template builder is a **theme token editor for admins** paired with a **template/theme picker for end users**, connected by a CSS variable injection system (or template config merge) in SvelteKit. NestJS serves structured token data via a clean API, and the SvelteKit frontend applies it at runtime — making theme changes instant and consistent across all page types. It builds on OpenShutter’s existing template system and site config overrides.

---

*Document aligned with OpenShutter · February 2026*  
*Stack: NestJS · SvelteKit · TypeScript · MongoDB*
