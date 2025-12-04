# File Upload Size Limits

## Issue
During the migration from Next.js to SvelteKit, file uploads are handled by the NestJS backend API (port 5000). However, if requests are proxied through Next.js (legacy routes), Next.js has a default body size limit that may restrict file uploads:
- **JSON requests**: ~4.5MB
- **Form data (multipart)**: ~20MB

## Current Configuration
The photo upload API endpoint (`/api/photos/upload`) is handled by the NestJS backend and configured to accept files up to **100MB**. If requests are proxied through Next.js (during migration), the Next.js server may reject requests before they reach the backend API.

## Solutions

### Development Mode

For local development, you can increase the limit by:

1. **Using environment variables** (if supported by your Next.js version):
   ```bash
   NODE_OPTIONS="--max-http-header-size=16384" pnpm dev
   ```

2. **Modify the dev script** in `package.json`:
   ```json
   "dev": "NODE_OPTIONS='--max-http-header-size=16384' next dev -p 4000"
   ```

### Production Mode

For production deployments, configure the limit at the deployment level:

#### Nginx Configuration
If using nginx as a reverse proxy, add to your nginx config:
```nginx
client_max_body_size 100M;
```

#### Docker/Standalone
If running in Docker or standalone mode, you may need to:
1. Configure the reverse proxy (nginx, etc.) to allow larger bodies
2. Set environment variables in your deployment configuration
3. Consider using a custom server wrapper (not recommended for standalone mode)

### Alternative Solutions

1. **Chunked Uploads**: Implement chunked file uploads to bypass the body size limit
2. **Direct Storage Upload**: Upload files directly to storage (S3, etc.) from the client
3. **Streaming**: Use streaming uploads instead of buffering the entire file

## Current Status

- **Backend API limit**: **100MB** (configured in NestJS backend)
- **Next.js proxy limit**: **~20MB** (default, may vary - only affects legacy routes during migration)
- **SvelteKit proxy limit**: Configured in `vite.config.ts` (defaults to higher limits)
- **Frontend limit**: **100MB** (configured in upload components)

## Testing

To test if the limit has been increased:
1. Try uploading a file larger than 20MB
2. Check the browser console and server logs for error messages
3. Verify the file is successfully uploaded and stored

## Notes

- **During migration**: If requests go through Next.js (legacy routes), the body size limit is enforced by Next.js before reaching the NestJS backend
- **After migration**: SvelteKit routes proxy directly to NestJS backend, bypassing Next.js limits
- Error messages may indicate "Request entity too large" or similar
- Configuration may vary between Next.js and SvelteKit versions
- The NestJS backend handles uploads directly and has higher limits configured
