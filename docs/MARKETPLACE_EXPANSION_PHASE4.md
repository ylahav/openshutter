# Integration Marketplace Expansion (Phase 4 – Stage 2)

**Stage:** 4.2 Design + Implementation  
**Status:** In progress  
**Date:** 2026-02-23

## Overview

This document extends the Phase 3 API Marketplace with discovery, richer listings, and moderation features as defined in [PHASE_4_WORKFLOW.md](./PHASE_4_WORKFLOW.md) Section 2.

---

## Goals

1. **Discovery:** Search by name/description, filter by category and compatibility, highlight featured listings.
2. **Listing richness:** Tags for filtering and discovery; optional featured flag for homepage/featured section.
3. **Lifecycle:** Keep submission → review → approve flow; optional deprecation later.

---

## Schema Additions

### MarketplaceListing (additions)

| Field | Type | Description |
|-------|------|-------------|
| `tags` | `string[]` | Optional tags for discovery (e.g. "export", "backup", "cli"). |
| `featured` | `boolean` | When true, listing can appear in a "Featured" section. Default: false. |

Existing fields (name, description, category, screenshots, version, apiVersionCompatible, etc.) remain. Version history and ratings/reviews are deferred to a later iteration.

---

## API

### Public listing list

- **GET /api/marketplace** (or existing public route)
  - Query params: `category`, `featured=true`, `q` (search on name/description), `limit`, `offset`.
  - Response: list of approved listings; when `featured=true` only return listings with `featured: true`.

### Admin

- PATCH listing: allow setting `featured`, `tags` (and existing fields).
- Submission form: allow optional `tags` (comma-separated or multi-input).

---

## Frontend

- **Marketplace home:** Search input, category filter chips/links, optional "Featured" section at top (listings with `featured: true`).
- **Listing detail:** Show tags; optional "Featured" badge.
- **Submit form:** Optional tags field.
- **Admin marketplace:** Toggle "Featured" per listing; edit tags.

---

## Deliverables

- [x] Design doc (this document).
- [ ] Backend: add `tags`, `featured` to schema and DTOs; list endpoint query params (category, featured, q).
- [ ] Frontend: marketplace home search + category filter + featured section; detail page tags; submit form tags; admin featured/tags.

---

## References

- [API_MARKETPLACE.md](./API_MARKETPLACE.md) – Phase 3 marketplace design
- [PHASE_4_WORKFLOW.md](./PHASE_4_WORKFLOW.md) – Section 2 Integration marketplace
