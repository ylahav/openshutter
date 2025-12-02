# API Endpoint Testing Guide

This document describes how to test all NestJS API endpoints after the migration.

## Prerequisites

1. **Backend Server Running**
   ```bash
   cd backend
   pnpm dev
   # Server should start on http://localhost:5000
   ```

2. **MongoDB Connection**
   - Ensure MongoDB is running and accessible
   - Check `MONGODB_URI` in `.env` file

3. **Test Data**
   - At least one album in the database
   - At least one photo in the database (optional for basic tests)

## API Base URL

All endpoints are prefixed with `/api`:
- Base URL: `http://localhost:5000/api`
- Frontend proxy: Requests to `/api/*` are proxied to `http://localhost:5000/api/*`

## Endpoints to Test

### 1. Health Check

**Endpoint:** `GET /api/health`

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-XX..."
}
```

**Test Command:**
```bash
curl http://localhost:5000/api/health
```

---

### 2. Photos Endpoints

#### 2.1 Get All Photos (Paginated)

**Endpoint:** `GET /api/photos`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Expected Response:**
```json
{
  "photos": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

**Test Commands:**
```bash
# Basic request
curl http://localhost:5000/api/photos

# With pagination
curl "http://localhost:5000/api/photos?page=1&limit=5"
```

#### 2.2 Get Single Photo

**Endpoint:** `GET /api/photos/:id`

**Path Parameters:**
- `id`: Photo ID (MongoDB ObjectId)

**Expected Response:**
```json
{
  "_id": "...",
  "title": {...},
  "url": "...",
  ...
}
```

**Test Command:**
```bash
# Replace {photoId} with actual photo ID
curl http://localhost:5000/api/photos/{photoId}
```

#### 2.3 Upload Photo

**Endpoint:** `POST /api/photos/upload`

**Query Parameters:**
- `albumId` (optional): Album ID to associate photo with
- `title` (optional): Photo title
- `description` (optional): Photo description
- `tags` (optional): JSON array of tags

**Request Body:**
- `file`: Multipart form data file upload

**Expected Response:**
```json
{
  "_id": "...",
  "title": {...},
  "url": "...",
  ...
}
```

**Test Command:**
```bash
curl -X POST \
  -F "file=@/path/to/image.jpg" \
  -F "albumId=your-album-id" \
  -F "title=Test Photo" \
  "http://localhost:5000/api/photos/upload"
```

---

### 3. Albums Endpoints

#### 3.1 Get All Albums

**Endpoint:** `GET /api/albums`

**Query Parameters:**
- `parentId` (optional): Filter by parent album ID
- `level` (optional): Filter by album level

**Expected Response:**
```json
[
  {
    "_id": "...",
    "name": {...},
    "alias": "...",
    ...
  },
  ...
]
```

**Test Commands:**
```bash
# Get all albums
curl http://localhost:5000/api/albums

# Get albums with parent
curl "http://localhost:5000/api/albums?parentId=parent-album-id"

# Get albums by level
curl "http://localhost:5000/api/albums?level=1"
```

#### 3.2 Get Album by Alias

**Endpoint:** `GET /api/albums/by-alias/:alias`

**Path Parameters:**
- `alias`: Album alias (slug)

**Expected Response:**
```json
{
  "_id": "...",
  "name": {...},
  "alias": "...",
  ...
}
```

**Test Command:**
```bash
# Replace {alias} with actual album alias
curl http://localhost:5000/api/albums/by-alias/{alias}
```

#### 3.3 Get Single Album (by ID or Alias)

**Endpoint:** `GET /api/albums/:idOrAlias`

**Path Parameters:**
- `idOrAlias`: Album ID (ObjectId) or alias

**Expected Response:**
```json
{
  "_id": "...",
  "name": {...},
  "alias": "...",
  ...
}
```

**Test Command:**
```bash
# By ID
curl http://localhost:5000/api/albums/{albumId}

# By alias
curl http://localhost:5000/api/albums/{alias}
```

#### 3.4 Get Album Photos

**Endpoint:** `GET /api/albums/:id/photos`

**Path Parameters:**
- `id`: Album ID (ObjectId) or alias

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Expected Response:**
```json
{
  "photos": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  }
}
```

**Test Command:**
```bash
# Replace {albumId} with actual album ID
curl "http://localhost:5000/api/albums/{albumId}/photos?page=1&limit=10"
```

---

## Automated Testing

### Using the Test Script

A test script is provided at `backend/test-endpoints.js`:

```bash
# Make sure backend is running first
cd backend
pnpm dev

# In another terminal
node backend/test-endpoints.js
```

### Using curl Script

Create a shell script to test all endpoints:

```bash
#!/bin/bash

BASE_URL="http://localhost:5000/api"

echo "Testing Health Check..."
curl -s "$BASE_URL/health" | jq .

echo -e "\nTesting Get Photos..."
curl -s "$BASE_URL/photos?page=1&limit=5" | jq .

echo -e "\nTesting Get Albums..."
curl -s "$BASE_URL/albums" | jq .
```

### Using Postman/Insomnia

1. Import the following collection:

**Health Check:**
- Method: GET
- URL: `http://localhost:5000/api/health`

**Get Photos:**
- Method: GET
- URL: `http://localhost:5000/api/photos?page=1&limit=5`

**Get Albums:**
- Method: GET
- URL: `http://localhost:5000/api/albums`

**Get Album by Alias:**
- Method: GET
- URL: `http://localhost:5000/api/albums/by-alias/{alias}`

**Get Album Photos:**
- Method: GET
- URL: `http://localhost:5000/api/albums/{id}/photos?page=1&limit=10`

---

## Expected Behaviors

### Success Responses
- All GET endpoints return `200 OK` with data
- POST endpoints return `201 Created` with created resource
- Responses are direct data (no `{ success: true, data: ... }` wrapper)

### Error Responses
- `400 Bad Request`: Invalid input parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error format:
```json
{
  "statusCode": 400,
  "message": "Error message",
  "timestamp": "2025-01-XX..."
}
```

### CORS
- CORS is enabled for `http://localhost:4000` (frontend)
- Allowed methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
- Credentials: enabled

---

## Verification Checklist

- [ ] Health check endpoint returns `200 OK`
- [ ] Get photos endpoint returns paginated results
- [ ] Get single photo endpoint returns photo data
- [ ] Get albums endpoint returns album list
- [ ] Get album by alias endpoint returns album data
- [ ] Get album photos endpoint returns paginated photos
- [ ] Error responses follow NestJS format
- [ ] CORS headers are present in responses
- [ ] Frontend can successfully proxy requests to backend
- [ ] File upload endpoint accepts multipart/form-data

---

## Troubleshooting

### Backend Not Starting
- Check MongoDB connection: `MONGODB_URI` in `.env`
- Check port availability: Port 5000 should be free
- Check logs: Look for error messages in console

### 404 Errors
- Verify endpoint paths match exactly (case-sensitive)
- Check that `/api` prefix is included
- Verify route order in controllers (more specific routes first)

### CORS Errors
- Verify `FRONTEND_URL` in backend `.env` matches frontend URL
- Check CORS configuration in `main.ts`

### Database Errors
- Verify MongoDB is running
- Check connection string format
- Verify models are registered in `app.module.ts`

---

## Notes

- All endpoints use NestJS standard response format (no custom wrappers)
- Pagination is handled consistently across list endpoints
- Error handling uses NestJS HttpExceptionFilter
- File uploads use NestJS FileInterceptor with validation
- All endpoints are prefixed with `/api` via `app.setGlobalPrefix('api')`
