# Templating Task List

This checklist is focused on adoption-first delivery: fast visual impact, easy customization, and contributor-friendly extension points.

## Milestone 1: Foundation (High Priority)

- [ ] Define template pack contract:
  - Required components: `Layout`, `Home`, `AlbumsList`, `Album`, `About`, `PageBuilderRenderer`
  - Optional components and fallback behavior
  - `config.ts` schema for options, defaults, and validation
- [ ] Build template registry and dynamic resolver
- [ ] Add runtime safety and fallback to default pack when a pack fails to load
- [ ] Add feature flag for new pack loader during rollout
- [ ] Add developer-facing error messages for invalid packs

## Milestone 2: Admin Experience (High Priority)

- [ ] Add Site Config section for active template selection
- [ ] Add per-template option editor from `config.ts`
- [ ] Add preview mode (quick switch + safe save)
- [ ] Add reset-to-default per-template option controls
- [ ] Add permissions and audit events for template changes

## Milestone 3: Initial Pack Set (High Priority)

- [ ] Ship at least 3 polished built-in packs
- [ ] Ensure each pack supports:
  - Home
  - Albums list
  - Album view
  - About
  - Page Builder pages
- [ ] Validate light/dark theme behavior per pack
- [ ] Validate RTL and i18n behavior per pack

## Milestone 4: Developer Experience (Medium Priority)

- [ ] Write "Create a template pack" guide with scaffold steps
- [ ] Add pack example project with comments and best practices
- [ ] Add lint/type checks for pack contract compliance
- [ ] Add snapshot test coverage for core layouts
- [ ] Add migration notes for legacy templates

## Milestone 5: Community Activation (Medium Priority)

- [ ] Create showcase page/screenshots for built-in packs
- [ ] Add "submit your template pack" contribution guide
- [ ] Add template changelog section in release notes
- [ ] Publish pack compatibility policy (versioning expectations)

## Technical Backlog (Detailed)

### Backend

- [ ] Persist selected pack and options in site config
- [ ] Validate incoming template config payloads
- [ ] Add API response shape for template metadata/options

### Frontend

- [ ] Resolve active pack in root layout/server load
- [ ] Route component mapping by active pack
- [ ] Fallback rendering strategy on missing component
- [ ] Admin UI form renderer for typed template options
- [ ] Preview state management and unsaved changes guard

### Testing

- [ ] Unit tests for template resolver and option validation
- [ ] Integration tests for admin template switching flow
- [ ] E2E tests for route rendering across all built-in packs
- [ ] Visual regression checks for top pages per pack

## Acceptance Criteria (MVP)

- [ ] Admin can switch templates without code changes.
- [ ] At least 3 built-in packs render all required routes.
- [ ] Per-template options are editable and persisted.
- [ ] Fallback behavior prevents broken public pages.
- [ ] Docs allow contributors to create and register a new pack.
