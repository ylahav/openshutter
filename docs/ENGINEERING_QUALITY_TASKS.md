# Engineering quality — task list

Branch: **`chore/engineering-quality`**

Goal: raise baseline quality—cleaner Svelte/compiler output, accessibility, predictable reactivity, and stronger automated checks—without changing product behavior unless fixing real bugs.

---

## Phase A — Baseline and gates

- [ ] **A1.** Run full quality suite locally and record baseline: root `pnpm lint`, `pnpm type-check`, `pnpm build`, and (optional) `pnpm test:e2e`.
- [ ] **A2.** Decide CI policy: fail PRs on new ESLint/TypeScript errors; optionally treat Svelte a11y/compiler warnings as errors once volume is manageable (`svelte.config.js` / Vite plugin options).
- [ ] **A3.** Document “definition of done” for UI PRs: e.g. no new `a11y_*` or `export_let_unused` in touched files (or justified suppression with a comment).

---

## Phase B — High-impact components (from production build warnings)

These files generated multiple or serious warnings (a11y, invalid markup, reactivity).

- [ ] **B1.** `frontend/src/lib/components/PhotoLightbox.svelte` — address `state_referenced_locally`, `$state`/`bind:this` patterns (`panelRef`, `containerRef`, `imageRef`, `canvasRef`), touch target `role`, self-closing `<canvas>`, and related a11y rules.
- [ ] **B2.** `frontend/src/lib/components/CollectionPopup.svelte` — keyboard + `role` for overlay/panel click targets; explicit labels on icon-only buttons.
- [ ] **B3.** `frontend/src/lib/components/NotificationDialog.svelte` — backdrop: keyboard handler, valid non–self-closing markup, focus trap consistency with `AdminConfirmDialog` patterns where applicable.
- [ ] **B4.** `frontend/src/lib/components/AlertModal.svelte` — replace self-closing non-void elements with explicit open/close tags.
- [ ] **B5.** `frontend/src/routes/photos/upload/+page.svelte` — upload dropzone: `role`, keyboard support or native `<button>`/`<label>` pattern; fix progress bar markup; remove or use `data` export per Svelte 5 guidance.
- [ ] **B6.** `frontend/src/routes/owner/site-settings/+page.svelte` — associate `<label>` with controls for Terms of Service / Privacy Policy URL fields (`for` / `id`).

---

## Phase C — Shared UI and search

- [ ] **C1.** `frontend/src/lib/components/search/SearchResults.svelte` — photo grid cards: `role="button"` or `<button>` + keyboard for lightbox open.
- [ ] **C2.** `frontend/src/lib/components/search/SearchBar.svelte` — `aria-label` (or visible text) on clear button.
- [ ] **C3.** `frontend/src/lib/components/TokenRenewalNotification.svelte` — dismiss control: `aria-label` / `title`.
- [ ] **C4.** `frontend/src/lib/components/AlbumComments.svelte` — `<textarea>` must not be self-closing.

---

## Phase D — Templates and marketing surfaces

- [ ] **D1.** `frontend/src/lib/templates/{default,minimal,elegant}/components/Hero.svelte` — carousel dot buttons: `aria-label` including slide index / “Slide N of M”.
- [ ] **D2.** `frontend/src/lib/templates/{default,minimal,elegant}/Home.svelte` — resolve unused `export let data` (use `data`, or `export const data` if only for typing, or remove).

---

## Phase E — Page-builder module shells

Many `Layout.svelte` files under `frontend/src/lib/page-builder/modules/**` warn on unused `data` / `templateConfig` / `config`. Pick **one** consistent pattern and apply across modules:

- [ ] **E1.** Choose pattern: prefix with `_` for intentionally unused props, omit from `export let` where the renderer allows, or use `export const` / minimal interface—match existing convention after checking Svelte 5 + module loader.
- [ ] **E2.** Sweep modules: `LanguageSelector`, `Menu`, `ThemeSelect`, `AuthButtons`, `UserGreeting`, `SiteTitle`, `SocialMedia`, `ThemeToggle`, `Logo`, `Cta`, etc.

---

## Phase F — Theme provider and misc

- [ ] **F1.** `frontend/src/lib/components/ThemeProvider.svelte` — `enableSystem` unused: wire to behavior or remove from public API if dead.
- [ ] **F2.** Re-scan build output after Phases B–E; fix stragglers file-by-file.

---

## Phase G — Build and tooling (optional)

- [ ] **G1.** Investigate `[PLUGIN_TIMINGS]` — `vite-plugin-sveltekit-guard` dominating build time; see if guard scope or config can be narrowed without losing safety.
- [ ] **G2.** Consider chunk-size or lazy-loading follow-ups only if metrics show slow first load (separate from warning cleanup).

---

## Suggested order

1. **A1** (baseline) → **B** (worst offenders) → **C** → **D** → **E** → **F** → **G** optional.  
2. Merge in small PRs (e.g. one PR per phase or per component cluster) to ease review and rollback.

---

## References

- Svelte warning codes: [https://svelte.dev/docs/svelte/compiler-warnings](https://svelte.dev/docs/svelte/compiler-warnings)  
- Related product roadmaps stay in [`ROADMAP_COMMUNITY.md`](./ROADMAP_COMMUNITY.md) and [`ADMIN_UI_ROADMAP.md`](./ADMIN_UI_ROADMAP.md); this list is **engineering hygiene** only.
