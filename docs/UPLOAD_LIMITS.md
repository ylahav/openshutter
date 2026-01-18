# File Upload Size Limits

## Current Configuration
File uploads are handled by the NestJS backend API (port 5000). The photo upload API endpoint (`/api/photos/upload`) is configured to accept files up to **100MB**. SvelteKit routes proxy directly to the NestJS backend.

## Solutions

### Development Mode

For local development, the default limits should be sufficient. If you need to increase limits:

### Production Mode

For production deployments, configure the limit at the deployment level:

#### Nginx Configuration
If using nginx as a reverse proxy, you **must** configure `client_max_body_size` to allow large file uploads.

**Quick Fix**: Add this to your nginx server block:
```nginx
client_max_body_size 100M;
```

**Complete Configuration**: See `docs/nginx-openshutter.conf` for a complete nginx configuration that includes:
- `client_max_body_size 100M;` - Allows 100MB uploads (matches backend limit)
- Increased timeouts for large file uploads
- Proper proxy configuration for API routes to backend (port 5000)
- Disabled buffering for file uploads to improve performance

**To apply the fix on your server:**
1. Edit your nginx config: `sudo nano /etc/nginx/sites-available/openshutter` (or your config file)
2. Add `client_max_body_size 100M;` inside the `server { }` block
3. Test configuration: `sudo nginx -t`
4. Reload nginx: `sudo systemctl reload nginx`

#### Standalone/PM2
If running in standalone mode or with PM2, you may need to:
1. Configure the reverse proxy (nginx, etc.) to allow larger bodies
2. Set environment variables in your deployment configuration

### Alternative Solutions

1. **Chunked Uploads**: Implement chunked file uploads to bypass the body size limit
2. **Direct Storage Upload**: Upload files directly to storage (S3, etc.) from the client
3. **Streaming**: Use streaming uploads instead of buffering the entire file

## Current Status

- **Backend API limit**: **100MB** (configured in NestJS backend)
- **SvelteKit proxy limit**: Configured in `vite.config.ts` (defaults to higher limits)
- **Frontend limit**: **100MB** (configured in upload components)

## Testing

To test upload limits:
1. Try uploading files of various sizes up to 100MB
2. Check the browser console and server logs for error messages
3. Verify the file is successfully uploaded and stored

## Notes

- SvelteKit routes proxy directly to NestJS backend
- Error messages may indicate "Request entity too large" or similar
- The NestJS backend handles uploads directly and has higher limits configured
- For production, configure nginx or your reverse proxy to allow larger bodies
