# Hero (`hero`)

## Purpose

Large top-of-page banner: title, subtitle, optional CTA, and configurable background (light surface, dark strip, image, or dynamic “gallery leading” photo). Layout is controlled by **`heroLayout`** (module props) with fallback to **`template.hero.layout`** in site config, then pack defaults.

## Hero layout options

### 1. Full-bleed (`fullbleed`)

**Templates:** Noir (default pack layout)

**Properties:** 100vh height, centred text overlay

Image fills the entire viewport. Text is overlaid at centre with a dark filter applied to the photo. Maximum visual impact. Requires a strong hero image. Weakest for portfolios where no single image represents everything.

---

### 2. Split (`split`)

**Templates:** Studio (default pack layout)

**Properties:** 50/50 columns, CTA button, stats row

Image on the left half, content on the right half at equal weight. Includes a CTA button and optional **stats row** below the text (`heroStats` array in module props). Best when the photographer needs to communicate beyond the image — a bio, numbers, or a call to action.

---

### 3. Editorial (`editorial`)

**Templates:** Atelier (default pack layout)

**Properties:** ~68vh image, serif-friendly typography below, gold rule accent

Tall image occupies the upper portion of the viewport; title and subtitle sit below on the page background. Fine-art catalogue feel. The image is treated as a photograph, not wallpaper. Works well with portrait or square crops. Pack SCSS can drive serif display fonts via `--tp-font-display` and related tokens.

---

### 4. Stacked (`stacked`)

**Properties:** ~50vh image on top, text below, mobile-friendly

Image on top, title and description below on the page background. Natural scroll flow. The safest and most universally legible option. Best default when image quality is unpredictable (user-uploaded content). **Default** for packs other than Noir, Studio, and Atelier when no layout is set.

---

### 5. Mosaic (`mosaic`)

**Properties:** 2–4 images in a grid, shows portfolio breadth

Two to four images arranged in a grid with a tight gap. Either:

- Set **`heroImages`** (URL list) on the module (with **`backgroundStyle: 'image'`** and a primary URL, or mix URLs as implemented), or  
- Leave **`heroImages`** empty, set **`backgroundStyle: 'galleryLeading'`**, and the hero loads **multiple** published gallery-leading / cover photos (default **4**, configurable via **`heroGalleryLeadingLimit`**, max **12**).

Optional title/subtitle/CTA render **below** the grid (no text overlay). Better suited to gallery or albums pages than the home page when you need breadth.

---

### 6. Filmstrip (`filmstrip`)

**Properties:** 30–40vh height, wide panoramic crop, cinematic

A wide, short image strip — cinematic proportions. Title sits left and **`filmstripMeta`** (or subtitle) on the right below a thin rule. Gives the image presence without the full viewport commitment of full-bleed. Best for landscape photographers.

---

### 7. Minimal / typographic (`minimal`)

**Properties:** text-first, small framed image on the side

Large headline dominates the layout. A small framed image sits to the side as a supporting element. The text IS the hero. Common in fine-art contexts where the photographer's name or series title is the brand. Works well with serif type from the pack.

---

### 8. Portrait (`portrait`)

**Properties:** 3:4 ratio image, vertical orientation

A tall portrait-oriented image beside the text content. Natural for photographers who shoot people, weddings, or single subjects — the image shape mirrors the subject matter.

---

### 9. Slideshow (`slideshow`)

**Properties:** auto-cycling images, dot navigation, multiple images

Full-bleed images cycle automatically with dot navigation below. Either:

- Use explicit **`heroImages`** plus a primary **`backgroundImage`** when **`backgroundStyle`** is **`image`**, or  
- Leave **`heroImages`** empty and use **`backgroundStyle: 'galleryLeading'`** so the hero loads **several** leading photos (default **5**, overridable with **`heroGalleryLeadingLimit`**).

**`slideshowIntervalMs`** controls timing (default 5000 ms, minimum 3000 ms). Good for diverse portfolios; adds motion, which can conflict with a still aesthetic. Highest maintenance — keep multiple strong images updated.

---

## Configuration

### Site config (theme)

Each layout can be selected as the **default** for all hero modules that don’t set `heroLayout`:

```ts
template: {
  hero: {
    layout: 'fullbleed' | 'split' | 'editorial' | 'stacked' |
            'mosaic' | 'filmstrip' | 'minimal' | 'portrait' | 'slideshow'
  }
}
```

Layout-specific fields (e.g. `heroImages`, `heroStats`, `filmstripMeta`, `slideshowIntervalMs`) live on the **hero module** `props` in the page builder (or JSON), alongside `heroLayout` when overriding the default.

**Resolution order:** module `heroLayout` → `template.hero.layout` → pack default (`fullbleed` / `split` / `editorial` / `stacked`).

### Module props (summary)

| Parameter | Type | Description |
|-----------|------|-------------|
| `heroLayout` | string | Optional. One of the slugs above. Legacy: `layoutVariant`. |
| `heroImages` | string[] or newline/comma-separated string | Extra URLs for `mosaic` / `slideshow`. If empty and `backgroundStyle` is `galleryLeading`, those layouts load multiple API photos instead. |
| `heroGalleryLeadingLimit` | number or string | When `galleryLeading` + `mosaic` or `slideshow` + no `heroImages`: API `limit` (2–12; defaults 4 / 5). |
| `slideshowIntervalMs` | number or string | Slideshow delay in ms. |
| `filmstripMeta` | string | Right-hand line under filmstrip; falls back to subtitle. |
| `heroStats` | `{ label?, value? }[]` | Optional stats under split layout copy. |

See `config.ts` for form metadata and `hero-layout.ts` for normalization and pack defaults.

### Gallery leading background

Uses `GET /api/photos/gallery-leading?limit=1`. The backend returns **published** photos, newest first:

1. Prefer **`isGalleryLeading: true`** (“Gallery Leading (homepage hero)” on the photo in admin/owner).
2. If none, fall back to **`isLeading: true`** (“Album Cover Photo”) so the hero still works when only the cover checkbox is set.

If a photo is unpublished, it will not appear until **Published** is checked.

Image URLs are resolved with **`getPhotoFullUrl`** so storage paths become browser-loadable **`/api/storage/serve/...`** URLs (same as the rest of the app). Fetch runs when `backgroundStyle` is `galleryLeading` after the client is active (not only on first mount), so props that hydrate late still load the photo.

## Classes & tokens for template styles

- **Root:** `.pb-hero` with `data-hero-layout="{slug}"` and modifier `pb-hero--layout-{slug}`
- **Tone:** `.pb-hero--light` | `.pb-hero--dark` | `.pb-hero--image` | `.pb-hero--fullViewport` (full-bleed viewport)
- **Key regions:** `.pb-hero__imageFull`, `.pb-hero__stacked*`, `.pb-hero__split*`, `.pb-hero__mosaic*`, `.pb-hero__slideshow*`, `.pb-hero__filmstrip*`, `.pb-hero__minimal*`, `.pb-hero__portrait*`, `.pb-hero__contentWrap`, `.pb-hero__title`, `.pb-hero__subtitle`, `.pb-hero__cta`
- **Tokens:** `--tp-hero-strip-bg`, `--tp-surface-2`, `--tp-overlay-scrim`, `--os-primary`, `--tp-on-brand`, `--tp-font-display` (editorial / minimal)

### Stylesheet resolution

- Default Hero styles live in `./_styles.scss`.
- `Layout.svelte` loads `/src/templates/<template>/styles/_hero.scss` when the active template provides one (same pattern as `Logo`).
