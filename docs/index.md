# OpenShutter documentation

Project docs live in **`docs/`**. The root [README.md](../README.md), [LICENSE](../LICENSE), and [CHANGELOG.md](../CHANGELOG.md) stay at the repository root.

## Quick start

1. Setup: [README.md](../README.md)  
2. Admin bootstrap: [ADMIN_SETUP.md](./ADMIN_SETUP.md)  
3. Production: [SERVER_DEPLOYMENT.md](./SERVER_DEPLOYMENT.md)  

## Core product & operations

| Topic | Doc |
|--------|-----|
| Requirements / scope | [SYSTEM_PRD.md](./SYSTEM_PRD.md), [functional-spec.md](./functional-spec.md) |
| Access control | [access-control.md](./access-control.md) |
| Owner dashboard | [owner-dashboard.md](./owner-dashboard.md) |
| Storage | [STORAGE.md](./STORAGE.md), [GOOGLE_DRIVE.md](./GOOGLE_DRIVE.md) |
| Security | [SECURITY.md](./SECURITY.md) |
| Translations | [translation-guide.md](./translation-guide.md) |
| Types | [TYPE_SYSTEM.md](./TYPE_SYSTEM.md) |

## Photos & uploads

- [PHOTO_UPLOAD.md](./PHOTO_UPLOAD.md) — uploads, duplicates, bulk upload, **upload size limits**, **metadata / EXIF / IPTC/XMP** (single guide)

## Templates, themes, page builder

- [TEMPLATING_REQUIREMENTS.md](./TEMPLATING_REQUIREMENTS.md) — canonical model; **§8** = create a built-in template pack  
- [TEMPLATING_TASKS.md](./TEMPLATING_TASKS.md) — implementation checklist  
- [TEMPLATE_CONTROL.md](./TEMPLATE_CONTROL.md) — operator guide (Admin)  
- [UI_COMPONENT_MODULES.md](./UI_COMPONENT_MODULES.md) — module authoring  
- [THEMING.md](./THEMING.md) — page builder overview + theme seeding  
- [MODULE_URL_PARAMS.md](./MODULE_URL_PARAMS.md) — route params for modules  

## Roadmaps & phased delivery

- [ROADMAP_COMMUNITY.md](./ROADMAP_COMMUNITY.md) — community-first priorities  
- [PHASE_3_WORKFLOW.md](./PHASE_3_WORKFLOW.md) — Phase 3 (complete)  
- [PHASE_4_WORKFLOW.md](./PHASE_4_WORKFLOW.md) — Phase 4 (includes white-label, marketplace, collaboration, tag optimization — **supplementary detail** at end of file)  
- [WHITE_LABEL.md](./WHITE_LABEL.md) — white-label design + deployment runbook  
- [ADMIN_UI_ROADMAP.md](./ADMIN_UI_ROADMAP.md) — admin shell UX  
- [VIDEO_TASKS.md](./VIDEO_TASKS.md) — video checklist  

## Design references (deep dives)

[AI_TAGGING_DESIGN.md](./AI_TAGGING_DESIGN.md) · [ADVANCED_ANALYTICS_DESIGN.md](./ADVANCED_ANALYTICS_DESIGN.md) · [API_MARKETPLACE.md](./API_MARKETPLACE.md) · [IMPORT_SYNC_DESIGN.md](./IMPORT_SYNC_DESIGN.md) · [SMART_TAG_SUGGESTIONS_DESIGN.md](./SMART_TAG_SUGGESTIONS_DESIGN.md) · [WHITE_LABEL.md](./WHITE_LABEL.md) (same file as product white-label)

## Development & quality

- CI: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)  
- [ENGINEERING_QUALITY_TASKS.md](./ENGINEERING_QUALITY_TASKS.md) — engineering hygiene checklist  
- [API_TESTING.md](./API_TESTING.md) · [PERFORMANCE_IMPROVEMENTS.md](./PERFORMANCE_IMPROVEMENTS.md)  
- Backend Swagger: [../backend/SWAGGER_SETUP.md](../backend/SWAGGER_SETUP.md)  
- E2E: [../e2e/README.md](../e2e/README.md) · [MANUAL_TEST_DEDICATED_STORAGE.md](./MANUAL_TEST_DEDICATED_STORAGE.md)  

## Feature-specific setup

[FACE_RECOGNITION_SETUP.md](./FACE_RECOGNITION_SETUP.md)

---

*Index last updated: 2026-04 — consolidated duplicate docs; see git history for retired filenames.*
