# Module URL Parameters

## Overview

Modules can access URL parameters (route params) through the page context. This is particularly useful for dynamic pages like album pages that take an `album-alias` parameter from the URL.

## How It Works

1. **PageRenderer** extracts URL parameters from `$pageStore.params` and passes them to modules via the `data` prop
2. Modules receive `data` containing:
   - `alias`: The album alias from URL (if present)
   - `params`: All route parameters

## Album Page Example

For the album page route `/albums/[alias]`, the URL parameter `alias` is automatically available to modules.

### Configuring AlbumGallery Module for Current Album

In the Theme Builder, when editing the "album" page type:

1. Add an `albumsGrid` or `albumGallery` module
2. In the module's "Albums source" dropdown, select **"Current album (from URL)"**
3. This sets `albumSource: 'current'` in the module config

### Module Configuration

```json
{
  "_id": "mod_album_subalbums",
  "type": "albumsGrid",
  "props": {
    "albumSource": "current"
  },
  "rowOrder": 0,
  "columnIndex": 0
}
```

### How Modules Access URL Parameters

Modules receive the page context via the `data` prop:

```typescript
export let data: any = null; // Page context from PageRenderer

// Access album alias
$: currentAlbumAlias = data?.alias || null;
```

### AlbumGallery Module - 'current' Source

When `albumSource: 'current'` is set:

- The module reads `data.alias` (from URL parameter)
- Fetches album data from `/api/albums/{alias}/data`
- Displays sub-albums of the current album
- Automatically updates when navigating to different albums

### Supported Album Sources

- **`root`**: All root albums (default)
- **`featured`**: Only featured albums
- **`selected`**: Specific albums by ID
- **`current`**: Sub-albums of the album from URL (uses `data.alias`)

## Default Configuration

The default album page layout includes:

```typescript
{
  _id: 'mod_default_album_gallery',
  type: 'albumsGrid',
  props: {
    albumSource: 'current'  // Uses URL parameter
  },
  rowOrder: 0,
  columnIndex: 0
}
```

## Notes

- The `current` option only works on pages that have an `alias` parameter in the URL
- For album pages (`/albums/[alias]`), the alias is automatically extracted and passed to modules
- Modules can access any route parameter via `data.params.{paramName}`
- The page context is reactive - modules will update when navigating to different albums
