# Next steps (after engineering-quality merge to `main`)

**Context:** The **`chore/engineering-quality`** work (Phases A–G, CI, docs layout, dependency refresh) is **merged into `main`** (April 2026). Historical detail: [`ENGINEERING_QUALITY_TASKS.md`](./ENGINEERING_QUALITY_TASKS.md).

Use this list to pick **immediate** follow-ups vs **product roadmap** work.

---

## 1. Immediate (repository / CI)

| Task | Notes |
|------|--------|
| **Push `main` and confirm CI** | Ensure [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) passes on GitHub (`lint`, `type-check`, `build`). |
| **Reconcile long-lived branches** | Update or delete `chore/engineering-quality` locally/remotely if you no longer need it (`git branch -d`, remote prune). |
| **Optional: tag / release** | If you version from `main`, bump or tag per [`CHANGELOG.md`](../../CHANGELOG.md). |

---

## 2. Product roadmap (priority work)

| Doc | Focus |
|-----|--------|
| [`ROADMAP_COMMUNITY.md`](./ROADMAP_COMMUNITY.md) | Tier 1: template packs polish, **video MVP**, crop editing; adoption themes. |
| [`VIDEO_TASKS.md`](./VIDEO_TASKS.md) | Video feature checklist (albums, lightbox, storage). |
| [`PHASE_4_WORKFLOW.md`](./PHASE_4_WORKFLOW.md) | Remaining Phase 4: mobile app (5), video (6), enterprise (7); tag optimization follow-ups if any. |
| [`ADMIN_UI_ROADMAP.md`](./ADMIN_UI_ROADMAP.md) | Admin shell UX backlog. |
| [`TEMPLATING_TASKS.md`](./TEMPLATING_TASKS.md) | Template / page-builder implementation gaps. |

---

## 3. Engineering hygiene (optional, non-blocking)

| Task | Notes |
|------|--------|
| **ESLint warning reduction** | Baseline ~400 warnings; tighten rules or fix clusters when touching files. |
| **`eslint --max-warnings 0`** | Only after warning count is manageable. |
| **Svelte `vite build` warnings** | Treat selected `a11y_*` as errors via `onwarn` when noise is low. |
| **E2E in CI** | Add workflow when DB + env + secrets are available in CI. |

---

## 4. Documentation

| Task | Notes |
|------|--------|
| **Keep `guides/` vs `development/` split** | Operators: [`../guides/README.md`](../guides/README.md). Contributors: [`README.md`](./README.md). |
| **Refresh baselines** | Re-run `pnpm lint`, `pnpm build`, note counts in `ENGINEERING_QUALITY_TASKS.md` if you do a new quality pass. |

---

*This file is a living pointer; detailed specs stay in the linked roadmaps.*
