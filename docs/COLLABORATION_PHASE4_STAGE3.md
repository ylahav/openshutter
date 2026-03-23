# Advanced collaboration (Phase 4 – Stage 3)

**Status:** Extended MVP complete (March 2026)  
**Parent:** [PHASE_4_WORKFLOW.md](./PHASE_4_WORKFLOW.md) §3

## Scope delivered

### Comments

- **Album and per-photo:** Comments are scoped by `albumId`; optional `photoId` filters threads on a photo. Public album pages use **`AlbumCollaborationPanel`** (album-level comments). **Photo lightbox** (info panel) embeds **`AlbumComments`** with `photoId`, dark/compact styling, when templates pass **`albumCollaboration`** into **`PhotoLightbox`**.
- **Threading:** One level of replies via `parentCommentId` on **`album_comments`**.
- **Mentions:** `@username` in body → in-app notification (and email when mail is configured) for mentioned users.
- **Reporting:** Authenticated viewers can report a comment; moderators see report counts and can still hide/show.
- **Moderation:** Admins and album creator hide/show via **`PATCH /api/comments/:id`**.
- **Linkify:** Comment bodies escape HTML and linkify `http(s)` URLs in the UI.

### Tasks & activity

- **`album_tasks`** with status (e.g. open/done) and optional **`approvalStatus`** (pending / approved / rejected / none).
- **`collaboration_activity`** records events (comment, reply, task created/completed, approval updates).
- **API:** `GET/POST …/collaboration/album/:albumId/tasks`, **`PATCH …/collaboration/tasks/:taskId`**, **`GET …/collaboration/album/:albumId/activity`** (see Nest **`CollaborationController`**).
- **UI:** **`AlbumCollaborationPanel`** — collapsible activity feed, task list, create task (optional “needs approval”), done/reopen, approve/reject for moderators when pending.

### Notifications

- **In-app:** **`InAppNotification`** collection; **`GET /api/notifications`**, **`PATCH …/read-all`**, **`PATCH …/:id/read`** (SvelteKit proxies under **`/api/notifications`**).
- **Frontend:** **`/notifications`** page; **`NotificationNavLink`** in template headers (and **`lib/components/Header.svelte`** where used) when signed in, with unread badge (from recent list).

### Public API (v1)

- **`V1CommentsController`:** comments for an album under **`v1/comments/album/:albumId`** with scopes **`comments:read`** / **`comments:write`** (with **`read`** / **`write`** fallbacks where implemented).
- Developer **API keys** UI includes **`comments:read`** and **`comments:write`** scope options.

### Storage & proxies

- MongoDB: **`album_comments`**, **`album_tasks`**, **`collaboration_activity`**, **`in_app_notifications`** (exact names per backend schemas).
- SvelteKit **`/api/comments/**`**, **`/api/collaboration/**`**, **`/api/notifications/**`** proxy to Nest with cookies.

### i18n

- **`albums.*`** strings for comments (threading, report, mention hint, per-photo label) and collaboration (activity, tasks, approvals) in **en** and **he**.
- **`notifications.*`**, **`header.notifications`**.

## Deferred (later iterations)

- Deeper threading (multi-level), rich text editor, groups/`allowedGroups` alignment for tasks.
- Dedicated unread-count API; push notifications.
- Full approval state machine beyond task-level pending/approve/reject.

## References

- `backend/src/comments/*`, collaboration controllers/services
- `frontend/src/lib/components/AlbumComments.svelte`, `AlbumCollaborationPanel.svelte`, `PhotoLightbox.svelte`
- `frontend/src/routes/api/comments/**`, `api/collaboration/**`, `api/notifications/**`
- `frontend/src/routes/notifications/+page.svelte`
