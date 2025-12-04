# SvelteKit Migration Plan

This document outlines the migration from Next.js to SvelteKit.

## Overview

Migrating the frontend from Next.js 16 (React 19) to SvelteKit 2 (Svelte 5).

## Migration Strategy

### Phase 1: Setup & Configuration ✅
- [x] Install SvelteKit and dependencies
- [x] Create vite.config.ts
- [x] Create svelte.config.js
- [x] Set up basic routing structure
- [ ] Configure Tailwind CSS for SvelteKit
- [ ] Set up TypeScript configuration
- [ ] Configure API proxying to NestJS backend

### Phase 2: Core Infrastructure
- [ ] Migrate authentication system (NextAuth.js → SvelteKit compatible)
- [ ] Set up internationalization (i18next → SvelteKit i18n)
- [ ] Migrate context providers to Svelte stores
- [ ] Set up error handling and error boundaries
- [ ] Configure environment variables

### Phase 3: Routing Migration
- [ ] Migrate App Router structure to SvelteKit routes
- [ ] Convert page components to SvelteKit pages
- [ ] Migrate layout components
- [ ] Set up dynamic routes ([alias], [id], etc.)
- [ ] Migrate route groups and nested layouts

### Phase 4: Component Migration
- [ ] Convert React components to Svelte components
- [ ] Migrate hooks to Svelte reactivity
- [ ] Convert useState → Svelte reactive variables
- [ ] Convert useEffect → Svelte reactive statements
- [ ] Migrate component props and events

### Phase 5: Data Fetching
- [ ] Convert API routes to SvelteKit load functions
- [ ] Migrate server-side data fetching
- [ ] Set up form actions for mutations
- [ ] Migrate React Query to SvelteKit stores/load functions

### Phase 6: Styling & Assets
- [ ] Configure Tailwind CSS for SvelteKit
- [ ] Migrate SCSS modules
- [ ] Update image handling (Next.js Image → SvelteKit)
- [ ] Migrate static assets

### Phase 7: Features Migration
- [ ] Migrate templates (default, modern, fancy, minimal)
- [ ] Migrate admin pages
- [ ] Migrate owner pages
- [ ] Migrate public pages (albums, photos, search)
- [ ] Migrate photo upload functionality
- [ ] Migrate face recognition features

### Phase 8: Testing & Cleanup
- [ ] Remove Next.js dependencies
- [ ] Update build scripts
- [ ] Update deployment configuration
- [ ] Test all functionality
- [ ] Update documentation

## Key Differences: Next.js vs SvelteKit

### Routing
- **Next.js**: App Router with `page.tsx`, `layout.tsx`
- **SvelteKit**: File-based routing with `+page.svelte`, `+layout.svelte`

### Data Fetching
- **Next.js**: `fetch()` in components, API routes
- **SvelteKit**: `+page.server.ts` load functions, form actions

### Components
- **Next.js**: React components (.tsx)
- **SvelteKit**: Svelte components (.svelte)

### State Management
- **Next.js**: useState, useEffect, Context API
- **SvelteKit**: Reactive variables, stores, runes

### Styling
- **Next.js**: CSS Modules, Tailwind, global CSS
- **SvelteKit**: Scoped CSS, Tailwind, global CSS

## File Structure Mapping

### Next.js → SvelteKit

```
src/app/page.tsx              → src/routes/+page.svelte
src/app/layout.tsx            → src/routes/+layout.svelte
src/app/[alias]/page.tsx      → src/routes/[alias]/+page.svelte
src/app/admin/page.tsx        → src/routes/admin/+page.svelte
src/app/admin/layout.tsx      → src/routes/admin/+layout.svelte
src/components/               → src/lib/components/
src/hooks/                    → src/lib/stores/ or inline reactivity
src/contexts/                 → src/lib/stores/
```

## Dependencies to Migrate

### Keep
- Tailwind CSS
- TypeScript
- MongoDB/Mongoose (for server-side)
- Authentication libraries (adapt for SvelteKit)

### Replace
- Next.js → SvelteKit
- React → Svelte
- React DOM → Svelte
- NextAuth.js → SvelteKit compatible auth
- next-i18next → SvelteKit i18n solution

### Evaluate
- React Query → SvelteKit stores or TanStack Query Svelte
- Radix UI → Svelte equivalents or headless UI
- Framer Motion → Svelte transitions/animations
- React Hook Form → Svelte form actions

## Notes

- Keep Next.js code in `src/app/` until migration is complete
- Gradually migrate components one by one
- Test each migration step before proceeding
- Maintain API compatibility with NestJS backend

