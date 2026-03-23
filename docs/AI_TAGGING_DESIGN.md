# AI-Powered Photo Tagging Design

**Phase 3 Stage 2.** This document defines the design, API contract, and implementation approach for AI-powered photo tagging.

---

## 1. Overview

Automate or assist photo tagging using AI (object/scene recognition, keyword extraction) to suggest or apply tags. The system will suggest tags per photo or batch, with optional auto-apply based on confidence thresholds, while respecting the existing tag taxonomy (categories, existing tags).

---

## 2. Goals

- **Assist tagging**: Suggest relevant tags based on photo content analysis
- **Batch processing**: Support bulk tag suggestions for multiple photos
- **User control**: All suggestions require user approval; no forced auto-apply
- **Taxonomy integration**: Respect existing tag categories and suggest tags that fit the current taxonomy
- **Performance**: Efficient processing with queue support for batch jobs
- **Privacy**: Support both local models (privacy-first) and external APIs (convenience)

---

## 3. Model Options

### 3.1 Local Model Approach

**Pros:**
- Complete privacy (no data leaves the server)
- No API costs
- No rate limits
- Works offline

**Cons:**
- Requires GPU/CPU resources
- Initial setup complexity
- May have lower accuracy than cloud APIs
- Model storage requirements

**Options:**
- **TensorFlow.js** with pre-trained models (e.g., MobileNet, COCO-SSD)
- **ONNX Runtime** with image classification models
- **Transformers.js** for vision-language models

**Recommended:** Start with TensorFlow.js + MobileNet for object detection (lightweight, runs in Node.js)

### 3.2 External API Approach

**Pros:**
- High accuracy
- No local resource requirements
- Easy to integrate
- Regular model updates

**Cons:**
- API costs per request
- Rate limits
- Privacy concerns (images sent to third party)
- Requires internet connection

**Options:**
- **Google Cloud Vision API** (labels, objects, text detection)
- **AWS Rekognition** (labels, objects, scenes)
- **Azure Computer Vision** (tags, objects, descriptions)
- **Clarifai** (general purpose, good free tier)

**Recommended:** Support Google Cloud Vision API as primary option (good accuracy, reasonable pricing)

### 3.3 Hybrid Approach (Recommended)

- **Default**: Local model (TensorFlow.js) for privacy-first operation
- **Optional**: External API (Google Cloud Vision) for higher accuracy when configured
- Admin can choose per-installation via configuration

---

## 4. Tag Mapping Strategy

### 4.1 Raw Labels to Tags

AI models return raw labels (e.g., "dog", "beach", "sunset"). These need to be mapped to existing tags in the repository:

1. **Exact match**: Check if a tag with the same name exists (case-insensitive)
2. **Fuzzy match**: Use string similarity (Levenshtein distance) to find close matches
3. **Category mapping**: Map common labels to tag categories (e.g., "dog" → "object", "beach" → "location")
4. **Create new tags**: If no match found and confidence is high, optionally create new tags (configurable)

### 4.2 Confidence Thresholds

- **High confidence (≥0.8)**: Auto-suggest, can be auto-applied if enabled
- **Medium confidence (0.5-0.8)**: Suggest for review
- **Low confidence (<0.5)**: Don't suggest (configurable threshold)

### 4.3 Tag Categories

Respect existing tag categories:
- `general`: Generic tags (e.g., "nature", "urban")
- `location`: Places (e.g., "beach", "mountain")
- `event`: Events (e.g., "wedding", "birthday")
- `object`: Objects (e.g., "dog", "car", "building")
- `mood`: Mood/atmosphere (e.g., "sunset", "foggy", "bright")
- `technical`: Technical (e.g., "macro", "panorama", "HDR")
- `custom`: User-defined categories

---

## 5. API Design

### 5.1 Single Photo Tag Suggestion

**Endpoint:** `POST /api/admin/photos/:id/suggest-tags`

**Request:**
```json
{
  "provider": "local" | "google-vision" | "auto",
  "minConfidence": 0.5,
  "maxSuggestions": 10,
  "createNewTags": false
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "label": "dog",
      "confidence": 0.92,
      "category": "object",
      "matchedTag": {
        "id": "tag-id-123",
        "name": { "en": "Dog", "he": "כלב" }
      },
      "isNewTag": false
    },
    {
      "label": "beach",
      "confidence": 0.85,
      "category": "location",
      "matchedTag": null,
      "isNewTag": true
    }
  ],
  "provider": "local",
  "processingTime": 1.2
}
```

### 5.2 Bulk Tag Suggestion

**Endpoint:** `POST /api/admin/photos/bulk-suggest-tags`

**Request:**
```json
{
  "photoIds": ["id1", "id2", "id3"],
  "provider": "local" | "google-vision" | "auto",
  "minConfidence": 0.5,
  "maxSuggestions": 10,
  "createNewTags": false
}
```

**Response:**
```json
{
  "jobId": "job-uuid-123",
  "status": "queued",
  "totalPhotos": 3
}
```

**Status Endpoint:** `GET /api/admin/photos/bulk-suggest-tags/:jobId`

**Response:**
```json
{
  "jobId": "job-uuid-123",
  "status": "running" | "completed" | "failed",
  "progress": {
    "processed": 2,
    "total": 3,
    "current": "photo-id-2"
  },
  "results": [
    {
      "photoId": "id1",
      "suggestions": [...]
    }
  ],
  "error": null
}
```

### 5.3 Apply Suggested Tags

**Endpoint:** `POST /api/admin/photos/:id/apply-tags`

**Request:**
```json
{
  "tagIds": ["tag-id-1", "tag-id-2"],
  "createNewTags": [
    {
      "name": { "en": "Beach" },
      "category": "location"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "appliedTags": ["tag-id-1", "tag-id-2", "new-tag-id"],
  "createdTags": ["new-tag-id"]
}
```

---

## 6. Configuration

### 6.1 Environment Variables

```bash
# AI Tagging Provider
AI_TAGGING_PROVIDER=local|google-vision|disabled

# Google Cloud Vision API (if using external API)
GOOGLE_CLOUD_VISION_API_KEY=your-api-key
GOOGLE_CLOUD_VISION_PROJECT_ID=your-project-id

# Local Model Configuration
AI_TAGGING_LOCAL_MODEL_PATH=./models/mobilenet
AI_TAGGING_MIN_CONFIDENCE=0.5
AI_TAGGING_MAX_SUGGESTIONS=10

# Tag Creation
AI_TAGGING_AUTO_CREATE_TAGS=false
AI_TAGGING_AUTO_CREATE_MIN_CONFIDENCE=0.8

# Batch Processing
AI_TAGGING_BATCH_SIZE=10
AI_TAGGING_QUEUE_ENABLED=true
```

### 6.2 Site Config (Admin UI)

- **Enable AI Tagging**: Toggle to enable/disable feature
- **Provider Selection**: Dropdown (Local / Google Vision / Disabled)
- **Min Confidence**: Slider (0.0 - 1.0)
- **Max Suggestions**: Number input (1-20)
- **Auto-create Tags**: Checkbox
- **Auto-create Min Confidence**: Slider (0.0 - 1.0)
- **Default Category**: Dropdown (tag categories)

---

## 7. Integration Points

### 7.1 Photo Upload Pipeline

- **Optional**: Auto-suggest tags after upload completes
- **Configurable**: Only for photos uploaded by admins, or all users
- **UI**: Show suggestions in upload success dialog

### 7.2 Photo Edit Page

- **Button**: "Suggest Tags" button in tag section
- **UI**: Show suggestions in a modal/drawer with accept/reject
- **Apply**: Selected suggestions applied immediately

### 7.3 Bulk Operations

- **Album Page**: Select photos → "Suggest Tags" bulk action
- **UI**: Show progress and results in a modal
- **Review**: User reviews all suggestions before applying

---

## 8. Implementation Plan

### 8.1 Backend

1. **AI Tagging Service** (`src/services/ai-tagging.service.ts`)
   - Abstract interface for different providers
   - Local model implementation (TensorFlow.js)
   - Google Vision API implementation
   - Tag mapping logic

2. **Tag Mapping Service** (`src/services/tag-mapping.service.ts`)
   - Exact/fuzzy matching against existing tags
   - Category assignment
   - Tag creation logic

3. **Queue Service** (for batch operations)
   - Job queue for bulk tag suggestions
   - Progress tracking
   - Error handling

4. **API Controllers**
   - `POST /api/admin/photos/:id/suggest-tags`
   - `POST /api/admin/photos/bulk-suggest-tags`
   - `GET /api/admin/photos/bulk-suggest-tags/:jobId`
   - `POST /api/admin/photos/:id/apply-tags`

### 8.2 Frontend

1. **AI Tagging Components**
   - `SuggestTagsButton.svelte` - Button to trigger suggestions
   - `TagSuggestionsModal.svelte` - Modal showing suggestions with accept/reject
   - `BulkSuggestTagsDialog.svelte` - Bulk operation dialog with progress

2. **Integration**
   - Photo edit page: Add "Suggest Tags" button
   - Album page: Add "Suggest Tags" to bulk actions
   - Upload page: Optional auto-suggest after upload

3. **Configuration UI**
   - Site Config: AI Tagging section
   - Provider selection, confidence thresholds, etc.

### 8.3 Models & Dependencies

**Local Model:** ✅ Implemented
- `@tensorflow/tfjs-node` - TensorFlow.js for Node.js
- `@tensorflow-models/mobilenet` - MobileNet v2 model with ImageNet class names
- Pre-trained MobileNet v2 model (loads on first use, cached for subsequent requests)
- Image preprocessing with Sharp (resize to 224x224, RGB conversion)
- Returns predictions with class names and confidence scores from 1000 ImageNet classes

**Node.js 23+:** `@tensorflow/tfjs-node` 4.22.x still calls Node’s removed `util.isNullOrUndefined` (and may expect `util.isArray`), which causes `TypeError: (0 , util_1.isNullOrUndefined) is not a function` when loading MobileNet. The backend imports `backend/src/services/ai-tagging/tfjs-node-util-polyfill.ts` before any `import('@tensorflow/tfjs-node')` to restore those helpers. **Alternative:** run the API on **Node.js 22 LTS** without the polyfill.

**External API:**
- `@google-cloud/vision` - Google Cloud Vision API client

---

## 9. Storage Support

- **Local storage:** Photo file path is resolved from storage config (base path + relative path) and read directly.
- **Google Drive (and other remote providers):** Photo is downloaded via `StorageManager.getPhotoBuffer()` to a temporary file in the system temp directory, processed for AI tagging, then the temp file is deleted. Supports single-photo and bulk suggest-tags.
- **Extensibility:** Any storage provider that implements `getFileBuffer()` can be used for AI tagging without further backend changes.

---

## 10. Privacy & Security

- **Local Model**: No data leaves the server (privacy-first)
- **External API**: Images sent to third party (admin must consent)
- **Admin Only**: All AI tagging endpoints require admin role
- **Rate Limiting**: Prevent abuse of external APIs
- **Cost Controls**: Configurable limits for external API usage

---

## 11. Performance Considerations

- **Caching**: Cache model loading (local) and API responses (external)
- **Batch Processing**: Queue system for bulk operations
- **Async Processing**: Non-blocking tag suggestions
- **Image Optimization**: Resize images before processing (if needed)
- **Rate Limiting**: Respect API rate limits for external providers
- **Temp files**: Remote storage (e.g. Google Drive) uses temp files; they are always cleaned up in a `finally` block.

---

## 12. Testing Strategy

1. **Unit Tests**: Tag mapping, confidence filtering, category assignment
2. **Integration Tests**: API endpoints with mock AI responses
3. **E2E Tests**: Full flow from photo upload → suggest → apply tags
4. **Performance Tests**: Batch processing with 100+ photos
5. **Model Tests**: Verify local model accuracy with sample images

---

## 13. Future Enhancements

- **Multi-language tag names**: Use AI to suggest tag names in multiple languages
- **Context-aware suggestions**: Consider album context, existing tags on similar photos
- **Learning**: Track which suggestions are accepted/rejected to improve accuracy
- **Custom models**: Allow admins to train custom models on their photo collection
- **IPTC/XMP integration**: Extract tags from existing metadata first, then enhance with AI

---

## 14. References

- [PHASE_3_WORKFLOW.md](./PHASE_3_WORKFLOW.md) – Stage 2 scope and acceptance criteria
- [SYSTEM_PRD.md](./SYSTEM_PRD.md) – Tag system requirements
- [functional-spec.md](./functional-spec.md) – API specifications
