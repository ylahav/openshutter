# OpenShutter Documentation

Welcome to the OpenShutter documentation. This comprehensive guide covers all aspects of the photo gallery management system.

**All project documentation lives in the `docs/` folder.** Exceptions: [README.md](../README.md), [LICENSE](../LICENSE), and [CHANGELOG.md](../CHANGELOG.md) remain at the repository root.

## 📚 Documentation Overview

### Core Documentation
- [System Requirements Document (PRD)](./SYSTEM_PRD.md) - System requirements and business logic
- [Functional Specification](./functional-spec.md) - Detailed technical specifications
- [Access Control System](./access-control.md) - Album permissions and user access management
- [Owner Dashboard](./owner-dashboard.md) - Owner role dashboard and album management (includes **Search insights** / tag-filter analytics on `/owner/analytics`)
- [Storage Configuration](./STORAGE.md) - Storage providers setup and management
- [Google Drive](./GOOGLE_DRIVE.md) - Google Drive auth (Service Account & OAuth), visible storage, token renewal
- [Server Deployment Guide](./SERVER_DEPLOYMENT.md) - Production deployment instructions with PM2
- [Admin Setup Guide](./ADMIN_SETUP.md) - Initial admin configuration
- [Translation Guide](./translation-guide.md) - Multi-language support and translation keys
- [Photo Upload Guide](./PHOTO_UPLOAD.md) - Photo upload features, duplicate detection, and bulk upload
- [Photo Metadata](./PHOTO_METADATA.md) - EXIF, IPTC/XMP, re-extract, display config
- [Upload Limits](./UPLOAD_LIMITS.md) - Size limits and configuration
- [Face Recognition Setup](./FACE_RECOGNITION_SETUP.md) - Face detection and matching

### Development & API
- [API Testing](./API_TESTING.md) - How to test NestJS API endpoints
- [Manual test: dedicated owner storage](./MANUAL_TEST_DEDICATED_STORAGE.md) - QA checklist (admin flags, owner dashboard card, `/owner/storage`); Playwright spec in [`e2e/`](../e2e/README.md)
- [Performance Improvements](./PERFORMANCE_IMPROVEMENTS.md) - Query optimizations and recommended indexes
- [Type System](./TYPE_SYSTEM.md) - Centralized types (backend and frontend)
- **Backend:** [Swagger/OpenAPI](../backend/SWAGGER_SETUP.md) - API docs setup and access

### Other
- [Security Policy](./SECURITY.md) - Supported versions and reporting vulnerabilities

### Phase workflows & design (reference)
- [Phase 3 Workflow](./PHASE_3_WORKFLOW.md) - Import/sync, AI tagging, analytics, API marketplace, smart tags
- [Phase 4 Workflow](./PHASE_4_WORKFLOW.md) - White-label, integration marketplace, collaboration, etc.
- [Community-first roadmap](./ROADMAP_COMMUNITY.md) - Adoption-focused priorities and release themes
- [Templating task list](./TEMPLATING_TASKS.md) - High-priority template pack implementation checklist
- [Video support task list](./VIDEO_TASKS.md) - Video MVP and expansion checklist
- [Collaboration Phase 4 Stage 3](./COLLABORATION_PHASE4_STAGE3.md) - Album collaboration (comments, tasks, notifications, v1)
- [Tag optimization Phase 4 Stage 4](./TAG_OPTIMIZATION_PHASE4.md) - ML signals, related tags, feedback pipeline
- [Import/Sync Design](./IMPORT_SYNC_DESIGN.md) - Export/import packages, storage migration
- [AI Tagging Design](./AI_TAGGING_DESIGN.md) - AI-powered tag suggestions
- [Advanced Analytics Design](./ADVANCED_ANALYTICS_DESIGN.md) - Analytics dashboard and events
- [API Marketplace](./API_MARKETPLACE.md) - Public API, keys, developer portal, marketplace
- [Smart Tag Suggestions Design](./SMART_TAG_SUGGESTIONS_DESIGN.md) - Context-based tag suggestions
- [Marketplace Expansion Phase 4](./MARKETPLACE_EXPANSION_PHASE4.md) - Discovery and listing richness
- [White-Label Design](./WHITE_LABEL_DESIGN.md) - White-label install + per-owner custom domains (Phase 4; see `PHASE_4_WORKFLOW.md`)
- [White-label deploy runbook](./WHITE_LABEL_DEPLOY.md) - Env, TLS, owner domains, Solution 1 vs 2
- [Template Builder Scenario](./TEMPLATE_BUILDER_SCENARIO.md) - Page builder scenarios

### Quick Start
1. **Installation**: Follow the main [README.md](../README.md) for setup instructions
2. **Admin Access**: Use the credentials in [ADMIN_SETUP.md](./ADMIN_SETUP.md)
3. **Configuration**: Set up storage providers via the admin dashboard
4. **Deployment**: Follow the [server deployment guide](./SERVER_DEPLOYMENT.md) for production setup with PM2

### Theming and Templates
- [Creating a New Template](./templates.md) - How to build and register a custom template
- [Theme Page Builder Design](./THEME_PAGE_BUILDER_DESIGN.md) - Theme-based page modules, grid layout, and home page rendering
- [Module URL Parameters](./MODULE_URL_PARAMS.md) - How modules access route params (e.g. album alias)
- [Theme Seeding](./THEME_SEEDING.md) - Theme seeding for scripts and setup

### Archived
- [SvelteKit Migration Progress](./archive/SVELTEKIT_PROGRESS.md) - Migration completed; frontend is SvelteKit.
- [SvelteKit Migration](./archive/SVELTEKIT_MIGRATION.md) - Historical migration notes.
- [Code Review Summary](./archive/CODE_REVIEW.md) - One-time code review snapshot from March 2025.
- [Template Builder Scenario](./archive/TEMPLATE_BUILDER_SCENARIO.md) - Earlier scenario/flow draft archived after roadmap/task-list split.

## 🎯 Current Features

### Core Functionality
- **Multi-Storage Support**: Google Drive, AWS S3, Backblaze B2, Wasabi, and local storage
- **Storage Management**: Admin dashboard for configuring storage providers with visual tree browsing
- **Album Management**: Hierarchical albums with advanced privacy controls
- **Advanced Access Control**: Granular permissions for albums (public, private, user/group-specific)
- **Owner Dashboard**: Focused interface for album owners to manage their collections (albums and photo upload/edit/delete at `/owner/albums`, `/owner/photos/[id]/edit`)
- **Cover Photo Selection**: Admin interface for selecting album cover photos
- **Photo Management**: Upload, organize, and display photos with metadata
- **Advanced Photo Upload**: Duplicate detection, bulk local folder upload, and detailed upload reports
- **Multi-Language Support**: Internationalization with RTL support
- **Template System**: Customizable gallery templates
- **Admin Dashboard**: Comprehensive administrative interface
- **Profile Management**: User profile editing and password changes
- **Role-Based Access**: Admin, Owner, and Guest roles with different capabilities
- **About Page**: Dedicated landing page that introduces openShutter and its key features

### Advanced Features
- **EXIF Data Extraction**: Automatic photo metadata processing
- **Rich Text Editor**: Tiptap-based editor with link support
- **Responsive Design**: Mobile-first responsive layouts with masonry grids
- **User Authentication**: JWT-based authentication with role-based access
- **Real-time Updates**: Live photo uploads and management
- **UI Improvements**: Masonry layouts, role-based redirects, visual indicators

## 🏗️ Architecture

### Tech Stack
- **Frontend**: SvelteKit 2, Svelte 5, TypeScript (data via NestJS API; no direct MongoDB/Mongoose in the frontend)
- **Styling**: Tailwind CSS, Svelte transitions
- **Backend**: NestJS API (port 5000), MongoDB
- **Storage**: Google Drive API, AWS S3, Backblaze B2, Wasabi, Local Storage
- **Authentication**: JWT-based authentication (SvelteKit compatible)
- **Rich Text**: Tiptap Editor with extensions

### Project Structure
```
frontend/src/
├── routes/             # SvelteKit routes (migrated)
│   ├── admin/          # Admin pages (migrated to SvelteKit)
│   │   ├── albums/     # Album management
│   │   ├── photos/     # Photo management
│   │   ├── storage/    # Storage settings
│   │   ├── templates/  # Template customization
│   │   └── users/      # User management
│   ├── albums/         # Public album pages (migrated)
│   ├── auth/           # Authentication routes
│   └── +layout.svelte  # Root layout
├── lib/                # SvelteKit library code
│   ├── components/     # Svelte components (migrated)
│   ├── stores/         # Svelte stores (language, siteConfig)
│   ├── types/          # TypeScript definitions
│   └── utils/          # Utility functions
└── templates/          # Gallery templates
```

**Status**: The frontend is built on SvelteKit under `frontend/src/routes` and `frontend/src/lib`.

## 🔧 Configuration

### Environment Variables
Key configuration options in `.env.local`:
- `MONGODB_URI`: Database connection string
- `AUTH_JWT_SECRET`: Authentication secret (JWT)
- `BACKEND_URL`: Backend API URL (default: http://localhost:5000)
- `GOOGLE_CLIENT_ID/SECRET`: Google Drive integration
- `AWS_ACCESS_KEY_ID/SECRET`: AWS S3 integration

### Storage Providers
- **Google Drive**: Cloud storage with API integration
- **AWS S3**: Scalable object storage
- **Backblaze B2**: Cost-effective S3-compatible storage
- **Wasabi**: High-performance S3-compatible storage
- **Local Storage**: File storage on server

## 🚀 Development

### Available Scripts
```bash
pnpm dev          # Full stack dev: backend + SvelteKit frontend
pnpm build        # Build backend + frontend
pnpm start        # Start production servers
pnpm lint         # Code linting
pnpm type-check   # TypeScript checking
```

### Development Workflow
1. Clone repository and install dependencies
2. Set up environment variables
3. Configure storage providers
4. Run development server
5. Access admin dashboard for configuration

## 📖 Additional Resources

- **Main README**: [../README.md](../README.md) - Complete setup and usage guide
- **API Documentation**: Backend API available at `http://localhost:5000/api`
- **Component Library**: Located in `src/lib/components/` (Svelte)
- **Type Definitions**: `frontend/src/lib/types/` and `frontend/src/types/`

## 🆘 Support

For issues, questions, or contributions:
1. Check existing documentation
2. Review GitHub issues
3. Create new issue with detailed information
4. Follow contribution guidelines

---

*Last updated: March 2025*

**Note**: The frontend uses SvelteKit throughout; all new work should target Svelte routes and Svelte components.
