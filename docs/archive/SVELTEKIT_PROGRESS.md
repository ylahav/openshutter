# SvelteKit Migration Progress

## Completed

### Phase 1: Setup & Configuration
- [x] Installed SvelteKit and core dependencies
- [x] Created vite.config.ts with API proxying to NestJS backend
- [x] Created svelte.config.js with Node adapter
- [x] Set up TypeScript, Tailwind CSS, PostCSS, pnpm workspace, root deployment scripts

### Phase 2: Core Infrastructure
- [x] src/lib/ structure; language, site config, auth stores; multiLang utils; types in src/lib/types/

### Phase 3–4: Components and pages
- [x] 12+ Svelte components (MultiLangInput, PhotoLightbox, Header, etc.)
- [x] 42 pages migrated to SvelteKit routes (admin, owner, albums, login, search, etc.)

### Phase 5: API routes
- [x] 65 API routes migrated to routes/api/**/+server.ts (admin, albums, photos, auth, storage, etc.)

### Phase 6: Cleanup
- [x] Removed Next.js config and scripts; root pnpm dev/build/start; monorepo deployment scripts

## In progress / next steps

- Migrate any remaining pages and components
- Remove remaining Next.js/React code and dependencies
- Final testing and documentation

## Key files

- **Stores**: `frontend/src/lib/stores/language.ts`, `siteConfig.ts`, `auth.ts`
- **Config**: `frontend/vite.config.ts`, `svelte.config.js`; root `package.json`
- **Deployment**: `scripts/build-for-production.sh`, `scripts/deploy-to-server.sh`

## Notes

- Monorepo: pnpm workspaces with `frontend/` and `backend/`
- API proxying: `/api/*` → `http://localhost:5000`
- Svelte 5 runes and reactivity; multi-language support in place
