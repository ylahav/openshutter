# Tag optimization & ML signals (Phase 4 – Stage 4)

**Status:** Implemented (March 2026) — slices A-D shipped  
**Parent:** [PHASE_4_WORKFLOW.md](./PHASE_4_WORKFLOW.md) §4  
**Related:** [AI_TAGGING_DESIGN.md](./AI_TAGGING_DESIGN.md) (Phase 3 AI tagging), [SMART_TAG_SUGGESTIONS_DESIGN.md](./SMART_TAG_SUGGESTIONS_DESIGN.md) (context suggestions & search indexes)

## Goal

Improve tag quality and discovery using **observed user behavior** (accept/reject), **co-occurrence** signals, and optional **search ranking** tweaks—without requiring a heavyweight training pipeline in the first iterations.

## Baseline already in the codebase

| Piece | Location / behavior |
| ----- | ------------------- |
| **Feedback storage** | MongoDB collection **`tag_feedback`**: `photoId`, `tagId`, `userId`, `source` (`ai` \| `context` \| `manual`), `action` (`applied` \| *reserved for future*), `createdAt`. |
| **Positive signal on apply** | `POST /api/admin/photos/:id/apply-tags` records **`TagFeedbackService.recordAppliedTags`** for newly added tags with `source` from the client (`ai`, `context`, or `manual`). |
| **Related tags (feedback-based)** | `TagFeedbackService.getRelatedTags(tagId)` — co-occurrence of other **applied** tags on the **same photos** as the seed tag, via aggregation on `tag_feedback`. |
| **Admin API** | `GET /api/admin/tags/related/by-id?tagId=...&limit=...` resolves tag documents for those ids. |

This satisfies part of the Phase 4 workflow deliverable *“feedback collection from Phase 3 flows”* for **accept** paths that go through `apply-tags` with the correct `source`.

## Gaps (to close in Stage 4)

1. **Negative / dismiss signals:** When a user **rejects** or **dismisses** a suggested tag (AI or context modal), we should record `action: 'dismissed'` or `action: 'rejected'` (name TBD) with the same `source`, so future ranking can down-rank bad pairs (e.g. wrong ImageNet class → tag mapping).
2. **Cold start:** `getRelatedTags` only sees tags that appear in `tag_feedback`. For sites with little apply history, add a **fallback**: co-occurrence from **`photos.tags`** (same pattern as Stage 6 repository-wide patterns, but exposed as a stable admin or photo-edit API).
3. **Product surfacing:** Photo edit / tag modals should show **“Related tags”** (and optionally **similar photos** later) using the APIs above plus fallback.
4. **Search relevance:** [SMART_TAG_SUGGESTIONS_DESIGN.md](./SMART_TAG_SUGGESTIONS_DESIGN.md) already improved indexes and tag-query scoring. Stage 4 can add **lightweight boosts** (e.g. prefer tags with higher apply/dismiss ratio from feedback) behind a feature flag or config—optional slice.
5. **Privacy & retention:** Document TTL or admin export/delete for `tag_feedback`; avoid storing PII beyond `userId` ObjectId.

## Implemented slices

### Slice A — Dismiss / reject feedback (backend + frontend) ✅

- `TagFeedbackEvent` now supports `action: 'dismissed'`.
- New endpoint: `POST /api/admin/photos/:id/tag-suggestion-feedback`, body: `{ tagIds: string[], source: 'ai' | 'context', action: 'dismissed' }`.
- Frontend records dismiss on modal close and explicit per-row dismiss, with debounced batching.

### Slice B — Related tags for a photo (API + UI) ✅

- New endpoint: `GET /api/admin/photos/:id/related-tags?limit=15&tagIds=...`.
  - Unions **feedback-based** co-occurrence with fallback co-occurrence from `photos.tags` on same album/location.
  - Excludes tags already on the photo.
- Photo edit UI consumes this API and supports one-click apply.

### Slice C — Admin visibility (optional) ✅

- Admin endpoint `GET /api/admin/tags/feedback/stats` returns grouped counts by `source` and `action`.
- Admin Tags page includes a "Tag Feedback Signals" panel with refresh.

### Slice D — Search boost (optional) ✅

- Config-gated adjustment added to tag search relevance in `SearchService` using apply/dismiss ratios.
- Gate: `features.enableTagFeedbackSearchBoost` (default `false`) with admin Site Config toggle.

## Non-goals (initially)

- Training custom embedding models on premises.
- Replacing MobileNet / provider-based AI tagging in Phase 3.
- Real-time model retraining loops.

## References

- `backend/src/services/tag-feedback.ts`
- `backend/src/photos/photos-admin.controller.ts` (`apply-tags`)
- `backend/src/tags/tags.controller.ts` (`related/by-id`)
