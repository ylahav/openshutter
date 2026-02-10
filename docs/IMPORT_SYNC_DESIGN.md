# Import/Sync & Storage Migration Design

**Phase 3 Stage 1.** This document defines the external package format, API contract, and path/security rules for migration (export, import, storage migration).

---

## 1. Overview

- **Export:** Produce a portable package (database reflection + photo tree) to a directory or archive.
- **Import:** (1) From package — restore repository from a previously exported package; (2) From raw path — scan folder tree, map to albums/photos, import with optional EXIF metadata.
- **Storage migration:** Copy all photo assets from current storage provider to another; update DB references only.

---

## 2. External Package Format

The package is a directory (or ZIP of that directory) with this layout:

```
<package-root>/
  manifest.json          # Version, createdAt, albumCount, photoCount, checksums
  albums.json            # Array of album records (tree order; IDs as strings)
  photos.json            # Array of photo records (with storage.path = relative path in package)
  tags.json              # Array of tag records
  people.json            # Array of person records
  locations.json         # Array of location records
  photos/                # File tree mirroring repository album hierarchy
    <album-alias>/       # Root album
      <filename>         # e.g. abc123.jpg
    <album-alias>/       # Child album
      <child-alias>/
        <filename>
  ...
```

### 2.1 manifest.json

```json
{
  "version": "1.0",
  "createdAt": "2025-02-03T12:00:00.000Z",
  "albumCount": 10,
  "photoCount": 150,
  "photoTreePath": "photos"
}
```

### 2.2 albums.json

Array of album objects. Each album has the same fields as the repository (name, alias, description, isPublic, storagePath, parentAlbumId as string or null, level, order, etc.). `_id`, `createdBy`, `coverPhotoId`, `tags`, `allowedUsers` are stored as string IDs for re-mapping on import.

### 2.3 photos.json

Array of photo objects. `storage.path` in the package is the **relative path inside the package** (e.g. `photos/album-alias/photo.jpg`), not the live storage path. Other fields (title, description, albumId, tags, people, location, exif, iptcXmp, etc.) are serialized; ObjectIds as strings.

### 2.4 tags.json, people.json, locations.json

Full records with string `_id` and other fields. Import can merge by name or create new and map IDs.

### 2.5 photos/ tree

Directory structure mirrors album hierarchy: each album is a folder (by alias); photos sit in the folder of their album. Same structure as repository so that paths in `photos.json` match physical layout.

---

## 3. Path Allowlist (Export / Import)

- **Export destination** and **import source** (filesystem) must be under an allowed base path.
- Configuration: `MIGRATION_BASE_PATH` (env). If set, only paths under this directory are accepted. If unset, backend may use a default (e.g. `./migration-data`) or reject filesystem export/import.
- Path validation: resolve candidate path to absolute; ensure it is under `MIGRATION_BASE_PATH`; prevent `..` escape.
- Admin-only: all migration endpoints require admin role.

---

## 4. API Endpoints

Base path: `/api/admin/` (all require admin).

### 4.1 Export

| Method | Path | Body | Description |
|--------|------|------|--------------|
| POST   | export/preview | `{ "destinationPath": "/allowed/path/export-1" }` | Returns album tree, photo count, estimated size. Validates path. |
| POST   | export/start   | `{ "destinationPath": "/allowed/path/export-1" }` | Starts export job; returns `{ jobId }`. |
| GET    | export/status/:jobId | — | Returns `{ status, progress, total, current, error }`. |
| POST   | export/cancel/:jobId | — | Cancels running export. |

### 4.2 Import

| Method | Path | Body | Description |
|--------|------|------|--------------|
| POST   | import/scan    | `{ "sourcePath": "/allowed/path/folder" }` | Raw folder scan; returns folder/photo tree (for preview). |
| POST   | import/preview | `{ "sourcePath": "/allowed/path/package-or-folder", "mode": "package" \| "raw" }` | Preview: album structure + photo counts. |
| POST   | import/start   | `{ "sourcePath", "mode": "package" \| "raw", "options?: { mergeTags?: boolean } }` | Starts import job; returns `{ jobId }`. |
| GET    | import/status/:jobId | — | Job status. |
| POST   | import/cancel/:jobId | — | Cancel import. |

### 4.3 Storage migration

| Method | Path | Body | Description |
|--------|------|------|--------------|
| GET    | storage-migration/providers | — | List enabled storage providers (for source/target). |
| POST   | storage-migration/preview   | `{ "targetProviderId": "aws-s3" }` | Returns photo count, estimated size. |
| POST   | storage-migration/start     | `{ "targetProviderId": "aws-s3" }` | Starts migration job; returns `{ jobId }`. |
| GET    | storage-migration/status/:jobId | — | Job status. |
| POST   | storage-migration/cancel/:jobId | — | Cancel. |

---

## 5. Job State

Jobs (export, import, storage-migration) are tracked in memory by default:

- `jobId`: UUID.
- `status`: `pending` | `running` | `completed` | `failed` | `cancelled`.
- `progress`: number (e.g. items processed).
- `total`: number (e.g. total photos).
- `current`: optional string (e.g. current file/album).
- `error`: optional string (if failed).
- `result`: optional (e.g. `{ destinationPath }` on export completion).

Cancellation: set a `cancelled` flag that the running job checks between items so it can stop gracefully.

---

## 6. Storage Migration Details

- **Source:** For each photo, use `photo.storage.provider` and `photo.storage.path` (and `photo.storage.thumbnailPath`) to read from the current storage.
- **Target:** Admin selects one enabled provider; all photos are copied to that provider (album path structure preserved, including **auto-generated thumbnail sub-folders** such as `hero/`, `medium/`, `small/`, `micro/`).
- **Update (DB):**
  - After each successful copy, update the photo document:
    - `storage.provider` → new provider ID (e.g. `'google-drive'`, `'local'`, `'aws-s3'`).
    - `storage.path` → new path on target provider.
    - `storage.url` → **always** the internal serve URL pattern  
      `/api/storage/serve/<provider>/<encodeURIComponent(storage.path)>` (never a raw Google Drive/S3 URL).  
      This keeps the frontend and lightbox logic provider-agnostic.
    - `storage.thumbnailPath` → migrated thumbnail path (preserving original thumbnail folder structure where possible).
    - `storage.thumbnails` (if present) → updated to target provider paths/URLs.
    - `storage.bucket` / `storage.folderId` → may hold provider-specific identifiers (e.g. public URL, Drive folder ID) for debugging/inspection only.
- **Source cleanup:** After a photo is migrated and the DB updated, the migration job attempts to delete:
  - The original full-size file from the **source** provider.
  - The original thumbnail file(s) from the source provider (if configured / available).
  - Optionally, once all photos in an album are migrated, the album’s folder (and sub-folders) can be deleted from the source provider so the album effectively “moves” instead of “copies”.
- **Resume:** Store last processed photo ID (and job state) so a failed or cancelled migration can resume without re-copying already-migrated photos.
- **Integrity:** Optional hash comparison after copy (read back from target and compare with source hash if available).

---

## 7. References

- [PHASE_3_WORKFLOW.md](./PHASE_3_WORKFLOW.md) – Stage 1 scope and acceptance criteria
- [SYSTEM_PRD.md](./SYSTEM_PRD.md) – §5 Storage, §6 Repository Import System
- [STORAGE.md](./STORAGE.md) – Storage providers and configuration
