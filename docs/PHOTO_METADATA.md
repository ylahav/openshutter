# Advanced Photo Metadata Management

OpenShutter supports configurable EXIF display, per-photo and bulk re-extraction, and manual overrides for date/camera.

## Configurable EXIF display

- **Site config**: Admin → Site config → EXIF metadata tab. Choose which EXIF fields to show site-wide (or leave empty to show all).
- **Display**: Photo lightbox and any EXIF display use this list via `filterExifByDisplayFields()`.

## Re-extract EXIF

- **Per photo**: Photo edit page → EXIF section → "Re-extract from file". Re-reads EXIF from the stored image and updates the photo record.
- **Bulk**: Album page → select photos (checkboxes on each photo, or "Select All") → "Re-extract EXIF". Re-extracts EXIF for all selected photos. API: `POST /api/admin/photos/bulk/re-extract-exif` with body `{ photoIds: string[] }`.

## Photo editing (rotate)

- **Rotate**: Photo edit page (admin or owner) → Rotate section → "90° CCW", "90° CW", or "180°". Replaces the original file with the rotated image and regenerates thumbnails. API: `POST /api/admin/photos/:id/rotate` with body `{ angle: 90 | -90 | 180 }`.

## Regenerate thumbnails

- **Per photo**: Photo edit page → "Regenerate thumbnails". Regenerates small/medium/large (and other) thumbnails with correct EXIF orientation.
- **Bulk**: Album page → select photos → "Regenerate thumbnails". Same for all selected photos; the UI shows a **streaming progress bar** (e.g. "Regenerating thumbnails… 5/12") because the operation can take a long time. API: `POST /api/admin/photos/bulk/regenerate-thumbnails` (single JSON response) or `POST /api/admin/photos/bulk/regenerate-thumbnails-stream` (NDJSON stream: `progress` events per photo, then `done`).

## Manual EXIF overrides (merged on save)

Overrides are merged with existing EXIF; other fields are not wiped.

- **Photo edit**: Section "Override EXIF (date/camera)" — Date taken, Make, Model. Save with "Save photo".
- **Bulk**: Album page → select photos (one-by-one or "Select All") → "Set Metadata". In the dialog you can set rating, category, and EXIF overrides (date taken, make, model) for all selected photos.

## API

- `POST /api/admin/photos/:id/re-extract-exif` — Re-extract EXIF for one photo.
- `POST /api/admin/photos/bulk/re-extract-exif` — Re-extract EXIF for multiple photos; body: `{ photoIds: string[] }`.
- `POST /api/admin/photos/:id/rotate` — Rotate photo; body: `{ angle: 90 | -90 | 180 }`; replaces file and regenerates thumbnails.
- `POST /api/admin/photos/bulk/regenerate-thumbnails` — Regenerate thumbnails (correct orientation) for multiple photos; body: `{ photoIds: string[] }`; returns final JSON.
- `POST /api/admin/photos/bulk/regenerate-thumbnails-stream` — Same input; response is NDJSON stream (`progress` per photo, then `done`) for progress UIs.
- `PUT /api/admin/photos/:id` — Update photo; send `exif: { dateTime?, make?, model?, ... }` to merge overrides; send `iptcXmp: { ... }` to replace IPTC/XMP.
- `POST /api/admin/photos/bulk-update` — Bulk update; send `updates.exif: { ... }` to merge EXIF; send `updates.iptcXmp: { ... }` to set IPTC/XMP for selected photos.

## IPTC/XMP import

- **On upload**: IPTC and XMP metadata are extracted from the image file (using exifr) and stored in the photo’s `iptcXmp` field. Common fields include: keywords, caption/description, copyright, creator, credit, city, country, and other IPTC/XMP namespaces.
- **Re-extract**: “Re-extract from file” (per photo) and bulk “Re-extract EXIF” also re-read IPTC/XMP and update `iptcXmp` in the database.
- **Storage**: `iptcXmp` is a flexible object; keys and structure follow what exifr returns (translated keys, dates as ISO strings). The API returns `iptcXmp` on photo objects for display or further use (e.g. pre-filling title/description from caption, or syncing keywords to tags).

## IPTC/XMP display (site config)

- **Site config**: Admin → Site config → **IPTC/XMP Metadata** tab. Choose which IPTC/XMP fields to show site-wide when displaying photo metadata (e.g. in the photo lightbox). Leave all unchecked to show all available fields.
- **Display**: Photo lightbox (info panel) shows IPTC/XMP when present, filtered by `filterIptcXmpByDisplayFields(photo.iptcXmp, siteConfig.iptcXmpMetadata?.displayFields)`.

Date fields (`dateTime`, `dateTimeOriginal`, `dateTimeDigitized`) are stored as Date; send ISO strings.
