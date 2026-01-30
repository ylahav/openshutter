# Advanced Photo Metadata Management

OpenShutter supports configurable EXIF display, per-photo and bulk re-extraction, and manual overrides for date/camera.

## Configurable EXIF display

- **Site config**: Admin → Site config → EXIF metadata tab. Choose which EXIF fields to show site-wide (or leave empty to show all).
- **Display**: Photo lightbox and any EXIF display use this list via `filterExifByDisplayFields()`.

## Re-extract EXIF

- **Per photo**: Photo edit page → EXIF section → "Re-extract from file". Re-reads EXIF from the stored image and updates the photo record.
- **Bulk**: Album page → select photos → "Re-extract EXIF". Re-extracts EXIF for all selected photos. API: `POST /api/admin/photos/bulk/re-extract-exif` with body `{ photoIds: string[] }`.

## Manual EXIF overrides (merged on save)

Overrides are merged with existing EXIF; other fields are not wiped.

- **Photo edit**: Section "Override EXIF (date/camera)" — Date taken, Make, Model. Save with "Save photo".
- **Bulk**: Album page → select photos → "Set Metadata". In the dialog you can set rating, category, and EXIF overrides (date taken, make, model) for all selected photos.

## API

- `POST /api/admin/photos/:id/re-extract-exif` — Re-extract EXIF for one photo.
- `POST /api/admin/photos/bulk/re-extract-exif` — Re-extract EXIF for multiple photos; body: `{ photoIds: string[] }`.
- `PUT /api/admin/photos/:id` — Update photo; send `exif: { dateTime?, make?, model?, ... }` to merge overrides.
- `POST /api/admin/photos/bulk-update` — Bulk update; send `updates.exif: { dateTime?, make?, model?, ... }` to merge EXIF for selected photos.

Date fields (`dateTime`, `dateTimeOriginal`, `dateTimeDigitized`) are stored as Date; send ISO strings.
