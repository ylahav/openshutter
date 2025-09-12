# OpenShutter Documentation

Welcome to the OpenShutter documentation. This comprehensive guide covers all aspects of the photo gallery management system.

## 📚 Documentation Overview

### Core Documentation
- [System Requirements Document (PRD)](./SYSTEM_PRD.md) - System requirements and business logic
- [Functional Specification](./functional-spec.md) - Detailed technical specifications
- [Access Control System](./access-control.md) - Album permissions and user access management
- [Deployment Guide](./deploy.md) - Production deployment instructions
- [Docker Deployment Guide](./docker-deployment.md) - Docker containerization and deployment
- [PM2 Deployment Guide](./pm2-deployment.md) - PM2 process manager deployment
- [Admin Setup Guide](./ADMIN_SETUP.md) - Initial admin configuration

### Quick Start
1. **Installation**: Follow the main [README.md](../README.md) for setup instructions
2. **Admin Access**: Use the credentials in [ADMIN_SETUP.md](./ADMIN_SETUP.md)
3. **Configuration**: Set up storage providers via the admin dashboard
4. **Deployment**: Follow the [deployment guide](./deploy.md) for production setup, or use [Docker](./docker-deployment.md) or [PM2](./pm2-deployment.md) deployment options

### Theming and Templates
- [Creating a New Template](./templates.md) - How to build and register a custom template

## 🎯 Current Features

### Core Functionality
- **Multi-Storage Support**: Google Drive, AWS S3, and local storage
- **Album Management**: Hierarchical albums with advanced privacy controls
- **Access Control System**: Granular permissions for albums (public, private, user/group-specific)
- **Cover Photo Selection**: Admin interface for selecting album cover photos
- **Photo Management**: Upload, organize, and display photos with metadata
- **Multi-Language Support**: Internationalization with RTL support
- **Template System**: Customizable gallery templates
- **Admin Dashboard**: Comprehensive administrative interface

### Advanced Features
- **EXIF Data Extraction**: Automatic photo metadata processing
- **Rich Text Editor**: Tiptap-based editor with link support
- **Responsive Design**: Mobile-first responsive layouts with masonry grids
- **User Authentication**: NextAuth.js integration with role-based access
- **Real-time Updates**: Live photo uploads and management
- **UI Improvements**: Masonry layouts, role-based redirects, visual indicators

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes, MongoDB
- **Storage**: Google Drive API, AWS S3, Local Storage
- **Authentication**: NextAuth.js
- **Rich Text**: Tiptap Editor with extensions

### Project Structure
```
src/
├── app/                 # Next.js app directory
│   ├── admin/          # Admin-only pages
│   ├── albums/         # Album management
│   ├── photos/         # Photo management
│   └── api/            # API routes
├── components/         # Reusable components
│   ├── ui/            # UI component library
│   └── [feature]/     # Feature-specific components
├── lib/               # Utility libraries
├── services/          # Business logic
├── types/             # TypeScript definitions
└── hooks/             # Custom React hooks
```

## 🔧 Configuration

### Environment Variables
Key configuration options in `.env.local`:
- `MONGODB_URI`: Database connection string
- `NEXTAUTH_SECRET`: Authentication secret
- `GOOGLE_CLIENT_ID/SECRET`: Google Drive integration
- `AWS_ACCESS_KEY_ID/SECRET`: AWS S3 integration

### Storage Providers
- **Google Drive**: Cloud storage with API integration
- **AWS S3**: Scalable object storage
- **Local Storage**: File storage on server

## 🚀 Development

### Available Scripts
```bash
pnpm dev          # Development server (port 4000)
pnpm build        # Production build
pnpm start        # Production server
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
- **API Documentation**: Available in `/api` routes
- **Component Library**: Located in `src/components/ui/`
- **Type Definitions**: Available in `src/types/`

## 🆘 Support

For issues, questions, or contributions:
1. Check existing documentation
2. Review GitHub issues
3. Create new issue with detailed information
4. Follow contribution guidelines

---

*Last updated: September 2025*
