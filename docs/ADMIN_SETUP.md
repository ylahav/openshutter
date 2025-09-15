# OpenShutter Admin Setup Guide

## 🔐 Initial Admin Credentials

**⚠️ IMPORTANT: Change these credentials after first login in production!**

### Default Admin Login:
- **Email**: `admin@openshutter.com`
- **Password**: `admin123!`
- **Role**: System Administrator

## 🚀 First Time Setup

### 1. Access the System
1. Navigate to `http://localhost:4000/login`
2. Use the initial admin credentials above
3. You will be redirected to the admin dashboard

### 2. Change Default Password
**CRITICAL**: After first login, immediately change the default password:
1. Go to System Settings in the dashboard
2. Update admin credentials
3. Remove or update the hardcoded credentials in `src/lib/initial-admin.ts`

### 3. Create Additional Admin Users
1. Use the User Management section in the dashboard
2. Create new admin accounts with proper credentials
3. Disable or remove the initial admin account if desired

## 🔧 Configuration Files

### Initial Admin Settings
Location: `src/lib/initial-admin.ts`

```typescript
export const INITIAL_ADMIN_CREDENTIALS = {
  email: 'admin@openshutter.com',    // Change this
  password: 'admin123!',             // Change this
  name: 'System Administrator',
  role: 'admin'
}
```

### Environment Variables
Location: `.env.local`

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/openshutter
MONGODB_DB=openshutter

# NextAuth Configuration
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:4000
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
- Album management
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
