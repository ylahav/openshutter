# Photo Upload Features

OpenShutter provides comprehensive photo upload capabilities with duplicate detection, bulk upload from local folders, and detailed upload reporting.

## Upload Methods

### 1. File Upload (Browser)

Upload individual or multiple photos through the web interface.

**Access**: `/admin/photos/upload`

**Features**:
- Drag and drop support
- Multiple file selection
- Real-time upload progress
- Automatic duplicate detection
- Detailed upload reports

**Supported Formats**:
- JPEG/JPG
- PNG
- GIF
- BMP
- WebP
- TIFF/TIF

**File Size Limit**: 100MB per file

### 2. Bulk Upload from Local Folder

Upload all photos from a local folder on your computer in a single operation.

**Access**: `/admin/photos/upload` → "Upload from Folder" tab

**Features**:
- Browser-based folder selection
- Automatic image detection
- Batch processing with individual file progress
- Duplicate detection and skipping
- Comprehensive upload reports
- Error handling and recovery

**Usage**:
1. Navigate to `/admin/photos/upload`
2. Select an album (required)
3. Switch to "Upload from Folder" tab
4. Click "Choose Folder" and select a folder from your computer
5. All images in the folder will be automatically uploaded
6. Review the upload report with progress for each file

**Note**: This uses client-side folder selection. Files are uploaded individually through the standard upload endpoint. For server-side folder uploads, use the API endpoint directly.

**Request Body**:
```json
{
  "folderPath": "/path/to/photos",
  "albumId": "optional-album-id",
  "title": "Optional title",
  "description": "Optional description",
  "tags": ["tag1", "tag2"]
}
```

**Response**:
```json
{
  "total": 10,
  "successful": 7,
  "skipped": 2,
  "failed": 1,
  "successes": [
    {
      "filename": "photo1.jpg",
      "photoId": "507f1f77bcf86cd799439011",
      "message": "Uploaded successfully"
    }
  ],
  "skippedItems": [
    {
      "filename": "photo2.jpg",
      "reason": "Photo with same hash already exists"
    }
  ],
  "failures": [
    {
      "filename": "photo3.jpg",
      "error": "File read error"
    }
  ]
}
```

## Duplicate Detection

OpenShutter automatically detects duplicate photos using multiple methods:

### 1. Hash-Based Detection (Primary)
- Uses SHA-256 hash of file contents
- Most reliable method for detecting identical files
- Works even if filenames differ

### 2. Filename + Size Detection (Fallback)
- Checks `originalFilename` and file size
- Useful when hash is not available
- Less reliable but faster

### 3. Album-Specific Detection (Optional)
- Checks for duplicates within the same album
- Prevents duplicate uploads to specific albums

**Behavior**:
- If a duplicate is detected, the upload is skipped
- The existing photo information is returned
- A reason is provided in the upload report
- No error is thrown for duplicates (they're treated as skipped)

## Upload Reports

Both upload methods provide detailed reports with:

### Summary Statistics
- **Total**: Total number of files processed
- **Successful**: Number of successfully uploaded photos
- **Skipped**: Number of duplicates or skipped files
- **Failed**: Number of failed uploads

### Detailed Lists

#### Successful Uploads
- Filename
- Photo ID (for reference)
- Success message

#### Skipped Files
- Filename
- Reason for skipping (e.g., "Photo already exists", "Photo with same hash already exists")

#### Failed Uploads
- Filename
- Error message describing the failure

## API Endpoints

### Single Photo Upload
**Endpoint**: `POST /api/photos/upload`

**Method**: FormData (multipart/form-data)

**Parameters**:
- `file`: Photo file (required)
- `albumId`: Album ID (optional)
- `title`: Photo title (optional)
- `description`: Photo description (optional)
- `tags`: Comma-separated tags or JSON array (optional)

**Response**:
- Success: Photo object with `_id`, metadata, and storage information
- Skipped: Object with `skipped: true` and `reason`
- Error: Error object with `error` message

### Bulk Folder Upload (Server-Side)
**Endpoint**: `POST /api/photos/upload-from-folder`

**Method**: JSON

**Note**: This endpoint is for server-side folder uploads. The web interface uses client-side folder selection which uploads files individually.

**Request Body**:
```json
{
  "folderPath": "/path/to/photos",
  "albumId": "optional-album-id",
  "title": "Optional title",
  "description": "Optional description",
  "tags": ["tag1", "tag2"]
}
```

**Response**: UploadReport object (see above)

## Technical Details

### Hash Storage
- SHA-256 hash is stored in the `hash` field of each photo document
- Hash is indexed for fast duplicate lookups
- Hash is calculated from the original file buffer before compression

### Database Indexes
- `hash`: Indexed for fast duplicate detection
- `originalFilename + size`: Composite index for fallback detection
- `filename`: Unique index (already exists)

### Error Handling
- Network errors are caught and reported
- File read errors are caught per-file
- Invalid file formats are skipped
- Storage errors are reported with details

## Best Practices

1. **Use Album Selection**: Always select an album before uploading to organize photos properly
2. **Check Reports**: Review upload reports to identify any issues
3. **Handle Duplicates**: Duplicate detection prevents accidental re-uploads
4. **Local Folder Upload**: Use the "Upload from Folder" tab to select a folder from your computer
5. **File Formats**: Stick to supported image formats for best compatibility
6. **File Sizes**: Keep files under 100MB for optimal performance
7. **Server Folder Uploads**: For server-side folder uploads, use the API endpoint directly with absolute paths

## Troubleshooting

### Upload Fails with "File too large"
- Check nginx configuration: `client_max_body_size 100M;`
- Set `BODY_SIZE_LIMIT=100M` environment variable
- See [UPLOAD_LIMITS.md](./UPLOAD_LIMITS.md) for details

### Duplicate Detection Not Working
- Ensure photos have been uploaded at least once (hash needs to be calculated)
- Check database indexes are created
- Verify hash field is being populated

### Folder Upload Issues
- **Client-side folder selection**: Ensure you're selecting a folder from your computer, not entering a server path
- **No files selected**: Make sure the folder contains image files (JPEG, PNG, GIF, BMP, WebP, TIFF)
- **Server-side folder upload**: If using the API endpoint directly, verify the path exists on the server, check file system permissions, and use absolute paths

### Some Photos Skipped Unexpectedly
- Check the upload report for specific reasons
- Verify hash calculation is working correctly
- Check if photos exist in the database with same hash

## Security Considerations

- **Admin Only**: All upload endpoints require admin authentication
- **Client-Side Upload**: Local folder selection is secure as files are uploaded directly from the user's browser
- **Path Validation**: Server folder paths (API endpoint) should be validated to prevent directory traversal
- **File Type Validation**: Only image files are processed
- **Size Limits**: File size limits prevent DoS attacks

---

*Last updated: January 2025*
