# Albums grid (`albumsGrid`)

## Purpose

Lists albums (and related album UI) for non-album routes. Implementation **reuses** `AlbumGallery/Layout.svelte` with a smaller `props` contract focused on listing (title, description, `albumSource`, etc.).

## Configuration (`props`)

Typical fields mirror the album listing subset of album view:

| Parameter | Type | Description |
|-----------|------|-------------|
| `title` | MultiLang | Optional heading |
| `description` | MultiLang / HTML | Optional intro |
| `albumSource` | `'root'` \| `'featured'` \| `'selected'` \| `'current'` | Where albums resolve from |
| `selectedAlbums` | string[] | When source is `selected` |
| `showHeading` | boolean | When `false`, hides section labels such as "Sub-albums" above the grid (Noir defaults hide via pack + config). |
| `showDescription` | boolean | Card body text; Noir defaults omit descriptions unless set `true`. |
| `coverAspect` | `'video'` \| `'square'` \| `'portrait'` | Noir album grid defaults to `square` in seed themes. |
| `className` | string | Optional extra classes on the **page-builder cell** (`pbModuleCell`). The active pack applies a short prefix per token (e.g. Studio: `albums` → `s-albums`). Use for template-scoped spacing/wrappers. |

Shared album/album-view fields are documented in **[AlbumGallery/README.md](../AlbumGallery/README.md)** (see **`albumGalleryConfig`**, which includes **`className`** for both `albumsGrid` and `albumView`).

On the **Noir** visitor pack, `AlbumsGrid` passes an internal `albumsGridVariant` flag into the shared layout so cards render `div.ac-ov`, `div.ac-info`, and a square full-bleed cover without an `aspect-video` wrapper. Noir-specific grid styling lives in **`AlbumGallery/_styles.scss`** (`.pb-albumGallery--noirGrid`), not in the template tree.

## Classes & tokens for template styles

Same as **Album view** for inner markup: **`pb-albumGallery`** and children. For pack-level **section** spacing, target the **cell** class you set via `className` (e.g. Studio **`_albumsGrid.scss`** styles **`.s-albums`**, imported from **`templates/studio/styles/styles.scss`** via **`@use './albumsGrid'`**).

Default seed modules can set `className: 'albums'` so Studio’s partial applies without manual editing (see **`default-page-layouts.ts`**).
