# Tag optimization & ML signals (Phase 4 – Stage 4)

**Status:** Design (March 2026) — implementation planned in slices below  
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

## Proposed implementation slices (ordered)

### Slice A — Dismiss / reject feedback (backend + frontend)

- Extend `TagFeedbackEvent` / insert path to allow `action: 'dismissed'` (or `rejected`).
- New endpoint, e.g. `POST /api/admin/photos/:id/tag-suggestion-feedback`, body: `{ tagIds: string[], source: 'ai' | 'context', action: 'dismissed' }` (idempotent-friendly).
- Frontend: when the user closes the AI or context suggestion modal without applying, or explicitly dismisses a row, call the endpoint (debounced batch).

### Slice B — Related tags for a photo (API + UI)

- New endpoint, e.g. `GET /api/admin/photos/:id/related-tags?limit=15`:
  - Union tags from **feedback-based** co-occurrence (tags on same photos in `tag_feedback` for this photo’s current tags) with **fallback** co-occurrence from `photos.tags` on the same album or location.
  - Exclude tags already on the photo.
- Photo edit UI: small “Related tags” strip with one-click add (reusing `apply-tags`).

### Slice C — Admin visibility (optional)

- Admin page or section: counts of feedback events by `source` and `action`; link to existing tag analytics if present.

### Slice D — Search boost (optional)

- Config-gated adjustment to tag search scoring using aggregate accept/dismiss rates per suggested tag class—**only after** Slice A has data.

## Non-goals (initially)

- Training custom embedding models on premises.
- Replacing MobileNet / provider-based AI tagging in Phase 3.
- Real-time model retraining loops.

## References

- `backend/src/services/tag-feedback.ts`
- `backend/src/photos/photos-admin.controller.ts` (`apply-tags`)
- `backend/src/tags/tags.controller.ts` (`related/by-id`)
