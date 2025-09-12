# OpenShutter 📸

A comprehensive photo gallery management system with multi-storage support, advanced organization features, and beautiful presentations.

## ✨ Features

- **Multi-Storage Support**: Google Drive, AWS S3, and local storage
- **Smart Tagging System**: Organize photos with intelligent tags and dynamic collections
- **Album Management**: Hierarchical albums with privacy controls
- **Batch Operations**: Upload and manage hundreds of photos efficiently
- **Multi-Language Support**: Internationalization with RTL support
- **Responsive Design**: Beautiful galleries for all devices
- **Real-time Updates**: Live photo uploads and collaborative features
- **Admin-Only Dashboard**: Restricted access for administrative functions
- **Storage Management**: Configure and manage multiple storage providers

## 🚀 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes, MongoDB
- **Storage**: Google Drive API, AWS S3, Local Storage
- **Authentication**: NextAuth.js
- **Rich Text**: Tiptap Editor
- **State Management**: React Query

## 📋 Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- MongoDB instance
- Google Cloud Platform account (for Google Drive integration)
- AWS account (for S3 integration, optional)

## 🛠️ Installation

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
   
   # NextAuth Configuration
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:4000
   
   # Application Configuration
   NODE_ENV=development
   NEXT_PUBLIC_APP_URL=http://localhost:4000
   ```

4. **Set up MongoDB**
   - Install MongoDB locally or use MongoDB Atlas
   - Create a database named `openshutter`
   - Ensure the connection string is correct in `.env.local`

## 🔐 Initial Admin Access

**⚠️ IMPORTANT: Change these credentials after first login!**

- **Email**: `admin@openshutter.org`
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
   pnpm dev          # Start development server on port 4000
   pnpm build        # Build for production
   pnpm start        # Start production server on port 4000
   pnpm lint         # Run ESLint
   pnpm type-check   # Run TypeScript type checking
   ```

## 📁 Project Structure

```
src/
├── app/                 # Next.js 15 app directory
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page with header, hero, albums, footer
│   ├── login/          # Login page
│   ├── admin/          # Admin pages and dashboard
│   │   ├── albums/     # Album management
│   │   ├── photos/     # Photo management
│   │   ├── storage/    # Storage settings
│   │   ├── templates/  # Template customization
│   │   └── users/      # User management
│   ├── albums/         # Public album pages
│   ├── photos/         # Public photo pages
│   ├── api/            # API routes
│   └── globals.css     # Global styles
├── components/          # Reusable React components
│   ├── ui/            # UI component library (Dialog, Button, etc.)
│   ├── Header.tsx      # Navigation header
│   ├── Footer.tsx      # Copyright footer
│   ├── TiptapHTMLEditor.tsx # Rich text editor with links
│   └── [feature]/     # Feature-specific components
├── lib/                 # Utility libraries
│   ├── mongodb.ts      # MongoDB connection
│   ├── auth.ts         # Authentication configuration
│   └── models/         # Database models
├── services/            # Business logic services
│   ├── storage/        # Storage providers (Google Drive, S3, Local)
│   ├── exif-extractor.ts # EXIF data processing
│   └── site-config.ts  # Site configuration
├── types/               # TypeScript type definitions
├── hooks/               # Custom React hooks
├── i18n/               # Internationalization files
└── templates/          # Gallery templates
```

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

### PM2 Deployment (Recommended)
Follow the [PM2 Deployment Guide](docs/pm2-deployment.md) for production deployment using PM2 process manager.

### Docker Deployment
Follow the [Docker Deployment Guide](docs/docker-deployment.md) for containerized deployment.

### Manual Deployment
Follow the [Deployment Guide](docs/deploy.md) for manual deployment instructions.

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
- [x] Template customization system

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

- **Public Access**: Home page, public albums, photo browsing
- **User Access**: Login required for personal albums and photo uploads
- **Admin Access**: Dashboard, storage settings, and administrative functions restricted to admin users only

---

**Made with ❤️ by the OpenShutter Team**
