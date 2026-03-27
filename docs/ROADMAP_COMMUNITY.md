# Community-First Roadmap

This roadmap prioritizes features that drive adoption in photographer communities and improve OpenShutter visibility as an open source project.

## Goals

- Increase first-week activation for new users.
- Improve "wow" factor in screenshots, demos, and social shares.
- Make customization easy so contributors can extend and share their own packs.
- Keep a parallel foundation track for enterprise readiness without blocking community growth.

## Prioritization Principles

- Lead with visible value users can feel in minutes.
- Prefer features that produce shareable outcomes (beautiful galleries, mixed media, polished UX).
- Sequence work so each release has clear community-facing highlights.
- Keep implementation slices small enough for frequent OSS releases.

## Priority Tiers

### Tier 1: Adoption Drivers (Do First)

1. Site-wide templating system (template packs)
2. Video support MVP
3. Crop editing (quick polish win)

### Tier 2: Adoption Multipliers (Do Next)

1. Mobile experience upgrades (PWA-first), then native app decisions
2. Marketplace discoverability improvements for themes/integrations
3. Better showcase and starter content for new installs

### Tier 3: Enterprise and Scale Track (Parallel, Not Blocking)

1. SSO
2. Audit logs
3. Quotas
4. Multi-tenancy

## Release Themes

### Release Theme A: Make It Beautiful

- Ship template packs with strong visual identity.
- Add template switch UX and docs for quick customization.
- Provide a demo gallery that highlights style differences.

### Release Theme B: Make It Creator-Ready

- Ship video MVP in albums and lightbox.
- Add crop flow for common editing needs.
- Polish upload and playback experience on mobile.

### Release Theme C: Make It Pro-Ready

- Add enterprise foundations behind feature flags.
- Preserve simple defaults for small teams and photographers.

## 6-Sprint Proposal (2 weeks each)

### Sprint 1

- Templating architecture baseline
- Template pack contract and loader
- 1 production-ready pack migration

### Sprint 2

- 2-3 polished packs
- Admin template switcher and per-pack options
- Docs and starter pack guide

### Sprint 3

- Crop MVP (single-photo edit)
- Template polish from community feedback
- Demo content and screenshots refresh

### Sprint 4

- Video data model + upload backend
- Video metadata extraction
- Basic frontend video card and player integration

### Sprint 5

- Album/lightbox mixed media UX
- Video processing jobs (thumbnail, optional transcode hook)
- Permissions, filters, and search support for video

### Sprint 6

- Stabilization, performance, and QA hardening
- Community docs, migration notes, and release campaign assets

## Success Metrics

- New community installs per month
- Time to first customized theme
- Number of shared screenshots/demo links
- GitHub stars, forks, and issue/PR activity
- Percentage of active installs using template packs
- Percentage of albums using video assets (post-video release)

## Risks and Mitigations

- Scope growth in templating architecture
  - Mitigation: strict pack contract and MVP boundaries.
- Video pipeline complexity
  - Mitigation: MVP without mandatory transcoding; add optional jobs later.
- Fragmented priorities between OSS and enterprise
  - Mitigation: two-track board with explicit non-blocking policy.

## Dependencies

- Existing template docs and theme systems in `docs/templates.md`, `docs/THEME_PAGE_BUILDER_DESIGN.md`, and `docs/THEME_SEEDING.md`
- Existing phase tracking in `docs/PHASE_4_WORKFLOW.md` and `README.md`

## Related Task Lists

- [Templating task list](./TEMPLATING_TASKS.md)
- [Video task list](./VIDEO_TASKS.md)
