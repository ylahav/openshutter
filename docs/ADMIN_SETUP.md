# OpenShutter Admin Setup Guide

## 🚀 First Time Setup

When you first deploy OpenShutter, the system will automatically detect that it's a fresh installation and guide you through the initial setup process.

### Initial Setup Wizard

On a fresh installation, visiting the root URL (`http://localhost:4000` or your production domain) will automatically redirect you to the **Initial Setup** page (`/setup`).

#### Setup Form Fields

The setup form allows you to configure:

1. **Admin Account** (Required)
   - **Username/Email**: Set your admin account email address
   - **Password**: Create a secure password (minimum 6 characters)
   - **Confirm Password**: Re-enter your password for verification

2. **Site Configuration**
   - **Site Title** (Required): The name of your photo gallery
   - **Site Description** (Optional): A brief description of your gallery
   - **Logo** (Optional): Upload a logo image for your site (PNG, JPG, GIF, or WebP, max 5MB)

#### Completing Setup

1. Fill in the required fields (Username, Password, Confirm Password, Site Title)
2. Optionally add a site description and upload a logo
3. Click **"Complete Setup"**
4. You will be automatically redirected to the login page
5. Log in with the credentials you just created

### Default Admin Credentials (Fallback)

If the setup wizard doesn't appear (e.g., if the database was already initialized), you can use these default credentials:

- **Email**: `admin@openshutter.org`
- **Password**: `admin123!`
- **Role**: System Administrator

**⚠️ IMPORTANT**: These default credentials should only be used if the setup wizard is not available. Always change them immediately after first login in production!

### After Initial Setup

Once you've completed the setup and logged in:

1. **Change Your Password** (if you used default credentials)
   - Go to your profile settings
   - Update your password to something secure

2. **Configure Storage Providers** (Optional but Recommended)
   - Navigate to `/admin/storage` in the admin dashboard
   - Configure at least one storage provider (Google Drive, AWS S3, Backblaze, Wasabi, or Local Storage)
   - For Google Drive:
     - Choose between "Hidden (AppData Folder)" or "Visible in User's Drive" storage type
     - Enter OAuth credentials and generate a refresh token
     - See [Storage Configuration Guide](./STORAGE.md) for detailed instructions

2. **Create Additional Admin Users**
   - Navigate to Admin Panel → Users
   - Create new admin accounts with proper credentials
   - You can disable or remove the initial admin account if desired

3. **Configure Site Settings**
   - Go to Admin Panel → Site Config
   - Update site title, description, logo, and other settings
   - Configure languages, themes, and SEO settings

## 🔧 Configuration Files

### Initial Admin Settings

The initial admin user is automatically created by the database initialization service. The default credentials are:

- **Email**: `admin@openshutter.org`
- **Password**: `admin123!`
- **Name**: System Administrator
- **Role**: admin

These are defined in `backend/src/database/database-init.service.ts` and are only used when:
- No admin user exists in the database
- The setup wizard hasn't been completed yet

**Note**: The setup wizard allows you to change these credentials during initial setup, so you may never need to use the defaults.

### Environment Variables
Location: `.env.local`

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/openshutter
MONGODB_DB=openshutter

# Authentication Configuration (SvelteKit)
AUTH_JWT_SECRET=your_jwt_secret
BACKEND_URL=http://localhost:5000
```

## 🛡️ Security Considerations

### Production Deployment
1. **NEVER** use default credentials in production
2. Use strong, unique passwords
3. Enable HTTPS
4. Implement proper session management
5. Add rate limiting for login attempts
6. Enable two-factor authentication (2FA)

### Database Security
1. Use MongoDB authentication
2. Restrict database access to application only
3. Regular security updates
4. Backup encryption


## 📋 Admin Dashboard Features

### User Management
- Create/Edit/Delete user accounts
- Manage user roles and permissions
- Reset user passwords
- View user activity

### Storage Management
- Configure storage providers
- Monitor storage usage
- Manage storage quotas
- Backup and restore

### System Settings
- Application configuration
- Email settings
- Security policies
- System monitoring

### Content Management
- **Album Management**
  - Create, edit, and delete albums
  - Album photo grid: select photos one-by-one (checkbox on each photo) or "Select All" / "Deselect All". Bulk actions: Publish/Unpublish, Set Location, Set Tags, Set Metadata, Re-extract EXIF, Regenerate thumbnails.
  - Regenerate thumbnails (per photo or bulk): corrects orientation in small/medium/large subfolders. Bulk action shows a streaming progress bar ("Regenerating thumbnails… X/Y").
  - Recursive album deletion (deletes sub-albums and photos)
  - Delete albums from the albums list page or individual album pages
  - Album deletion removes photos from storage providers (Google Drive, Wasabi, AWS S3, Backblaze, Local)
- Photo organization
- Tag management
- Content moderation
- **Blog Categories Management**
  - Create and manage blog categories
  - Multi-language support for category titles and descriptions
  - Category status management (active/inactive)
  - Sort order configuration
  - Leading image assignment

## 🚨 Troubleshooting

### Login Issues
1. Verify credentials are correct
2. Check if the system is running on port 4000
3. Ensure MongoDB is running
4. Check browser console for errors

### Dashboard Access Issues
1. Verify user has admin role
2. Check AdminGuard component
3. Ensure proper authentication flow
3. Check browser console for errors

### Album Deletion Issues
1. **404 Error when deleting album**: Ensure the frontend server-side route `/api/admin/albums/[id]/+server.ts` has a DELETE handler
2. **Delete button not working in albums list**: Check browser console for event delegation errors
3. **Photos not deleted from storage**: Verify storage provider configuration and permissions
4. **Sub-albums not deleted**: Ensure recursive deletion is implemented in the backend


## 📞 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify all environment variables are set
3. Ensure all services are running
4. Check the application logs

## 🔄 Next Steps

After initial setup:
1. Implement proper authentication system
2. Add user management features
3. Configure storage providers via admin dashboard
4. Set up monitoring and logging
5. Implement backup strategies
6. Add security features (2FA, rate limiting)

---

**Remember: Security is paramount. Always change default credentials and follow security best practices!**
