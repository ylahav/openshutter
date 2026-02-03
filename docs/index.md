# OpenShutter Documentation

Welcome to the OpenShutter documentation. This comprehensive guide covers all aspects of the photo gallery management system.

**All project documentation lives in the `docs/` folder.** Exceptions: [README.md](../README.md) and [CHANGELOG.md](../CHANGELOG.md) remain at the repository root.

## 📚 Documentation Overview

### Core Documentation
- [System Requirements Document (PRD)](./SYSTEM_PRD.md) - System requirements and business logic
- [Functional Specification](./functional-spec.md) - Detailed technical specifications
- [Access Control System](./access-control.md) - Album permissions and user access management
- [Owner Dashboard](./owner-dashboard.md) - Owner role dashboard and album management
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
- [Performance Improvements](./PERFORMANCE_IMPROVEMENTS.md) - Query optimizations and recommended indexes
- [Type System](./TYPE_SYSTEM.md) - Centralized types (backend and frontend)
- [SvelteKit Migration](./SVELTEKIT_MIGRATION.md) - Next.js to SvelteKit migration plan
- [SvelteKit Progress](./SVELTEKIT_PROGRESS.md) - Migration status and progress

### Other
- [Security Policy](./SECURITY.md) - Supported versions and reporting vulnerabilities

### Quick Start
1. **Installation**: Follow the main [README.md](../README.md) for setup instructions
2. **Admin Access**: Use the credentials in [ADMIN_SETUP.md](./ADMIN_SETUP.md)
3. **Configuration**: Set up storage providers via the admin dashboard
4. **Deployment**: Follow the [server deployment guide](./SERVER_DEPLOYMENT.md) for production setup with PM2

### Theming and Templates
- [Creating a New Template](./templates.md) - How to build and register a custom template

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
- **Frontend**: SvelteKit 2, Svelte 5, TypeScript (migrating from Next.js 15/React 19)
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
├── app/                # Next.js code (legacy, being migrated)
│   ├── admin/          # Next.js admin pages (to be removed)
│   ├── components/     # React components (to be migrated)
│   └── api/            # Next.js API routes (legacy)
└── templates/          # Gallery templates
```

**Migration Status**: The frontend is migrating from Next.js to SvelteKit. Most admin routes and core infrastructure have been migrated. See [SVELTEKIT_PROGRESS.md](./SVELTEKIT_PROGRESS.md) for detailed status.

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
pnpm dev          # SvelteKit development server (port 4000)
pnpm dev:next     # Next.js development server (legacy, during migration)
pnpm build        # Build SvelteKit for production
pnpm build:next   # Build Next.js for production (legacy)
pnpm start        # Production server (port 4000)
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
- **SvelteKit Progress**: [SVELTEKIT_PROGRESS.md](./SVELTEKIT_PROGRESS.md) - Migration status and progress
- **API Documentation**: Backend API available at `http://localhost:5000/api`
- **Component Library**: Located in `src/lib/components/` (Svelte) and `src/components/ui/` (React, legacy)
- **Type Definitions**: Available in `src/lib/types/`

## 🆘 Support

For issues, questions, or contributions:
1. Check existing documentation
2. Review GitHub issues
3. Create new issue with detailed information
4. Follow contribution guidelines

---

*Last updated: January 2025*

**Note**: The frontend is currently migrating from Next.js to SvelteKit. Most admin routes have been migrated. Legacy Next.js code remains in `src/app/` during the migration period.
