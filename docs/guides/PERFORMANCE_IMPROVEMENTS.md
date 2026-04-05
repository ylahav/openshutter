# Performance Improvements & Recommendations

## Completed Optimizations

### 1. Fixed N+1 Query in Albums Admin Controller
**File:** `backend/src/albums/albums-admin.controller.ts`
**Issue:** The `findAll` method was executing a separate `countDocuments` query for each album to count children.
**Fix:** Replaced with a single aggregation query that counts all children in one operation, then maps results.
**Impact:** Reduces from N+1 queries to 2 queries total (1 for albums, 1 for all child counts).

### 2. Fixed N+1 Query in People Controller
**File:** `backend/src/people/people.controller.ts`
**Issue:** When creating/updating persons with tags, the code was looping through tags and executing `findOne` for each tag.
**Fix:** Replaced with bulk operations: bulk `find` with `$in` and bulk `insertMany` for missing tags.
**Impact:** Reduces from N queries to 2 queries total.

### 3. Added Pagination to Users Endpoint
**File:** `backend/src/users/users.controller.ts`
**Fix:** Added pagination with `page` and `limit` query parameters.
**Impact:** Prevents loading thousands of users at once.

## Recommended Database Indexes

See backend codebase for exact index definitions. Key collections: albums (parentAlbumId, order, isPublic, createdBy), photos (albumId, isPublished, uploadedBy, tags, people), people (isActive, tags), locations (isActive, category), users (role, blocked), tags (isActive), pages (isPublished, category).

## Additional Recommendations

- **Caching**: Cache album hierarchies, user sessions; consider Redis.
- **Query optimization**: Use `select()` and `lean()` in Mongoose where appropriate.
- **Batch operations**: Use `insertMany`, `updateMany`, `deleteMany` for bulk work.
- **Monitoring**: Log slow queries (>100ms), monitor N+1 patterns.

## Notes

- Indexes improve reads but slightly slow writes. Monitor with `getIndexes()` and `explain()`.
- Compound index field order should match query patterns.
