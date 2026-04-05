# Smart Tag Suggestions & Tag-Based Search Optimization Design Document

**Stage:** Phase 3 Stage 6  
**Status:** Design Complete  
**Date:** 2026-02-19

## Overview

This document defines the design for Stage 6: Smart Tag Suggestions & Tag-Based Search Optimization. This stage improves tagging workflows by suggesting tags based on context (similar photos, metadata, location) and optimizes search performance for tag-based queries.

---

## Goals

1. **Context-Based Tag Suggestions:** Suggest tags based on:
   - Tags from similar photos (same album, same location, similar metadata)
   - IPTC/XMP keywords from photo metadata
   - Location-based suggestions
   - Existing tag patterns in the repository

2. **Search Optimization:** Improve performance and relevance for tag-based queries:
   - Optimize database indexes for tag queries
   - Improve query performance for tag filters
   - Enhance relevance scoring for tag-based searches

---

## Context-Based Tag Suggestions

### 1. Suggestion Sources

#### 1.1 Similar Photos Analysis

**Logic:**
- Find photos in the same album (`albumId` match)
- Find photos with the same location (`location` match)
- Find photos with similar EXIF metadata (same camera make/model, similar date/time)
- Extract tags from these similar photos
- Rank tags by frequency across similar photos

**Algorithm:**
1. Query photos with matching `albumId` → get their tags
2. Query photos with matching `location` → get their tags
3. Query photos with similar EXIF (same `exif.make` and `exif.model`) → get their tags
4. Aggregate tag frequencies
5. Filter out tags already on the target photo
6. Sort by frequency (most common first)
7. Return top N suggestions (default: 10)

#### 1.2 IPTC/XMP Keywords

**Logic:**
- Extract keywords from `iptcXmp.keywords` (array or comma-separated string)
- Map keywords to existing tags (exact match, then fuzzy match)
- Suggest tags that match IPTC keywords

**Algorithm:**
1. Extract keywords from `photo.iptcXmp?.keywords`
2. For each keyword:
   - Try exact match against existing tag names (case-insensitive)
   - If no match, try fuzzy match (Levenshtein distance ≤ 2)
   - If match found, suggest the tag
3. Return matched tags

#### 1.3 Location-Based Suggestions

**Logic:**
- If photo has a `location` reference, find other photos at the same location
- Extract common tags from those photos
- Suggest location-specific tags (e.g., tags commonly used for photos at "Paris")

**Algorithm:**
1. If `photo.location` exists:
   - Query photos with same `location` ObjectId
   - Extract tags from those photos
   - Count tag frequencies
   - Filter out tags already on target photo
   - Return top N location-specific tags

#### 1.4 Repository-Wide Tag Patterns

**Logic:**
- Analyze tag co-occurrence patterns (tags that often appear together)
- When a photo has certain tags, suggest commonly co-occurring tags

**Algorithm:**
1. For each tag on the photo, find photos with that tag
2. Extract all other tags from those photos
3. Count co-occurrence frequencies
4. Sort by frequency
5. Return top N co-occurring tags

### 2. Suggestion Ranking

**Priority Order:**
1. **High priority:** Tags from similar photos (same album + same location)
2. **Medium priority:** Tags from IPTC keywords (exact matches)
3. **Medium priority:** Tags from location-based analysis
4. **Low priority:** Tags from repository-wide co-occurrence patterns

**Scoring:**
- Similar photos: base score = frequency × 2
- IPTC keywords: base score = 1.5 (exact match) or 1.0 (fuzzy match)
- Location-based: base score = frequency × 1.5
- Co-occurrence: base score = frequency × 1.0

**Final ranking:** Sort by score descending, limit to top 10-15 suggestions.

### 3. API Design

#### 3.1 Endpoint: Get Context-Based Tag Suggestions

**Endpoint:** `GET /api/admin/photos/:id/suggest-tags-from-context`

**Query Parameters:**
- `maxSuggestions` (optional, default: 10): Maximum number of suggestions to return
- `sources` (optional, default: all): Comma-separated list of sources to use (`similar`, `iptc`, `location`, `cooccurrence`)

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "tagId": "507f1f77bcf86cd799439011",
        "tagName": "sunset",
        "category": "mood",
        "source": "similar", // "similar" | "iptc" | "location" | "cooccurrence"
        "score": 3.5,
        "reason": "Found on 3 photos in the same album"
      }
    ],
    "sources": {
      "similar": 5,
      "iptc": 2,
      "location": 3,
      "cooccurrence": 0
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Photo not found"
}
```

### 4. Integration with Existing AI Tagging

**Relationship to Stage 2 (AI Tagging):**
- AI tagging suggests tags based on **image content** (visual analysis)
- Context-based suggestions suggest tags based on **metadata and patterns** (non-visual analysis)
- Both can be used together:
  - AI suggestions: "What's in the photo?" (objects, scenes)
  - Context suggestions: "What tags are commonly used for similar photos?" (patterns, metadata)

**UI Integration:**
- Show both AI suggestions and context suggestions in separate sections
- Allow users to combine suggestions from both sources
- Context suggestions can complement AI suggestions

---

## Tag-Based Search Optimization

### 1. Current Search Implementation

**Current State:**
- Search service (`SearchService`) supports tag filtering via `tags` array in filters
- Tag queries use MongoDB `$in` operator on `tags` array field
- No specialized indexing for tag-based queries

**Performance Considerations:**
- Tag queries may be slow on large photo collections
- No relevance scoring for tag-based queries
- Full-text search doesn't prioritize tag matches

### 2. Optimization Strategies

#### 2.1 Database Indexing

**Indexes to Add:**
```javascript
// Compound index for tag queries with album filtering
PhotoSchema.index({ tags: 1, albumId: 1, isPublished: 1 })

// Index for tag queries with location filtering
PhotoSchema.index({ tags: 1, location: 1, isPublished: 1 })

// Index for tag queries with date filtering
PhotoSchema.index({ tags: 1, 'exif.dateTime': 1, isPublished: 1 })
```

**Benefits:**
- Faster queries when filtering by tags + album/location/date
- Better query plan selection by MongoDB

#### 2.2 Query Optimization

**Current Query:**
```javascript
{ tags: { $in: tagIds }, isPublished: true }
```

**Optimized Query:**
- Use compound indexes when additional filters are present
- Limit result set early with indexes
- Use aggregation pipeline for complex tag queries

**Example Optimized Query:**
```javascript
// When filtering by tags + album
{ tags: { $in: tagIds }, albumId: albumId, isPublished: true }
// Uses compound index: { tags: 1, albumId: 1, isPublished: 1 }
```

#### 2.3 Relevance Scoring

**Tag Match Scoring:**
- Exact tag match: score = 1.0
- Multiple tag matches: score = sum of individual matches
- Tag + album match: bonus score (+0.2)
- Tag + location match: bonus score (+0.2)

**Implementation:**
- Use MongoDB aggregation pipeline with `$addFields` to compute relevance scores
- Sort by relevance score descending
- Return top N results

**Example Aggregation:**
```javascript
[
  { $match: { tags: { $in: tagIds }, isPublished: true } },
  {
    $addFields: {
      relevanceScore: {
        $add: [
          { $size: { $setIntersection: ['$tags', tagIds] } },
          { $cond: [{ $eq: ['$albumId', albumId] }, 0.2, 0] },
          { $cond: [{ $eq: ['$location', locationId] }, 0.2, 0] }
        ]
      }
    }
  },
  { $sort: { relevanceScore: -1 } },
  { $limit: limit }
]
```

#### 2.4 Full-Text Search Integration

**Current State:**
- Full-text search uses MongoDB text indexes on title/description
- Tag matches are not prioritized in full-text results

**Enhancement:**
- Boost relevance for photos that match both text query AND tag filters
- Use `$text` search with tag filters in `$match` stage

**Example:**
```javascript
[
  { $match: { $text: { $search: query }, tags: { $in: tagIds } } },
  { $sort: { score: { $meta: 'textScore' } } }
]
```

### 3. Performance Targets

**Query Performance Goals:**
- Tag-only queries: < 100ms for collections up to 100K photos
- Tag + album queries: < 150ms
- Tag + location queries: < 150ms
- Tag + text search queries: < 200ms

**Index Size:**
- Compound indexes should not exceed 10% of collection size
- Monitor index usage and remove unused indexes

---

## Implementation Plan

### Phase 1: Context-Based Tag Suggestions (Backend)

1. **Create `TagSuggestionService`:**
   - Method: `suggestTagsFromContext(photoId, options)`
   - Implement similar photos analysis
   - Implement IPTC keyword extraction
   - Implement location-based suggestions
   - Implement co-occurrence analysis
   - Combine and rank suggestions

2. **Add API Endpoint:**
   - `GET /api/admin/photos/:id/suggest-tags-from-context`
   - Validate photo exists and user has access
   - Return suggestions with sources and scores

3. **Testing:**
   - Unit tests for each suggestion source
   - Integration tests for endpoint
   - Performance tests for large collections

### Phase 2: Context-Based Tag Suggestions (Frontend)

1. **Update Photo Edit Page:**
   - Add "Suggest from context" button next to "Suggest tags" (AI)
   - Show context suggestions in a modal or inline section
   - Allow applying context suggestions similar to AI suggestions

2. **Update Tag Input Component:**
   - Add autocomplete that calls context suggestion endpoint
   - Show context suggestions as chips when typing
   - Allow selecting suggestions with keyboard/mouse

3. **UI/UX:**
   - Show suggestion source (similar, IPTC, location, co-occurrence)
   - Show suggestion score/reason
   - Allow filtering suggestions by source

### Phase 3: Search Optimization

1. **Add Database Indexes:**
   - Create compound indexes for tag queries
   - Monitor index usage
   - Remove unused indexes if needed

2. **Optimize Search Service:**
   - Update `SearchService.searchPhotos()` to use compound indexes
   - Add relevance scoring for tag-based queries
   - Integrate tag filters with full-text search

3. **Testing:**
   - Performance tests for tag queries
   - Verify query plans use indexes
   - Measure query latency improvements

---

## API Contract

### GET /api/admin/photos/:id/suggest-tags-from-context

**Request:**
```
GET /api/admin/photos/:id/suggest-tags-from-context?maxSuggestions=10&sources=similar,iptc,location
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "tagId": "507f1f77bcf86cd799439011",
        "tagName": "sunset",
        "category": "mood",
        "source": "similar",
        "score": 3.5,
        "reason": "Found on 3 photos in the same album"
      },
      {
        "tagId": "507f1f77bcf86cd799439012",
        "tagName": "beach",
        "category": "location",
        "source": "iptc",
        "score": 1.5,
        "reason": "Matched IPTC keyword: 'beach'"
      }
    ],
    "sources": {
      "similar": 5,
      "iptc": 2,
      "location": 3,
      "cooccurrence": 0
    }
  }
}
```

**Error Responses:**
- `404`: Photo not found
- `403`: User doesn't have access to photo
- `500`: Internal server error

---

## Acceptance Criteria

### Context-Based Tag Suggestions

- [ ] `GET /api/admin/photos/:id/suggest-tags-from-context` endpoint exists and works
- [ ] Suggestions include tags from similar photos (same album, location, EXIF)
- [ ] Suggestions include tags from IPTC/XMP keywords
- [ ] Suggestions include location-based tags
- [ ] Suggestions are ranked by relevance score
- [ ] Suggestions exclude tags already on the photo
- [ ] Frontend shows context suggestions in photo edit page
- [ ] Frontend shows context suggestions in tag input (autocomplete)
- [ ] Users can apply context suggestions similar to AI suggestions

### Search Optimization

- [ ] Database indexes are created for tag-based queries
- [ ] Tag queries use compound indexes when filtering by album/location/date
- [ ] Tag-based search performance meets targets (< 100-200ms)
- [ ] Relevance scoring improves result quality for tag queries
- [ ] Full-text search integrates with tag filters

---

## References

- [PHASE_3_WORKFLOW.md](../../archive/development/PHASE_3_WORKFLOW.md) – Stage 6 scope and acceptance criteria
- [AI_TAGGING_DESIGN.md](./AI_TAGGING_DESIGN.md) – Stage 2 AI tagging implementation
- [Search Service](../../../backend/src/search/search.service.ts) – Current search implementation
- [Photo Model](../../../backend/src/models/Photo.ts) – Photo schema with tags, location, IPTC metadata

---

## Approval

**Design Status:** ✅ Complete  
**Next Step:** Stage 6.2 Implementation
