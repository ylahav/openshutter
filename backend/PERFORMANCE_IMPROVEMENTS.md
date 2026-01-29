# Performance Improvements & Recommendations

## ✅ Completed Optimizations

### 1. Fixed N+1 Query in Albums Admin Controller
**File:** `backend/src/albums/albums-admin.controller.ts`
**Issue:** The `findAll` method was executing a separate `countDocuments` query for each album to count children.
**Fix:** Replaced with a single aggregation query that counts all children in one operation, then maps results.
**Impact:** Reduces from N+1 queries to 2 queries total (1 for albums, 1 for all child counts).

### 2. Fixed N+1 Query in People Controller
**File:** `backend/src/people/people.controller.ts`
**Issue:** When creating/updating persons with tags, the code was looping through tags and executing `findOne` for each tag.
**Fix:** Replaced with bulk operations:
- Bulk `find` with `$in` operator to get all existing tags at once
- Bulk `insertMany` to create missing tags in one operation
**Impact:** Reduces from N queries (one per tag) to 2 queries total (1 find, 1 insert if needed).

### 3. Added Pagination to Users Endpoint
**File:** `backend/src/users/users.controller.ts`
**Issue:** The `getUsers` endpoint was loading all users without pagination.
**Fix:** Added pagination support with `page` and `limit` query parameters.
**Impact:** Prevents loading thousands of users at once, reducing memory usage and response time.

## 📋 Recommended Database Indexes

The following indexes should be created to improve query performance:

### Albums Collection
```javascript
// Frequently queried: parentAlbumId + order (for sorting children)
db.albums.createIndex({ parentAlbumId: 1, order: 1 });

// Frequently queried: isPublic (for public album queries)
db.albums.createIndex({ isPublic: 1 });

// Frequently queried: createdBy (for user's albums)
db.albums.createIndex({ createdBy: 1 });

// Compound index for common query pattern: parentAlbumId + isPublic + order
db.albums.createIndex({ parentAlbumId: 1, isPublic: 1, order: 1 });
```

### Photos Collection
```javascript
// Frequently queried: albumId (for album photos)
db.photos.createIndex({ albumId: 1 });

// Frequently queried: albumId + isPublished (for public album photos)
db.photos.createIndex({ albumId: 1, isPublished: 1 });

// Frequently queried: uploadedBy (for user's photos)
db.photos.createIndex({ uploadedBy: 1 });

// Frequently queried: tags (for tag-based queries)
db.photos.createIndex({ tags: 1 });

// Frequently queried: people (for person-based queries)
db.photos.createIndex({ people: 1 });
```

### People Collection
```javascript
// Frequently queried: isActive (for filtering active people)
db.people.createIndex({ isActive: 1 });

// Frequently queried: tags (for tag-based queries)
db.people.createIndex({ tags: 1 });

// Text search on multilingual fields
db.people.createIndex({ 
  "firstName.en": "text", 
  "lastName.en": "text", 
  "fullName.en": "text",
  "firstName.he": "text",
  "lastName.he": "text",
  "fullName.he": "text"
});
```

### Locations Collection
```javascript
// Frequently queried: isActive (for filtering active locations)
db.locations.createIndex({ isActive: 1 });

// Frequently queried: category (for category filtering)
db.locations.createIndex({ category: 1 });

// Compound index for duplicate checking: name + city + country
db.locations.createIndex({ "name.en": 1, city: 1, country: 1 });
```

### Users Collection
```javascript
// Already exists: username (unique index)
// Recommended: role + blocked (for filtering)
db.users.createIndex({ role: 1, blocked: 1 });
```

### Tags Collection
```javascript
// Already exists: name (unique index)
// Recommended: isActive (for filtering)
db.tags.createIndex({ isActive: 1 });
```

### Pages Collection
```javascript
// Already exists: alias (unique index)
// Already exists: slug (unique index)
// Recommended: isPublished + category (for public pages)
db.pages.createIndex({ isPublished: 1, category: 1 });
```

## 🔍 Additional Performance Recommendations

### 1. Consider Caching
- Cache frequently accessed data (album hierarchies, user sessions)
- Use Redis or in-memory cache for expensive queries
- Implement cache invalidation strategies

### 2. Query Optimization
- Use `select()` to limit fields returned from database
- Use `lean()` in Mongoose queries when full document features aren't needed
- Consider using aggregation pipelines for complex queries

### 3. Batch Operations
- When processing multiple items, use bulk operations (`insertMany`, `updateMany`, `deleteMany`)
- Group similar operations together

### 4. Connection Pooling
- Ensure MongoDB connection pool is properly configured
- Monitor connection pool usage

### 5. Monitoring
- Add query performance logging for slow queries (>100ms)
- Monitor database query patterns
- Set up alerts for N+1 query patterns

## 📝 Notes

- Indexes improve read performance but slightly slow down writes
- Monitor index usage with `db.collection.getIndexes()` and `explain()` queries
- Drop unused indexes to improve write performance
- Compound indexes should match query patterns (order matters)
