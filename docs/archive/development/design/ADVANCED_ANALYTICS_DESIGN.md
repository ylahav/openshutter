# Advanced Analytics Design

**Phase 3 Stage 3.** This document defines the design, API contract, and implementation approach for advanced analytics and reporting.

---

## 1. Overview

Provide comprehensive analytics and reporting for admins/owners: usage metrics, engagement statistics, tag/album analytics, storage breakdowns, and trends over time.

---

## 2. Goals

- **Usage tracking**: Track views for photos and albums
- **Search analytics**: Monitor search queries and patterns
- **Time-based analytics**: Show trends over time (daily, weekly, monthly)
- **Storage analytics**: Breakdown by album and storage provider
- **Tag analytics**: Usage trends and patterns
- **User activity**: Track user engagement (if applicable)
- **Privacy**: Only admins (and optionally owners for their own content)
- **Export**: CSV export for further analysis

---

## 3. Metrics & Data Sources

### 3.1 View Tracking

**Metrics:**
- Photo views (total, unique, per photo)
- Album views (total, unique, per album)
- View trends over time

**Data Source:**
- Event log collection (`analytics_events`) with schema:
  ```typescript
  {
    type: 'photo_view' | 'album_view',
    resourceId: ObjectId, // photo or album ID
    userId?: ObjectId, // optional, for unique user tracking
    ipAddress?: string, // hashed for privacy
    userAgent?: string, // anonymized
    timestamp: Date,
    metadata?: {
      albumId?: ObjectId, // for photo views
      referrer?: string,
      // ... other context
    }
  }
  ```

**Implementation:**
- Lightweight event logging on photo/album view endpoints
- Optional aggregation job to create daily summaries
- Index on `type`, `resourceId`, `timestamp` for fast queries

### 3.2 Search Analytics

**Metrics:**
- Search query frequency
- Popular search terms
- Search result counts
- Search type distribution (photos vs albums vs people vs locations)
- Search filters usage

**Data Source:**
- Event log entries with type `search` (stored in `analytics_events` under `metadata`):
  ```typescript
  {
    type: 'search',
    userId?: string,
    timestamp: Date,
    metadata: {
      query?: string, // normalized lowercase trim
      searchType: 'photos' | 'albums' | 'people' | 'locations' | 'all',
      resultCount: number,
      /** Set for owner custom-domain (and v1 API on that host): attribute traffic to that gallery owner. */
      ownerScopeId?: string,
      filters?: {
        tags?: string[],
        /** Canonical unordered tag-pair keys derived from `tags` (pairs-only). Format: `minId|maxId`. */
        tagPairKeys?: string[],
        people?: string[],
        locationIds?: string[],
        dateFrom?: string,
        dateTo?: string,
      },
    },
  }
  ```

**Implementation:**
- Log search events from **`POST/GET /api/search`** and **`POST/GET /api/v1/search`** (optional auth / API key).
- Normalize queries (lowercase, trim) for aggregation.
- Aggregate by query, type, date range.
- **Tag filter behavior:** `GET /api/admin/analytics/search` includes:
  - **`tagFilterStats`**: summary (searches with any tag filter, share of all searches, zero-result count with tag filter, average `resultCount` when a tag filter was used) and **`topFilterTags`** (per-tag filter use counts, zero-result counts, averages).
  - **`tagFilterTrends`**: time-series trends for tag-filter usage (bucketed by `period`).
  - **`tagFilterByType`**: tag-filter usage counts split by `searchType`.
  - **`topTagPairs`**: most used tag pairs in filters (pairs-only; derived from `metadata.filters.tagPairKeys`).
  - CSV export for `type=search` includes the above tag-filter sections.
- **Owner scope:** `metadata.ownerScopeId` is set when the request runs in an **owner-site** context (host resolves to an owner domain). Logged-in users still set `userId`. Owner analytics (below) matches events where `userId === ownerId` **or** `metadata.ownerScopeId === ownerId`.

### 3.3 Tag Usage Over Time

**Metrics:**
- Tag usage trends (daily/weekly/monthly)
- Tag creation trends
- Most popular tags by period
- Tag adoption rate

**Data Source:**
- Existing `tags` collection with `usageCount` and `createdAt`
- Photo-tag relationships for time-based analysis
- Aggregation queries grouped by date

### 3.4 Storage Analytics

**Metrics:**
- Storage by album
- Storage by provider (Google Drive, S3, Local, etc.)
- Storage growth over time
- Average photo size by album/provider

**Data Source:**
- Existing `photos` collection with `size` and `storage.provider`
- Album-photo relationships
- Aggregation queries

### 3.5 User Activity

**Metrics:**
- Active users (last 7/30 days)
- User login frequency
- User upload activity
- User engagement score

**Data Source:**
- Existing `users` collection
- Event log for login/activity events
- Aggregation queries

---

## 4. API Design

### 4.1 Overview Endpoint

**Endpoint:** `GET /api/admin/analytics/overview`

**Query Parameters:**
- `dateFrom` (optional): ISO date string, default: 30 days ago
- `dateTo` (optional): ISO date string, default: now
- `period` (optional): `'day' | 'week' | 'month'`, default: `'day'`

**Response:**
```json
{
  "overview": {
    "photos": { "total": 1234, "published": 1200, "draft": 34 },
    "albums": { "total": 56, "public": 45, "private": 11 },
    "users": { "total": 12, "active": 10, "blocked": 2 },
    "tags": { "total": 234, "active": 200, "inactive": 34 },
    "storage": { "totalGB": 12.5, "totalMB": 12800 }
  },
  "recentActivity": {
    "photos": 45,
    "albums": 3,
    "users": 2,
    "period": "30 days"
  },
  "views": {
    "total": 12345,
    "photos": 8900,
    "albums": 3445,
    "unique": 234
  }
}
```

### 4.2 Views Analytics

**Endpoint:** `GET /api/admin/analytics/views`

**Query Parameters:**
- `dateFrom` (optional): ISO date string
- `dateTo` (optional): ISO date string
- `period` (optional): `'day' | 'week' | 'month'`
- `type` (optional): `'photo' | 'album' | 'all'`, default: `'all'`
- `resourceId` (optional): Specific photo/album ID

**Response:**
```json
{
  "summary": {
    "total": 12345,
    "unique": 234,
    "photos": 8900,
    "albums": 3445
  },
  "trends": [
    { "date": "2025-02-01", "views": 123, "unique": 12 },
    { "date": "2025-02-02", "views": 145, "unique": 15 },
    // ...
  ],
  "topResources": [
    {
      "_id": "photo-id",
      "name": "Photo Title",
      "views": 234,
      "uniqueViews": 45
    },
    // ...
  ]
}
```

### 4.3 Search Analytics

**Endpoint:** `GET /api/admin/analytics/search`

**Query Parameters:**
- `dateFrom` (optional): ISO date string
- `dateTo` (optional): ISO date string
- `limit` (optional): Number, default: 20
- `period` (optional): `'day' | 'week' | 'month'`, default: `'day'`

**Response:**
```json
{
  "summary": {
    "totalSearches": 1234,
    "uniqueQueries": 234,
    "averageResults": 45.6
  },
  "popularQueries": [
    {
      "query": "sunset",
      "count": 123,
      "averageResults": 45,
      "lastSearched": "2025-02-18T10:30:00Z"
    },
    // ...
  ],
  "byType": {
    "photos": 800,
    "albums": 200,
    "people": 150,
    "locations": 84
  },
  "trends": [
    { "date": "2025-02-01", "searches": 45 },
    // ...
  ],
  "tagFilterStats": {
    "summary": {
      "searchesWithTagFilter": 120,
      "shareOfSearchesPercent": 9.7,
      "zeroResultWithTagFilter": 8,
      "averageResultsWhenTagFilter": 12.4
    },
    "topFilterTags": [
      {
        "tagId": "…",
        "name": "sunset",
        "filterUses": 45,
        "zeroResultCount": 2,
        "averageResults": 11.2
      }
    ]
  },
  "tagFilterTrends": [
    { "date": "2025-02-01", "searches": 45, "zeroResultCount": 2, "averageResults": 12.4 },
    // ...
  ],
  "tagFilterByType": {
    "photos": { "searches": 100, "zeroResultCount": 5, "averageResults": 12.0 },
    "albums": { "searches": 20, "zeroResultCount": 1, "averageResults": 8.0 },
    "people": { "searches": 10, "zeroResultCount": 0, "averageResults": 6.5 },
    "locations": { "searches": 5, "zeroResultCount": 0, "averageResults": 4.2 },
    "all": { "searches": 135, "zeroResultCount": 6, "averageResults": 10.9 }
  },
  "topTagPairs": [
    {
      "pairKey": "minId|maxId",
      "tagAId": "…",
      "tagBId": "…",
      "tagAName": "sunset",
      "tagBName": "vacation",
      "filterUses": 12,
      "zeroResultCount": 1,
      "averageResults": 9.3
    }
  }
}
```

**Note:** `resultCount` on each logged search is the **total match count** for the selected `searchType` (or the sum for `searchType=all`), not the current page size.

### 4.3.1 Owner search tag-filter analytics

**Endpoint:** `GET /api/owner/analytics/search-tag-filters`

**Auth:** Gallery **owner** only (JWT cookie or Bearer; same guard family as other owner APIs). Admins should use **`GET /api/admin/analytics/search`**.

**Query parameters:** `dateFrom`, `dateTo` (optional ISO dates), `limit` (optional, default 20) for the top-tag breakdown, and `period` (optional) for time-bucket granularity.

**Response:** `{ "data": { "summary": { "totalSearches": number }, "tagFilterStats": { … }, "tagFilterTrends": [ … ], "tagFilterByType": { … }, "topTagPairs": [ … ] } }`

Events included: `type === 'search'` in the date range where **`userId`** equals the authenticated owner **or** **`metadata.ownerScopeId`** equals that owner (custom-domain anonymous searches).

**UI:** Owner dashboard card links to **`/owner/analytics`**; SvelteKit proxies via **`GET /api/owner/analytics/search-tag-filters`**.

### 4.4 Tags Analytics

**Endpoint:** `GET /api/admin/analytics/tags`

**Query Parameters:**
- `dateFrom` (optional): ISO date string
- `dateTo` (optional): ISO date string
- `period` (optional): `'day' | 'week' | 'month'`

**Response:**
```json
{
  "summary": {
    "totalTags": 234,
    "activeTags": 200,
    "unusedTags": 34,
    "newTags": 12
  },
  "usageTrends": [
    {
      "date": "2025-02-01",
      "tagsCreated": 2,
      "tagsUsed": 45,
      "topTags": [
        { "name": "sunset", "usage": 12 },
        // ...
      ]
    },
    // ...
  ],
  "topTags": [
    {
      "_id": "tag-id",
      "name": "sunset",
      "usageCount": 234,
      "trend": "up", // up, down, stable
      "growth": 12.5 // percentage
    },
    // ...
  ]
}
```

### 4.5 Albums Analytics

**Endpoint:** `GET /api/admin/analytics/albums`

**Query Parameters:**
- `dateFrom` (optional): ISO date string
- `dateTo` (optional): ISO date string

**Response:**
```json
{
  "summary": {
    "totalAlbums": 56,
    "publicAlbums": 45,
    "privateAlbums": 11,
    "totalPhotos": 1234
  },
  "topAlbums": [
    {
      "_id": "album-id",
      "name": "Album Name",
      "photoCount": 234,
      "views": 1234,
      "storageMB": 456.7
    },
    // ...
  ],
  "storageByAlbum": [
    {
      "_id": "album-id",
      "name": "Album Name",
      "storageMB": 456.7,
      "photoCount": 234,
      "averageSizeMB": 1.95
    },
    // ...
  ]
}
```

### 4.6 Storage Analytics

**Endpoint:** `GET /api/admin/analytics/storage`

**Query Parameters:**
- `groupBy` (optional): `'album' | 'provider' | 'both'`, default: `'both'`

**Response:**
```json
{
  "summary": {
    "totalGB": 12.5,
    "totalMB": 12800,
    "totalPhotos": 1234,
    "averageSizeMB": 10.37
  },
  "byProvider": [
    {
      "provider": "google-drive",
      "totalGB": 8.5,
      "photoCount": 800,
      "percentage": 68
    },
    {
      "provider": "local",
      "totalGB": 4.0,
      "photoCount": 434,
      "percentage": 32
    }
  ],
  "byAlbum": [
    {
      "_id": "album-id",
      "name": "Album Name",
      "storageMB": 456.7,
      "photoCount": 234,
      "percentage": 3.57
    },
    // ...
  ],
  "growth": [
    { "date": "2025-02-01", "totalGB": 12.0 },
    { "date": "2025-02-02", "totalGB": 12.1 },
    // ...
  ]
}
```

### 4.7 Export Endpoint

**Endpoint:** `GET /api/admin/analytics/export`

**Query Parameters:**
- `type` (required): `'overview' | 'views' | 'search' | 'tags' | 'albums' | 'storage'`
- `dateFrom` (optional): ISO date string
- `dateTo` (optional): ISO date string
- `format` (optional): `'csv' | 'json'`, default: `'csv'`
- `period` (optional): for `type=search`, bucket granularity for `tagFilterTrends` (default `'day'`)

**Response:**
- CSV file download or JSON response

---

## 5. Frontend Dashboard

### 5.1 Overview Tab

- Summary cards (photos, albums, users, storage)
- Recent activity chart (line chart)
- Views chart (time series)
- Quick stats grid

### 5.2 Views Tab

- Total views vs unique views (line chart)
- Top viewed photos/albums (bar chart)
- Views by day/week/month (time series)
- Date range picker

### 5.3 Search Tab

- Popular search queries (table with trends)
- Search type distribution (pie chart)
- Search trends over time (line chart)
- Average results per search

### 5.4 Tags Tab

- Tag usage trends (line chart)
- Top tags (bar chart)
- Tag creation trends
- Tag adoption metrics

### 5.5 Albums Tab

- Top albums by photo count (bar chart)
- Storage by album (bar chart)
- Album views (time series)
- Album statistics table

### 5.6 Storage Tab

- Storage by provider (pie chart)
- Storage by album (bar chart)
- Storage growth over time (line chart)
- Storage statistics table

### 5.7 Charts Library

Use a lightweight charting library:
- **Chart.js** (recommended): Lightweight, good documentation, works well with Svelte
- Alternative: **Recharts** or **ApexCharts**

---

## 6. Implementation Plan

### 6.1 Backend

1. **Event Logging Service**
   - Create `AnalyticsEventService` for logging events
   - Schema for `analytics_events` collection
   - Methods: `logView()`, `logSearch()`, etc.

2. **View Tracking**
   - Add view tracking to photo/album endpoints
   - Middleware or service calls in controllers
   - Optional: Aggregate daily summaries

3. **Search Tracking**
   - Add search event logging in `SearchController`
   - Normalize queries for aggregation
   - Track search results count

4. **Analytics Service**
   - Create `AnalyticsService` with aggregation methods
   - Time-based queries with date ranges
   - Efficient MongoDB aggregations

5. **API Endpoints**
   - Enhance existing `AnalyticsController`
   - Add new endpoints: `/views`, `/search`, `/tags`, `/albums`, `/storage`
   - Add `/export` endpoint for CSV

### 6.2 Frontend

1. **Charts Integration**
   - Install Chart.js or similar
   - Create reusable chart components
   - Time series, bar, pie chart components

2. **Analytics Dashboard**
   - Enhance existing analytics page
   - Add tabs for different analytics sections
   - Date range picker component
   - Export buttons

3. **Data Fetching**
   - API client methods for analytics endpoints
   - Loading states and error handling
   - Caching for frequently accessed data

---

## 7. Privacy & Security

- **Admin Only**: All analytics endpoints require admin role
- **Owner Scoped**: Optional owner analytics for their own content (future)
- **Data Retention**: Configurable retention period (default: 1 year)
- **IP Anonymization**: Hash IP addresses before storage
- **User Agent**: Anonymize user agent strings
- **No PII**: Don't store personally identifiable information without consent

---

## 8. Performance Considerations

- **Indexing**: Index `analytics_events` on `type`, `resourceId`, `timestamp`
- **Aggregation**: Use MongoDB aggregation pipelines for efficient queries
- **Caching**: Cache frequently accessed analytics (e.g., overview stats)
- **Batch Processing**: Optional daily aggregation job for summaries
- **Pagination**: Paginate large result sets
- **Date Range Limits**: Limit maximum date range (e.g., 1 year)

---

## 9. Testing Strategy

1. **Unit Tests**: Analytics service methods
2. **Integration Tests**: API endpoints with mock data
3. **E2E Tests**: Full analytics dashboard flow
4. **Performance Tests**: Large dataset queries
5. **Privacy Tests**: Verify no PII leakage

---

## 10. Future Enhancements

- **Real-time Analytics**: WebSocket updates for live stats
- **Custom Reports**: User-defined report templates
- **Email Reports**: Scheduled email reports
- **Owner Analytics**: Scoped analytics for album owners
- **Advanced Filters**: More granular filtering options
- **Export Formats**: PDF reports, Excel export

---

## 11. References

- [PHASE_3_WORKFLOW.md](../../archive/development/PHASE_3_WORKFLOW.md) – Stage 3 scope and acceptance criteria
- [SYSTEM_PRD.md](../SYSTEM_PRD.md) – Analytics requirements
- [functional-spec.md](../functional-spec.md) – API specifications
