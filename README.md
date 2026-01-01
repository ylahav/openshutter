# OpenShutter 📸

A comprehensive photo gallery management system with multi-storage support, advanced organization features, and beautiful presentations.

## ✨ Features

- **Multi-Storage Support**: Google Drive, AWS S3, Backblaze B2, Wasabi, and local storage
- **Smart Tagging System**: Organize photos with intelligent tags and dynamic collections
- **Advanced Search**: Comprehensive search across photos, albums, people, and locations
- **People Management**: Tag and organize photos by people with multi-language support
- **Face Recognition**: Detect faces in photos, match them to known people, and auto-tag photos
- **Location Management**: Geospatial location tracking with coordinates and categories
- **Album Management**: Hierarchical albums with advanced privacy controls
- **Advanced Access Control**: Granular permissions for albums (public, private, user/group-specific)
- **Owner Dashboard**: Dedicated interface for album owners to manage their collections
- **Cover Photo Selection**: Admin interface for selecting album cover photos
- **Batch Operations**: Upload and manage hundreds of photos efficiently
- **Bulk Photo Management**: Apply tags, locations, and metadata to multiple photos
- **Multi-Language Support**: Full internationalization (i18n) with RTL support, reactive translation system, and comprehensive language coverage
- **Responsive Design**: Beautiful galleries for all devices with masonry layouts
- **Mobile-First PWA**: Progressive Web App with offline capabilities and mobile optimization
- **Touch-Optimized Interface**: Mobile navigation, photo upload, and search with gesture support
- **Real-time Updates**: Live photo uploads and collaborative features
- **Role-Based Access**: Admin, Owner, and Guest roles with different capabilities
- **Storage Management**: Configure and manage multiple storage providers through admin interface
- **Profile Management**: Users can edit their profiles and change passwords
- **Template Customization**: Customizable gallery templates and themes
- **Blog Categories Management**: Create and manage blog categories with multi-language support
- **Content Protection**: Advanced right-click and developer tools protection with smart exceptions
- **Security Features**: Multi-layer content protection with customizable warnings
- **Face Recognition**: AI-powered face detection and recognition with automatic people tagging

## 🚀 Tech Stack

- **Frontend**: SvelteKit 2, Svelte 5, TypeScript, Tailwind CSS (migrating from Next.js 15/React 19)
- **Backend**: Node.js, NestJS, Mongoose
- **Database**: MongoDB
- **Storage**: Google Drive API, AWS S3, Backblaze B2, Wasabi, Local Storage
- **Authentication**: NextAuth.js (being adapted for SvelteKit)
- **Rich Text**: Tiptap Editor
- **State Management**: Svelte stores and reactivity (migrating from React Query)

## 📱 Mobile Features

- **Progressive Web App (PWA)**: Install on mobile devices with native app experience
- **Offline Support**: View cached photos and albums without internet connection
- **Touch Navigation**: Swipe gestures, pinch-to-zoom, and touch-friendly controls
- **Mobile Upload**: Direct camera integration for photo capture and upload
- **Mobile Search**: Touch-optimized search with filters and gesture navigation
- **Responsive Gallery**: Masonry layouts optimized for mobile screens
- **Mobile Shortcuts**: Quick access to mobile-optimized features

## 🔒 Content Protection

- **Right-Click Protection**: Disables context menu while preserving functionality in text editors
- **Developer Tools Blocking**: Prevents F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U shortcuts
- **Content Security**: Blocks Ctrl+S (save page) and drag-and-drop of images
- **Smart Exceptions**: Allows right-click in text editors (ProseMirror, Quill, TipTap)
- **Configurable Warnings**: Customizable warning messages for blocked actions
- **Multi-Layer Protection**: CSS and JavaScript-based content protection
- **Accessibility Preserved**: Maintains legitimate user interactions and accessibility

## 📋 Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- MongoDB instance
- Google Cloud Platform account (for Google Drive integration)
- AWS account (for S3 integration, optional)

## 🛠️ Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd openshutter
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/openshutter
   MONGODB_DB=openshutter
   
   # Authentication Configuration (SvelteKit)
   AUTH_JWT_SECRET=your_jwt_secret
   
   # Application Configuration
   NODE_ENV=development
   BACKEND_URL=http://localhost:5000
   ```

4. **Set up MongoDB**
   - Install MongoDB locally or use MongoDB Atlas
   - Create a database named `openshutter`
   - Ensure the connection string is correct in `.env.local`

## 🔐 Initial Admin Access

**⚠️ IMPORTANT: Change these credentials after first login!**

- **Email**: `admin@openshutter.com`
- **Password**: `admin123!`
- **Role**: System Administrator

For detailed admin setup instructions, see [docs/ADMIN_SETUP.md](docs/ADMIN_SETUP.md).

## 🚀 Development

1. **Start the development server**
   ```bash
   pnpm dev
   ```

2. **Open your browser**
   Navigate to [http://localhost:4000](http://localhost:4000)

3. **Available scripts**
   ```bash
   pnpm dev          # Start SvelteKit development server on port 4000
   pnpm dev:next     # Start Next.js development server (legacy, during migration)
   pnpm build        # Build SvelteKit for production
   pnpm build:next   # Build Next.js for production (legacy)
   pnpm start        # Start production server on port 4000
   pnpm lint         # Run ESLint
   pnpm type-check   # Run TypeScript type checking
   ```

## 🚀 Production Deployment

For production deployment, see the comprehensive guide: [docs/SERVER_DEPLOYMENT.md](docs/SERVER_DEPLOYMENT.md)

### Quick Deployment Steps

1. **Build production package**
   ```bash
   pnpm build:prod
   ```

2. **Deploy to server**
   ```bash
   # Copy to server
   scp openshutter-deployment.zip user@your-server:/opt/openshutter/
   
   # On server: Extract, install dependencies, and start with PM2
   ssh user@your-server
   cd /opt/openshutter
   unzip openshutter-deployment.zip
   cd openshutter
   chmod +x build.sh start.sh
   ./build.sh
   pm2 start backend/dist/main.js --name openshutter-backend
   cd frontend && PORT=4000 pm2 start build/index.js --name openshutter-frontend --env production --update-env && cd ..
   pm2 save
   ```

### Available Commands

```bash
pnpm build:prod      # Build production package
pnpm dev             # Start development server
pnpm build          # Build for production
pnpm start          # Start production server
```

For detailed deployment instructions, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## 📁 Project Structure

```
.
├── frontend/            # SvelteKit 2 frontend application (migrating from Next.js)
│   ├── src/
│   │   ├── routes/      # SvelteKit routes (+page.svelte, +layout.svelte)
│   │   │   ├── admin/   # Admin pages (migrated to SvelteKit)
│   │   │   ├── albums/  # Album pages (migrated to SvelteKit)
│   │   │   └── auth/    # Authentication routes
│   │   ├── lib/         # SvelteKit library code
│   │   │   ├── components/  # Svelte components
│   │   │   ├── stores/      # Svelte stores (language, siteConfig, i18n)
│   │   │   ├── types/       # TypeScript types
│   │   │   ├── utils/       # Utility functions
│   │   │   └── i18n/        # Translation files (en.json, he.json)
│   │   ├── app/         # Next.js code (legacy, being migrated)
│   │   │   ├── admin/   # Next.js admin pages (to be removed)
│   │   │   └── components/  # React components (to be migrated)
│   │   └── templates/   # Gallery templates
│   ├── public/          # Static assets
│   ├── svelte.config.js # SvelteKit configuration
│   ├── vite.config.ts   # Vite configuration & API proxy
│   └── package.json     # Frontend dependencies
│
├── backend/             # Node.js/NestJS backend application
│   ├── src/
│   │   ├── albums/      # Albums module (controller, service, module)
│   │   ├── photos/      # Photos module (controller, service, module)
│   │   ├── config/      # Configuration (NestJS ConfigModule)
│   │   ├── database/    # Database module (Mongoose integration)
│   │   ├── models/      # Mongoose models (Album, Photo, etc.)
│   │   ├── services/    # Business logic (Upload, Storage, etc.)
│   │   ├── common/      # Shared filters, interceptors, etc.
│   │   ├── app.module.ts # Root NestJS module
│   │   └── main.ts      # NestJS application entry point
│   └── package.json     # Backend dependencies
│
├── scripts/             # Build and deployment scripts
├── docs/                # Documentation files
├── storage/             # Local storage directory (if using local storage)
├── logs/                # Application logs
└── .gitignore           # Git ignore rules (excludes tmp/, build artifacts, etc.)
```

**Note**: The `tmp/` folder (if present) contains temporary build artifacts and can be safely deleted. It is excluded from version control via `.gitignore`.

**Migration Status**: The frontend is currently migrating from Next.js to SvelteKit. Most admin routes and core infrastructure have been migrated. See [SVELTEKIT_PROGRESS.md](frontend/SVELTEKIT_PROGRESS.md) for detailed migration status.

## 🔧 Configuration

### Storage Provider Setup

**All storage providers are configured through the admin dashboard at `/admin/storage` (admin access required).**

#### Google Drive Setup
1. **Enable Google Drive API**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to APIs & Services > Library
   - Search for "Google Drive API" and enable it

2. **Create OAuth 2.0 Credentials**
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Set application type to "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:4000/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production)

3. **Configure in Admin Dashboard**
   - Login as admin and go to `/admin/storage`
   - Enter your Google Drive credentials
   - Test the connection

#### AWS S3 Setup
1. **Create S3 Bucket**
   - Go to AWS S3 Console
   - Click "Create bucket"
   - Choose a unique bucket name
   - Select your preferred region

2. **Create IAM User**
   - Go to AWS IAM Console
   - Create a new user with programmatic access
   - Attach the `AmazonS3FullAccess` policy
   - Save the access key ID and secret access key

3. **Configure in Admin Dashboard**
   - Login as admin and go to `/admin/storage`
   - Enter your AWS S3 credentials
   - Test the connection

#### Local Storage Setup
1. **Configure in Admin Dashboard**
   - Login as admin and go to `/admin/storage`
   - Enable local storage provider
   - Set storage path and file size limits
   - Test the connection

### MongoDB Setup

1. **Local Installation**
   ```bash
   # macOS with Homebrew
   brew install mongodb-community
   brew services start mongodb-community
   
   # Ubuntu/Debian
   sudo apt update
   sudo apt install mongodb
   sudo systemctl start mongodb
   ```

2. **MongoDB Atlas (Cloud)**
   - Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a new cluster
   - Get connection string
   - Update `MONGODB_URI` in `.env.local`

## 🗂️ Storage Management

### Storage Settings Page

Access the storage configuration at `/admin/storage` (admin only):

- **Google Drive**: Configure OAuth credentials, folder ID, and connection testing
- **AWS S3**: Set up access keys, region, and bucket configuration  
- **Local Storage**: Configure storage path and file size limits
- **Provider Status**: Enable/disable storage providers
- **Connection Testing**: Test storage provider connectivity
- **Usage Monitoring**: View storage quotas and usage statistics

### Storage Provider Features

- **Google Drive**: Cloud storage with API integration
- **AWS S3**: Scalable object storage with CDN support
- **Local Storage**: File storage on local server
- **Multi-Provider**: Use multiple providers simultaneously
- **Database Configuration**: All storage settings stored in MongoDB
- **Admin Interface**: Easy configuration through web interface

## 🧪 Testing

```bash
# Run tests (when implemented)
pnpm test

# Run type checking
pnpm type-check

# Run linting
pnpm lint
```

## 📦 Deployment

OpenShutter supports multiple deployment options:

### ZIP-based (build-for-deployment.js)
- Create the ZIP locally:
  - Non-standalone: `pnpm run build:deploy`
  - Standalone: `STANDALONE=true pnpm run build:deploy`
- Then follow [docs/deploy.md](docs/deploy.md) for server steps.

### PM2 Deployment (Recommended)
Use PM2 to run the production server. See [docs/pm2-deployment.md](docs/pm2-deployment.md) for ZIP-based steps and PM2 commands.

### Server Deployment
See [docs/SERVER_DEPLOYMENT.md](docs/SERVER_DEPLOYMENT.md) for production deployment instructions using PM2.

### Vercel (Alternative)
1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Connect your GitHub repository
   - Add environment variables
   - Deploy automatically

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Project Wiki](link-to-wiki)
- **Issues**: [GitHub Issues](link-to-issues)
- **Discussions**: [GitHub Discussions](link-to-discussions)

## 🗺️ Roadmap

### Phase 1 (Current) ✅
- [x] Core album and photo management
- [x] Google Drive storage integration
- [x] Basic user authentication
- [x] Responsive web interface
- [x] Tag-based photo collections
- [x] Admin-only dashboard access
- [x] New home page structure with header, hero, albums, footer
- [x] Initial admin user setup
- [x] Storage settings page with multi-provider support
- [x] Rich text editor with link support (Tiptap)
- [x] EXIF data extraction and processing
- [x] Multi-language support with RTL
- [x] **Comprehensive i18n System** - Reactive translation store, aligned translation files, and full UI translation coverage
- [x] Template customization system
- [x] **Advanced Access Control System** - Granular album permissions
- [x] **Cover Photo Selection** - Admin interface for album covers
- [x] **UI Improvements** - Masonry layouts, role-based redirects
- [x] **Code Cleanup** - Translation file optimization
- [x] **Owner Dashboard** - Dedicated interface for album owners
- [x] **Profile Management** - User profile editing and password changes
- [x] **Role-Based Access Control** - Admin, Owner, and Guest roles
- [x] **Album Ownership Tracking** - Track who created each album
- [x] **Advanced Search System** - Comprehensive search across photos, albums, people, locations
- [x] **People Management** - Tag and organize photos by people with multi-language support
- [x] **Location Management** - Geospatial location tracking with coordinates and categories
- [x] **Enhanced Tag System** - Categories, usage tracking, and bulk operations
- [x] **Bulk Photo Operations** - Apply metadata to multiple photos simultaneously
- [x] **Face Recognition System** - AI-powered face detection, matching, and auto-tagging
- [x] **Photo Metadata Display** - Tags, people, and location shown in photo cards
- [x] **Popup Dialogs** - Replaced browser alerts with styled confirmation and notification dialogs

### Phase 2 (Next 6 months) *
- [ ] Advanced search and filtering
- [ ] Photo editing capabilities
- [ ] Social sharing features
- [ ] Mobile app development
- [ ] Enhanced tag analytics
- [ ] User role management
- [ ] Import/Sync functionality (currently disabled)
- [ ] Advanced photo metadata management

### Phase 3 (Next 12 months) *
- [ ] AI-powered photo tagging
- [ ] Advanced analytics
- [ ] API marketplace
- [ ] Enterprise features
- [ ] Smart tag suggestions

### Phase 4 (Next 18 months) *
- [ ] Video support
- [ ] Advanced collaboration features
- [ ] Integration marketplace
- [ ] White-label solutions

*Note: Roadmap phases and timelines are subject to change based on user feedback, technical requirements, and development priorities.

## 🔐 Access Control

### Album Access Levels
- **Public Albums**: Visible to all users (logged in or anonymous)
- **Private Albums**: Require authentication
  - **Open Private**: No specific restrictions - all logged-in users can access
  - **Restricted Private**: Limited to specific users or groups
    - `allowedUsers`: Array of specific user IDs
    - `allowedGroups`: Array of group aliases
    - User must be in `allowedUsers` OR belong to one of `allowedGroups`

### User Roles
- **Admin**: Full access to dashboard, storage settings, and administrative functions
- **Owner**: Access to own albums + public albums + albums with granted access
  - Can create, edit, and delete own albums
  - Can upload and manage photos in own albums
  - Can edit profile and change password
- **Guest**: Access to albums based on permissions

### Role-Based Redirects
- **Admin users**: Redirected to `/admin` after login
- **Owner users**: Redirected to `/owner` (owner dashboard) after login
- **Guest users**: Redirected to `/` (home page) after login

### Album Ownership
- Albums track who created them via `createdBy` field
- Owners can only edit/delete albums they created
- Admins can manage all albums regardless of ownership

---

**Made with ❤️ by the OpenShutter Team**
