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

Full behavior and extra keys are documented in **[AlbumGallery/README.md](../AlbumGallery/README.md)**.

## Classes & tokens for template styles

Same as **Album view** (outer `section` with `@container`, surfaces, grids). No separate root class.
