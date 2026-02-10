# SvelteKit Migration Plan

This document outlines the migration from Next.js to SvelteKit.

## Overview

Migrating the frontend from Next.js 16 (React 19) to SvelteKit 2 (Svelte 5).

## Migration Strategy

### Phase 1: Setup & Configuration
- [x] Install SvelteKit and dependencies
- [x] Create vite.config.ts, svelte.config.js
- [x] Set up basic routing structure
- [x] Configure Tailwind CSS, TypeScript, API proxying to NestJS backend

### Phase 2: Core Infrastructure
- [x] Migrate authentication; set up i18n; migrate context to Svelte stores; error handling; env vars

### Phase 3: Routing Migration
- [x] Migrate App Router to SvelteKit routes; dynamic routes ([alias], [id]); layouts

### Phase 4: Component Migration
- [x] Convert React components to Svelte; migrate hooks to Svelte reactivity

### Phase 5: Data Fetching
- [x] API routes to SvelteKit load functions; form actions; stores

### Phase 6–8: Styling, features, testing & cleanup
- See [SVELTEKIT_PROGRESS.md](./SVELTEKIT_PROGRESS.md) for current status.

## Key Differences: Next.js vs SvelteKit

- **Routing**: Next.js App Router → SvelteKit file-based (`+page.svelte`, `+layout.svelte`).
- **Data**: Next.js fetch/API routes → SvelteKit `+page.server.ts` load functions and form actions.
- **Components**: React (.tsx) → Svelte (.svelte).
- **State**: useState/Context → Svelte reactive variables and stores.

## File structure mapping

- `src/app/page.tsx` → `src/routes/+page.svelte`
- `src/app/admin/page.tsx` → `src/routes/admin/+page.svelte`
- `src/components/` → `src/lib/components/`
- `src/contexts/`, `src/hooks/` → `src/lib/stores/` or inline reactivity

## Notes

- Maintain API compatibility with NestJS backend.
- Test each migration step before proceeding.
