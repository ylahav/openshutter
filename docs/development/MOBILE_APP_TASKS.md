# Mobile application — task list

Actionable checklist for **Phase 4 Stage 5** (mobile app) and the **PWA-first** path from the community roadmap.

**Active branch (Phase 0):** `mobile/phase-0-design-perf`

### Shipped on this branch (PWA performance)

| Change | Files |
|--------|--------|
| Progressive lightbox (preview → full) + “HD…” upgrade hint | [`PhotoLightbox.svelte`](../../frontend/src/lib/components/PhotoLightbox.svelte), [`lightboxImageCache.ts`](../../frontend/src/lib/utils/lightboxImageCache.ts) |
| Prefetch prev / next / +2 (preview now, full on idle) | `lightboxImageCache.ts`, `PhotoLightbox.svelte` |
| Baseline trace tooling (no browser) | [`scripts/album-image-trace.mjs`](../../scripts/album-image-trace.mjs) |
| Baseline trace tooling (Playwright, optional) | [`e2e/album-network-trace.spec.ts`](../../e2e/album-network-trace.spec.ts) |

**See also**

- [`../archive/development/PHASE_4_WORKFLOW.md`](../archive/development/PHASE_4_WORKFLOW.md) — §5 Mobile app development (goal, scope, API, deliverables)
- [`../archive/development/ROADMAP_COMMUNITY.md`](../archive/development/ROADMAP_COMMUNITY.md) — Tier 2: PWA-first, then native decisions
- [`SYSTEM_PRD.md`](./SYSTEM_PRD.md) — Phase 4 summary

---

## Phase 0 — Scope and stack

### 0.1 Photo quality vs loading time (priority)

**Problem statement:** Public **album grid** and **single-photo / lightbox** views feel too slow on real mobile hardware and networks. Phase 0 must define an explicit **quality–latency tradeoff** before implementation.

- [ ] **Baseline metrics:** time-to-first-paint for grid cells; time-to-interactive for lightbox; bytes transferred per photo (grid vs full view); optional WebPageTest / Lighthouse mobile profile on a canonical album.
- [ ] **Automated trace (Playwright):** set `TRACE_ALBUM_PATH` and optional `PLAYWRIGHT_BASE_URL`, run `pnpm exec playwright test e2e/album-network-trace.spec.ts` (needs `pnpm exec playwright install chromium`). See `e2e/album-network-trace.spec.ts`.
- [ ] **Automated trace (Node, no browser):** `node scripts/album-image-trace.mjs --base https://yairl.com --alias 2018-10-04` — downloads grid vs full vs lightbox URLs per photo using the same URL rules as the frontend.

**Sample baseline (2026-05-15, `https://yairl.com/albums/2018-10-04`, 6 photos, server-side fetch):**

| Tier | Avg time | Total bytes (6 photos) | Path |
|------|----------|------------------------|------|
| Grid (`getPhotoUrl`) | ~5.0 s | ~375 KB | `/medium/…` |
| Lightbox (`storage.url`) | ~6.5 s | ~34 MB | full originals (~5–7 MB each) |

Lightbox loads **~90× more data** than grid per photo set → addressed by **progressive lightbox** (see Shipped above).

- [x] **Document tiers (v1):** grid = `getPhotoUrl` (medium/small); lightbox = preview via `resolveLightboxUrls` then full; prefetched neighbors use browser image cache.
- [ ] **Document tiers (follow-up):** optional “display size” cap or “Load original” on slow connections; zoom-to-full only on gesture.
- [ ] **Policy:** max dimensions or DPR-aware width for “full” on mobile (server-side resize, CDN transforms, or client-side cap) vs always serving original files.
- [ ] **Decide MVP:** is “good enough” mobile lightbox capped at 2K long edge acceptable for v1, with “original” on desktop or behind a control?

### 0.2 Current web implementation (audit hooks)

Use this as a starting point for code review; update as the app changes.

| Area | Role | Notes |
|------|------|--------|
| [`frontend/src/lib/utils/photoUrl.ts`](../../frontend/src/lib/utils/photoUrl.ts) | `getPhotoUrl`, `getPhotoFullUrl` | Grid-oriented code tends to use **`getPhotoUrl`** (prefers `thumbnails.medium` → `small` → paths). |
| [`frontend/src/lib/components/PhotoLightbox.svelte`](../../frontend/src/lib/components/PhotoLightbox.svelte) | Lightbox display | Uses **`resolveLightboxUrls`** (`getPhotoUrl` + `getPhotoFullUrl`): preview first, then full; instant if prefetched. |
| [`frontend/src/lib/utils/lightboxImageCache.ts`](../../frontend/src/lib/utils/lightboxImageCache.ts) | Prefetch cache | `preloadLightboxImage`, `isLightboxImageCached`; neighbors prefetched on index change. |
| [`frontend/src/lib/page-builder/modules/AlbumGallery/Layout.svelte`](../../frontend/src/lib/page-builder/modules/AlbumGallery/Layout.svelte) | Page-builder lightbox | Passes `url` + `thumbnailUrl`; lightbox resolves tiers via `resolveLightboxUrls`. |

**Phase 0 follow-ups (implementation comes after design sign-off):**

- [x] **`PhotoLightbox` progressive load** — `resolveLightboxUrls` + preview first, then full; small “HD…” hint while upgrading (`lightboxImageCache.ts`).
- [x] **Adjacent prefetch** — prev/next (+1 ahead) preload preview immediately, full in `requestIdleCallback`.
- [ ] Inventory all `PhotoLightbox` call sites (templates + `SearchResults` + page-builder) and list which payload shape each passes.
- [ ] Check for **missing small thumbnails** in API/storage (e.g. some providers) forcing full-file downloads in grids—document gaps.

### 0.3 Stack, API, auth, design doc

- [ ] Decide **PWA vs native/cross-platform** (e.g. React Native, Flutter, Capacitor, or native iOS/Android) and **MVP feature cut** (browse-only vs upload + edit).
- [ ] Map **required APIs** to current `/api/v1/` (albums, photos, upload, metadata); document gaps vs the web app.
- [ ] Document **auth**: API keys vs OAuth vs session/JWT; token lifetime and refresh; alignment with existing backend/NextAuth.
- [ ] Produce a **mobile design doc**: architecture, auth flow, API usage, error and rate-limit handling, **offline strategy** (in or out of scope), and the **image tiering / progressive loading** decisions from §0.1.

---

## Phase 1 — Product and UX

- [ ] **Information architecture**: login → albums → album → photo detail; owner vs visitor if both apply.
- [ ] **Upload UX**: camera vs library; progress; cancel/retry; large-file expectations.
- [ ] Baseline **accessibility** and platform patterns (iOS HIG / Material) where relevant.

---

## Phase 2 — Engineering foundation

- [ ] App **shell**: navigation, theming, per-environment config (dev/staging/prod).
- [ ] **Secure credential storage** (Keychain / Keystore or stack equivalent).
- [ ] **HTTP client**: base URL, API versioning, timeouts, structured errors.
- [ ] **Observability**: logging/crash reporting; optional analytics events.

---

## Phase 3 — Core MVP features

- [ ] **Sign-in** and **sign-out** / session invalidation per chosen auth.
- [ ] **List albums** and **open album** (grid or list).
- [ ] **Photo detail** (zoom/swipe if in scope).
- [ ] **Upload photos** with **queue**; **chunked or resumable** uploads if large files are in scope.
- [ ] **Basic edit** if in MVP: caption and/or tags (per Phase 4 workflow scope).

---

## Phase 4 — Hardening

- [ ] **Background upload** behavior (or documented limitations when backgrounded).
- [ ] **Rate limits and retries** with backoff; clear user messaging.
- [ ] **Optional offline**: cache policy, eviction, sync when online (only if committed).
- [ ] **Optional biometrics** to unlock stored tokens.
- [ ] **SSO readiness**: avoid blocking future enterprise SSO without implementing it yet.

---

## Phase 5 — Release and operations

- [ ] **Store listings**: icons, screenshots, privacy policy URL, store-specific compliance (e.g. data safety).
- [ ] **CI/CD**: builds, tests, signing (iOS/Android) as applicable.
- [ ] **Release process**: versioning, staged rollout, rollback.
- [ ] **Backend follow-ups** (optional): push notification endpoint; API extensions discovered during implementation.

---

## PWA-first track (community roadmap)

Can run **before** or **in parallel** with a store app so mobile users improve without waiting for native.

- [ ] Tighten **installable PWA** (manifest, icons, install prompts where appropriate).
- [x] Improve **lightbox** load on mobile (progressive + prefetch — see Shipped).
- [ ] Polish **mobile upload** and **playback** on the existing web frontend.
- [ ] Improve **touch** flows (navigation, gallery gestures) on small viewports.

---

## Phase 4 checklist alignment

In [`PHASE_4_WORKFLOW.md`](../archive/development/PHASE_4_WORKFLOW.md), Stage 5 is tracked as:

- Stage 5 (Mobile app): **design and implementation**

Use the checkboxes in this file to drive that stage; keep the workflow doc as the canonical phase narrative.
