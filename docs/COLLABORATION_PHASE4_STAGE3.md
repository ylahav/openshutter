# Advanced collaboration (Phase 4 – Stage 3)

**Status:** MVP complete (March 2026)  
**Parent:** [PHASE_4_WORKFLOW.md](./PHASE_4_WORKFLOW.md) §3

## Scope delivered (MVP)

- **Album comments** (not per-photo in v1): logged-in users who can **view** the album (same rules as `AlbumsService.canAccessAlbum`) may **post**; visitors who can view the album may **read** non-hidden comments.
- **Moderation:** **Admins** and the **album creator** (`createdBy`) can **hide** or **show** comments via `PATCH /api/comments/:id` with `{ "hidden": true | false }`.
- **Storage:** MongoDB collection **`album_comments`** (`albumId`, `authorId`, `body`, `hidden`, timestamps).
- **API:**
  - `GET /api/comments/album/:albumId` — optional `includeHidden=true` for moderators.
  - `POST /api/comments/album/:albumId` — body `{ "body": "..." }` (max 4000 chars); requires auth.
  - `PATCH /api/comments/:id` — `{ "hidden": boolean }`; admin or album owner.
- **Frontend:** `AlbumComments` on public album templates (default, modern, minimal, elegant); i18n `albums.comments*` (en/he). SvelteKit proxies under `/api/comments/...`.

## Deferred (later iterations)

- Threaded replies, @mentions, email/in-app notifications.
- Tasks / assignments, approval workflow, activity feed.
- Public API (`/api/v1/`) exposure for comments.
- Per-photo comments, reporting, rich text.

## References

- `backend/src/comments/*`
- `frontend/src/lib/components/AlbumComments.svelte`
- `frontend/src/routes/api/comments/**`
