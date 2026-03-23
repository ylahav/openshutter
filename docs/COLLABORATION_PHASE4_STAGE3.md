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

### Collaboration services (what each row controls)

The visibility matrix applies independently to three **services**:

| Service | Role |
| -------- | ---- |
| **Comments** | Discussion on the album: threaded replies on the album page, optional **per-photo** threads in the lightbox info panel, `@mentions`, reporting, and moderation (hide/show). Reading the list respects **Visitors** / **Signed-in**; **posting**, replying, and reporting require a **signed-in** user and the **Signed-in** column for comments to be on. |
| **Tasks** | A simple **to-do list** for the album: create items, mark done/reopen, optional **needs owner approval** (pending → approve/reject). Only **signed-in** users can create or change tasks; the two columns control **who can see** the task block (visitors vs members). |
| **Activity feed** | A **read-only timeline** of recent collaboration events on the album (e.g. new comment, reply, task created/completed, approval updated). It does not replace full audit logs; it helps the team see what changed. Visibility follows the same **Visitors** / **Signed-in** toggles. |

### Enabling / disabling

- **`features.collaboration`** in site config: per **service** (`comments`, `tasks`, `activity`) each has optional **`enabled`** (master switch; default on), **`public`** (visitors), and **`authenticated`** (signed-in). If **`enabled`** is **`false`**, that service is off for everyone except album moderators. **Admin → Site configuration → Sharing** tab: matrix with **Service on** + audience columns.
- Legacy: if **`features.enableComments === false`** and **`collaboration`** is not set, everything behaves as off for everyone.
- **Album owners and admins** always see all three sections on albums they can access (moderation), even when a column is off for normal users.
- **APIs:** **`GET`** lists require **`enabled`** and the matching audience flag; anonymous requests use **`public`**; authenticated requests use **`authenticated`**. **Writes:** comments/report require **`comments.enabled`** and **`comments.authenticated`**; tasks require **`tasks.enabled`** and **`tasks.authenticated`**.

## Deferred (later iterations)

- Deeper threading (multi-level), rich text editor, groups/`allowedGroups` alignment for tasks.
- Dedicated unread-count API; push notifications.
- Full approval state machine beyond task-level pending/approve/reject.

## References

- `backend/src/comments/*`, collaboration controllers/services
- `frontend/src/lib/components/AlbumComments.svelte`, `AlbumCollaborationPanel.svelte`, `PhotoLightbox.svelte`
- `frontend/src/routes/api/comments/**`, `api/collaboration/**`, `api/notifications/**`
- `frontend/src/routes/notifications/+page.svelte`
