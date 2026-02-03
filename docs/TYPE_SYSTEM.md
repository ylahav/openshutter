# OpenShutter Type System Documentation

## Overview

This document explains the centralized type system designed to eliminate interface duplication across the OpenShutter codebase (backend and frontend). The system provides multiple type variants optimized for different use cases while maintaining backward compatibility.

## Type Hierarchy

- **Base Types** (Album, Photo): Complete database models; use for DB operations and server-side processing.
- **Template Types** (TemplateAlbum, TemplatePhoto): String dates, template-specific fields; use for Svelte templates and JSON serialization.
- **API Response Types** (AlbumApiResponse, PhotoApiResponse): Computed fields, breadcrumbs, EXIF/URLs; use for REST responses.
- **Component Types** (AlbumCardData, PhotoCardData): Required fields for UI components.
- **Legacy Types** (LegacyAlbum, LegacyPhoto): Backward compatibility during migration.

## Where types live

- **Backend**: `backend/src/types/index.ts` (and `backend/src/types/README.md` pointed here; doc now in `docs/TYPE_SYSTEM.md`).
- **Frontend**: `frontend/src/lib/types/index.ts` (and `frontend/src/types/README.md` pointed here; doc now in `docs/TYPE_SYSTEM.md`).

## Best practices

- Use `TemplateAlbum`/`TemplatePhoto` for templates; `AlbumApiResponse`/`PhotoApiResponse` for API responses; `Album`/`Photo` for database operations.
- Import only what you need. Use type guards (e.g. `isTemplateAlbum`) when narrowing.
- Prefer composition over extending base types for component props.

## Troubleshooting

- **Type mismatches**: Use the correct variant (template vs API vs base).
- **Date handling**: Use template types when you need string dates.
- **Legacy code**: Use legacy types during migration; convert gradually.

For full details, examples, and migration strategy, see the original type docs; this file is the canonical location for type-system documentation in the `docs/` folder.
