# Storage Configuration Guide

OpenShutter supports multiple storage providers for photo and album storage. This guide covers configuration and management of all supported storage options.

## Supported Storage Providers

### 1. Local Storage
- **Type**: File system storage
- **Use Case**: Development, small deployments
- **Configuration**: Simple path-based storage

### 2. Google Drive
- **Type**: Cloud storage via Google Drive API
- **Use Case**: Personal photo galleries, Google Workspace integration
- **Configuration**: OAuth2 credentials required

### 3. Amazon S3
- **Type**: Cloud object storage
- **Use Case**: Production deployments, scalable storage
- **Configuration**: AWS credentials and bucket settings

### 4. Backblaze B2
- **Type**: S3-compatible cloud storage
- **Use Case**: Cost-effective cloud storage, backup solutions
- **Configuration**: Application Key ID and Application Key

### 5. Wasabi
- **Type**: S3-compatible cloud storage
- **Use Case**: High-performance cloud storage, enterprise solutions
- **Configuration**: Access Key ID, Secret Access Key, and custom endpoint

## Storage Configuration

### Accessing Storage Settings

**Primary Method: Admin Dashboard (Recommended)**

All storage providers are configured through the admin dashboard at `/admin/storage` (admin access required). This is the recommended method as it stores configurations securely in the database and provides a user-friendly interface.

1. **Login as Admin**: Navigate to `http://localhost:4000/login`
2. **Go to Storage**: Click "Storage" in the admin dashboard
3. **Select Provider**: Choose the storage provider tab you want to configure
4. **Configure Settings**: Fill in the required credentials and settings
5. **Test Connection**: Use the "Test Connection" button to verify settings
6. **Save Configuration**: Click "Save" to store the configuration

**Storage configurations are stored in MongoDB** and encrypted at rest. The admin dashboard provides:
- Visual storage tree browsing (for supported providers)
- Connection testing
- Provider enable/disable toggles
- Usage monitoring
- Configuration validation

### Provider-Specific Configuration

**Note**: While environment variables can be used for initial setup, the admin dashboard is the primary configuration method. All settings configured via the dashboard are stored in the database.

#### Local Storage
- **Base Path**: Storage directory path (default: `/app/public/albums`)
- **Max File Size**: Maximum file size limit (default: 100MB)
- Configure via admin dashboard at `/admin/storage`

#### Google Drive
- **Client ID**: OAuth 2.0 Client ID from Google Cloud Console
- **Client Secret**: OAuth 2.0 Client Secret
- **Refresh Token**: OAuth refresh token (obtained through OAuth flow)
- **Folder ID**: Google Drive folder ID where files will be stored
- Configure via admin dashboard at `/admin/storage`

#### Amazon S3
- **Access Key ID**: AWS access key ID
- **Secret Access Key**: AWS secret access key
- **Region**: AWS region (e.g., `us-east-1`)
- **Bucket Name**: S3 bucket name
- **Endpoint**: (Optional) Custom endpoint URL
- **Path-Style Addressing**: Toggle for path-style vs virtual-hosted-style URLs
- Configure via admin dashboard at `/admin/storage`

#### Backblaze B2
- **Application Key ID**: 24-character application key ID (starts with "K")
- **Application Key**: 32-character application key
- **Bucket Name**: B2 bucket name
- **Region**: B2 region (e.g., `us-west-2`)
- **Endpoint**: S3-compatible endpoint URL (e.g., `https://s3.us-west-2.backblazeb2.com`)
- Configure via admin dashboard at `/admin/storage`

#### Wasabi
- **Access Key ID**: Wasabi access key ID
- **Secret Access Key**: Wasabi secret access key
- **Bucket Name**: Wasabi bucket name
- **Region**: Wasabi region (e.g., `us-east-1`)
- **Endpoint**: S3-compatible endpoint URL (e.g., `https://s3.wasabisys.com`)
- **Path-Style Addressing**: Toggle for path-style vs virtual-hosted-style URLs
- Configure via admin dashboard at `/admin/storage`

## Storage Provider Setup Guides

### Backblaze B2 Setup

1. **Create Backblaze Account**: Sign up at [backblaze.com](https://www.backblaze.com)
2. **Create B2 Bucket**: 
   - Go to B2 Cloud Storage
   - Create a new bucket
   - Note the bucket name and region
3. **Generate Application Keys**:
   - Go to "App Keys" in your B2 account
   - Create a new application key
   - **Important**: Copy the Application Key ID (24 characters, starts with "K")
   - Copy the Application Key (32 characters)
4. **Configure in OpenShutter**:
   - Application Key ID: Your 24-character key ID
   - Application Key: Your 32-character application key
   - Bucket Name: Your bucket name
   - Region: Your bucket region (e.g., us-west-2)
   - Endpoint: Usually `https://s3.{region}.backblazeb2.com`

### Wasabi Setup

1. **Create Wasabi Account**: Sign up at [wasabi.com](https://www.wasabi.com)
2. **Create Bucket**:
   - Go to Wasabi console
   - Create a new bucket
   - Note the bucket name and region
3. **Generate Access Keys**:
   - Go to "Access Keys" in your Wasabi account
   - Create a new access key
   - Copy the Access Key ID and Secret Access Key
4. **Configure in OpenShutter**:
   - Access Key ID: Your Wasabi access key
   - Secret Access Key: Your Wasabi secret key
   - Bucket Name: Your bucket name
   - Region: Your bucket region (e.g., us-east-1)
   - Endpoint: Usually `https://s3.wasabisys.com`

## Storage Management

### Switching Storage Providers

1. **Configure New Provider**: Set up the new storage provider in admin settings
2. **Test Connection**: Verify the new provider works correctly
3. **Migrate Data**: Use the migration tools to move existing data
4. **Update Album Settings**: Change album storage provider assignments
5. **Verify Migration**: Test photo uploads and downloads

### Storage Monitoring

- **Usage Statistics**: View storage usage in admin dashboard
- **Performance Metrics**: Monitor upload/download speeds
- **Error Logs**: Check storage-related errors in system logs
- **Cost Tracking**: Monitor storage costs for cloud providers

## Security Considerations

### Access Control
- **Admin Only**: Storage configuration is restricted to admin users
- **Secure Credentials**: Store credentials securely in environment variables
- **Regular Rotation**: Rotate access keys regularly for security

### Data Protection
- **Encryption**: All data is encrypted in transit and at rest
- **Access Logs**: Monitor who accesses storage configuration
- **Backup Strategy**: Implement regular backups of critical data

## Troubleshooting

### Common Issues

#### "Invalid Access Key Id" Error (Backblaze)
- **Cause**: Using Key ID instead of Application Key ID
- **Solution**: Use the 24-character Application Key ID (starts with "K")

#### "Malformed Access Key Id" Error
- **Cause**: Empty or incorrect Application Key ID
- **Solution**: Verify the Application Key ID is exactly 24 characters

#### Connection Test Failures
- **Check Credentials**: Verify all credentials are correct
- **Check Network**: Ensure server can reach storage provider
- **Check Permissions**: Verify access keys have proper permissions
- **Check Bucket**: Ensure bucket exists and is accessible

#### Photo Upload Failures
- **Check Storage Provider**: Verify the album's storage provider is configured
- **Check Permissions**: Ensure write permissions on storage
- **Check Quota**: Verify storage quota is not exceeded
- **Check Network**: Ensure stable network connection

### Debug Mode

Enable debug logging to troubleshoot storage issues:

```env
# Enable storage debugging
DEBUG_STORAGE=true
LOG_LEVEL=debug
```

Check server logs for detailed storage operation information.

## Best Practices

### Provider Selection
- **Development**: Use Local Storage for testing
- **Small Deployments**: Google Drive for personal use
- **Production**: AWS S3, Backblaze B2, or Wasabi for scalability
- **Cost Optimization**: Backblaze B2 for cost-effective storage
- **Performance**: Wasabi for high-performance requirements

### Configuration Management
- **Environment Variables**: Store credentials in environment variables
- **Regular Backups**: Backup storage configurations
- **Documentation**: Document your storage setup
- **Testing**: Test storage providers before production use

### Monitoring and Maintenance
- **Regular Checks**: Monitor storage health regularly
- **Usage Alerts**: Set up alerts for storage quota limits
- **Cost Monitoring**: Track storage costs and optimize usage
- **Security Updates**: Keep storage provider credentials updated

## Support

For storage-related issues:
1. Check the troubleshooting section above
2. Review server logs for error details
3. Test storage provider connectivity
4. Verify credentials and permissions
5. Contact support with specific error messages and logs
