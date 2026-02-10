# Phase 3 Workflow

**Branch:** `phase-3`  
**Horizon:** Next 12 months  
**Status:** Planning

This document defines the workflow and stages for Phase 3 of the OpenShutter roadmap. Each stage includes goals, deliverables, and acceptance criteria.

---

## Overview

| Stage | Initiative | Priority | Dependencies |
|-------|------------|----------|--------------|
| 1 | Migration (external & storage) | High | None |
| 2 | AI-powered photo tagging | High | Stage 1 (optional: bulk import) |
| 3 | Advanced analytics | Medium | Existing search & tags |
| 4 | API marketplace | Medium | Stable public API |
| 5 | Enterprise features | Medium | Access control, API |
| 6 | Smart tag suggestions & search optimization | Medium | Tags, search, analytics |

---

## Stage 1: Migration (External & Storage)

**Goal:** Design and implement migration in two forms: (1) **migration to/from external area** (import/export)—portable package with database reflection and photo tree mirroring the repository; (2) **internal storage migration**—move assets between storage backends without changing repository structure.

### 1.1 Design

- **Requirements review:** Align with SYSTEM_PRD §6 (Repository Import System).
- **Scope:**
  - **Migration to/from external area (import & export):** A single, symmetric model: the external format is a **portable package** that includes (a) a **database reflection**—serialized repository state (e.g. collection of JSON files: albums tree, photos with metadata, tags, people, etc.) so that structure and metadata are fully restorable; (b) a **file tree** of all photos in the **same structure as the repository** (album hierarchy and photo placement mirroring albums/albums-within-albums). Export produces this package; import consumes it and recreates the repository (albums + photos + metadata) from it. Also support **import-only** from raw external sources (e.g. plain folder scan) by building the tree and optional metadata from filesystem/EXIF.
  - **Internal storage migration:** Copy all photo assets from current storage backend to another (e.g. local → S3); update DB references only; no change to repository structure or external format.
- **Technical design:**
  - **External package format:** Define a canonical layout, e.g. `manifest.json` or a set of JSON files (albums, photos, tags, …) plus a directory tree `photos/` (or per-album folders) whose hierarchy mirrors the repository album tree. Each photo file sits under the path that reflects its album(s); manifest/JSON references these paths. Export: dump DB state to JSON + copy files into that tree. Import: read JSON to restore DB state (or create albums/photos), then link files from the tree.
  - **Import from external:** Accept (1) a package that includes DB reflection + tree (full restore), or (2) a raw path: scan folder tree, map folders → albums, files → photos, optional EXIF/IPTC/XMP for metadata. Concurrency and rate limits; preview-before-execute; large-operation handling.
  - **Internal storage migration:** All configured backends as source/target; read from current default, write to new, update `photos` (and related) records; idempotency, resume, checksum verification.
- **API design:** Endpoints for export (preview, start, status, cancel), import (scan for raw source, preview, start, status, cancel), and storage migration (preview, start, status, cancel).
- **Security:** Admin-only; path allowlist/validation for import/export paths; migration restricted to configured storage providers.
- **Deliverable:** Design doc (e.g. `docs/IMPORT_SYNC_DESIGN.md`) defining external package format (DB reflection + tree), import/export flow, and storage migration + ADR if needed.

**Alignment with original task (SYSTEM_PRD):**
- **§6 Repository Import System:** Scan external sources, parse folder structure into albums, import photos with metadata, progress tracking, preview before execution, handle large operations, folder structure preserved — all covered by Stage 1 (import from raw path and import from package).
- **§5 Storage System:** “Storage migration capabilities” and “Storage migration completes successfully” — covered by internal storage migration.
- **Extension:** The PRD does not specify export or a portable format. Stage 1 adds **export** and a **portable package** (database reflection e.g. JSON + photo tree mirroring the repository) so that migration to/from external area is symmetric and fully restorable; this extends §6 without contradicting it.

### 1.2 Implementation

- **Backend:**
  - **Export (to external):** Build portable package: serialize repository state to JSON (albums tree, photos with metadata/tags/people, etc.); write photo files into a directory tree that mirrors the repository (same album hierarchy, same photo placement). Job: queue or long-running; progress state (e.g. DB or Redis). API: `POST /api/admin/export/preview`, `POST /api/admin/export/start`, `GET /api/admin/export/status/:jobId`, `POST /api/admin/export/cancel/:jobId`. Output: target path or archive (e.g. ZIP) containing JSON + tree.
  - **Import (from external):** (1) **From package:** Read DB reflection (JSON), restore or merge albums/photos/tags; link/copy photo files from the package tree into repository storage. (2) **From raw path:** Scan service: list files, build tree, extract metadata for preview; map folder hierarchy → album tree; import job with duplicate handling (reuse upload hash where applicable). API: `POST /api/admin/import/scan` (raw), `POST /api/admin/import/preview`, `POST /api/admin/import/start`, `GET /api/admin/import/status/:jobId`, `POST /api/admin/import/cancel/:jobId`.
  - **Storage migration:** Migration job: iterate over all photos (or filtered set), read from current storage, write to target storage, update DB with new storage key/URL; progress and state persisted (DB or Redis). Optional: checksum verification; resume on failure. API: `POST /api/admin/storage-migration/preview`, `POST /api/admin/storage-migration/start`, `GET /api/admin/storage-migration/status/:jobId`, `POST /api/admin/storage-migration/cancel/:jobId`. Config or UI to select target storage provider.
- **Frontend:**
  - **Export:** Admin UI: destination path/options, preview (album tree + photo count, size), start/cancel, progress indicator.
  - **Import:** Admin UI: source selection (package path or raw folder), scan trigger for raw, preview tree (albums + photo count), import options, start/cancel, progress indicator.
  - **Storage migration:** Admin UI: current vs. target storage, preview (photo count, size), start/cancel, progress; confirmation before switching default storage.
- **Testing:** Unit tests for export package format (DB reflection + tree), import from package and from raw; storage migration; integration test with small fixture; manual test with large directory and two storage backends.
- **Deliverable:** Feature flag or config to enable export, import, and storage migration; docs (admin guide, external package format, API, migration runbook).

### 1.3 Acceptance Criteria

**Migration to/from external (import & export):**
- [ ] Export produces a portable package: database reflection (e.g. collection of JSON files for albums, photos, tags, metadata) plus a file tree of all photos in the same structure as the repository (album hierarchy and placement preserved).
- [ ] Import from that package restores the repository (albums, photos, metadata, tags) and links/copies files from the package tree so the result mirrors the original.
- [ ] Import from raw external path: scan returns folder/photo tree; preview shows album structure and photo counts; import creates albums and photos (with optional metadata from EXIF/etc.); progress accurate; cancellable; paths validated and restricted.
- [ ] Only admins can run export/import; paths are allowlisted and validated.

**Internal storage migration:**
- [ ] Admin can select target storage provider and start a migration job.
- [ ] Migration copies all photo assets to target storage and updates DB references; progress is accurate and resumable where applicable.
- [ ] Integrity check (e.g. hash comparison) available or performed; failures are reported per photo or batch.
- [ ] Large migrations are cancellable and do not block server; default storage can be switched after successful migration.
- [ ] Only admins can run storage migration; only configured storage backends are allowed as source/target.

---

## Stage 2: AI-Powered Photo Tagging

**Goal:** Automate or assist tagging using AI (e.g. object/scene recognition, keyword extraction) to suggest or apply tags.

### 2.1 Design

- **Scope:** Suggest tags per photo (or batch); optional auto-apply with confidence threshold; respect existing tag taxonomy (categories, existing tags).
- **Model options:** Local model (e.g. image captioning/classification) vs. external API (e.g. vision API); cost and privacy trade-offs.
- **Integration points:** Photo upload pipeline, photo edit page, bulk operations.
- **Deliverable:** Design doc (e.g. `docs/AI_TAGGING_DESIGN.md`) with chosen approach and API contract.

### 2.2 Implementation

- **Backend:**
  - Service to run inference (local or external); input: image URL/path; output: suggested tags + confidence.
  - Optional: map raw labels to existing tag IDs/categories.
  - Endpoints: e.g. `POST /api/admin/photos/:id/suggest-tags`, `POST /api/admin/photos/bulk-suggest-tags`.
- **Frontend:**
  - Photo edit: “Suggest tags” button; show suggestions with accept/reject or confidence filter.
  - Bulk: select photos → “Suggest tags” → review and apply.
- **Performance:** Queue for batch jobs; rate limits for external API.
- **Deliverable:** Feature behind flag or role; docs and configuration (API keys, thresholds).

### 2.3 Acceptance Criteria

- [ ] Single-photo and batch tag suggestion work.
- [ ] Suggestions can be accepted or ignored; no forced auto-apply without user control.
- [ ] Configurable confidence threshold if auto-apply is offered.
- [ ] Respects existing tag list/categories where applicable.

---

## Stage 3: Advanced Analytics

**Goal:** Provide analytics and reporting for admins/owners: usage, engagement, tag/album stats, storage, and trends.

### 3.1 Design

- **Metrics:** Views (albums/photos), search usage, tag usage over time, storage by album/provider, top albums/photos, user activity (if applicable).
- **Data source:** Existing DB + optional event log or aggregated tables.
- **Privacy:** Only admins (and optionally owners for their own content); no PII in exports without consent.
- **Deliverable:** Analytics design doc with metric definitions and retention.

### 3.2 Implementation

- **Backend:**
  - Aggregation jobs or real-time queries for chosen metrics.
  - API: e.g. `GET /api/admin/analytics/overview`, `GET /api/admin/analytics/tags`, `GET /api/admin/analytics/albums`, `GET /api/admin/analytics/storage`, with date range and filters.
- **Frontend:**
  - Analytics dashboard: charts (time series, bar, pie), tables, optional export (CSV).
- **Deliverable:** Dashboard in admin (and optionally owner) UI; docs.

### 3.3 Acceptance Criteria

- [ ] Key metrics (e.g. views, tag usage, storage) are available via API and UI.
- [ ] Date range and filters work correctly.
- [ ] Access restricted to admin (and owner scoped where defined).

---

## Stage 4: API Marketplace

**Goal:** Enable third-party integrations via a documented, versioned public API and a marketplace or directory of integrations.

### 4.1 Design

- **API surface:** Identify endpoints to expose publicly (read-only vs. write); versioning strategy (e.g. `/v1/`).
- **Auth:** API keys or OAuth for third-party apps; scopes (e.g. read albums, write tags).
- **Marketplace:** Directory of approved integrations (plugins, scripts, apps) with docs and links.
- **Deliverable:** API product doc and marketplace concept (e.g. `docs/API_MARKETPLACE.md`).

### 4.2 Implementation

- **Backend:**
  - Public API versioning; API key creation and scopes; rate limiting.
  - Documentation: OpenAPI/Swagger for public endpoints.
- **Frontend / Docs:**
  - Developer portal: signup, API key management, docs, changelog.
  - Marketplace page: list of integrations with descriptions and links.
- **Deliverable:** Working public API + developer portal + marketplace listing.

### 4.3 Acceptance Criteria

- [ ] Public API is documented and versioned.
- [ ] API keys can be created and scoped; rate limits apply.
- [ ] Marketplace page exists and is maintainable (e.g. config or CMS).

---

## Stage 5: Enterprise Features

**Goal:** Add capabilities required for larger organizations: SSO, audit logs, quotas, and tenant-style isolation if needed.

### 5.1 Design

- **Candidates:** SSO (SAML/OIDC), audit log (who did what, when), storage/usage quotas, optional multi-tenancy or org hierarchy.
- **Priority:** Decide order (e.g. audit log first, then SSO, then quotas).
- **Deliverable:** Enterprise roadmap doc with feature list and priorities.

### 5.2 Implementation

- **Per feature:**
  - Audit log: backend events (login, album create, photo delete, etc.), API and UI to browse/export.
  - SSO: integrate with existing auth; config for IdP; JWT/session handling.
  - Quotas: enforce limits on storage or photo count per user/org; UI and API to show usage.
- **Deliverable:** Each feature behind config/flag; docs and migration notes.

### 5.3 Acceptance Criteria

- [ ] Audit log records critical actions and is queryable.
- [ ] SSO (if implemented) allows login via enterprise IdP.
- [ ] Quotas (if implemented) are enforced and visible to admins/users.

---

## Stage 6: Smart Tag Suggestions & Tag-Based Search Optimization

**Goal:** Improve tagging and search: suggest tags based on existing data and optimize search for tag-based queries.

### 6.1 Design

- **Smart tag suggestions:** From existing tags on similar photos, from metadata (IPTC keywords, location), or from AI (Stage 2); UX: show in tag input or photo edit.
- **Search optimization:** Indexing (e.g. tag IDs, full-text); query performance for tag filters; relevance tuning for tag-based queries.
- **Deliverable:** Short design note linking to Stage 2 and existing search/tag implementation.

### 6.2 Implementation

- **Backend:**
  - Suggestion service: similar-photo logic or metadata-based suggestions; endpoint e.g. `GET /api/admin/photos/:id/suggest-tags-from-context`.
  - Search: index and query optimizations; optional Elasticsearch or DB full-text if needed.
- **Frontend:**
  - Tag input: autocomplete or “suggested” chips from new endpoint.
- **Deliverable:** Suggestions in UI; faster and more relevant tag-based search.

### 6.3 Acceptance Criteria

- [ ] Context-based tag suggestions available in photo edit and/or upload.
- [ ] Tag-based search is accurate and performant at current scale.

---

## Phase 3 Checklist

- [ ] Branch `phase-3` created and used for Phase 3 work
- [ ] Stage 1 design doc and implementation complete
- [ ] Stage 2 design doc and implementation complete
- [ ] Stage 3 design doc and implementation complete
- [ ] Stage 4 design doc and implementation complete
- [ ] Stage 5 design doc and implementation complete
- [ ] Stage 6 design doc and implementation complete
- [ ] README and SYSTEM_PRD roadmap updated with Phase 3 progress
- [ ] CHANGELOG and release notes updated for Phase 3 releases

---

## References

- [SYSTEM_PRD.md](./SYSTEM_PRD.md) – Phase 3 roadmap, §6 Repository Import System
- [README.md](../README.md) – Roadmap section
- [functional-spec.md](./functional-spec.md) – API and feature spec
