# API Marketplace Design Document

**Stage:** 4.1 Design  
**Status:** Design Complete  
**Date:** 2026-02-18

## Overview

This document defines the design for Stage 4: API Marketplace, enabling third-party integrations via a documented, versioned public API and a marketplace/directory of integrations.

---

## Goals

1. **Public API:** Expose a subset of OpenShutter functionality via a versioned, documented REST API
2. **Developer Experience:** Provide tools and documentation for third-party developers
3. **Marketplace:** Create a directory of approved integrations, plugins, and apps
4. **Security:** Implement API key authentication with scopes and rate limiting
5. **Scalability:** Design for future growth and API versioning

---

## API Surface Design

### Public API Endpoints

The public API (`/api/v1/`) exposes read-only and limited write operations for third-party integrations.

#### Read-Only Endpoints (Public)

**Albums:**
- `GET /api/v1/albums` - List public albums (with access control)
- `GET /api/v1/albums/:id` - Get album details
- `GET /api/v1/albums/:id/photos` - List photos in album
- `GET /api/v1/albums/by-alias/:alias` - Get album by alias

**Photos:**
- `GET /api/v1/photos` - List photos (paginated, filtered by access)
- `GET /api/v1/photos/:id` - Get photo details
- `GET /api/v1/photos/:id/metadata` - Get photo metadata (EXIF, IPTC, etc.)

**Search:**
- `GET /api/v1/search` - Search photos, albums, people, locations
- `POST /api/v1/search` - Advanced search with filters

**Tags:**
- `GET /api/v1/tags` - List all tags
- `GET /api/v1/tags/:id` - Get tag details

**People:**
- `GET /api/v1/people` - List all people
- `GET /api/v1/people/:id` - Get person details

**Locations:**
- `GET /api/v1/locations` - List all locations
- `GET /api/v1/locations/:id` - Get location details

**Pages:**
- `GET /api/v1/pages` - List published pages
- `GET /api/v1/pages/:slug` - Get page by slug

#### Write Endpoints (Scoped)

**Tags (write scope required):**
- `POST /api/v1/photos/:id/tags` - Add tags to photo
- `DELETE /api/v1/photos/:id/tags/:tagId` - Remove tag from photo

**Metadata (write scope required):**
- `PUT /api/v1/photos/:id/metadata` - Update photo metadata (limited fields)

**Note:** Write operations are restricted to specific scopes and may require additional permissions based on album access control.

### Excluded from Public API

The following endpoints remain **admin-only** and are not exposed in the public API:

- User management (`/api/admin/users/*`)
- System configuration (`/api/admin/site-config/*`)
- Storage management (`/api/admin/storage/*`)
- Analytics (`/api/admin/analytics/*`)
- Backup/restore (`/api/admin/backup/*`)
- Migration (`/api/admin/migration/*`)
- Deployment (`/api/admin/deployment/*`)
- Database initialization (`/api/admin/database-init/*`)

### Access Control

Public API endpoints respect existing album access control:
- **Public albums:** Accessible to all API keys
- **Private albums:** Require API key with appropriate user context or `album:read` scope
- **Owner albums:** Require API key associated with album owner

---

## Versioning Strategy

### Version Format

- **Current version:** `v1`
- **URL pattern:** `/api/v1/*`
- **Future versions:** `/api/v2/*`, `/api/v3/*`, etc.

### Versioning Rules

1. **Breaking changes** require a new major version (e.g., `v1` → `v2`)
2. **Non-breaking additions** can be added to the current version
3. **Deprecation:** Endpoints marked as deprecated remain available for at least 6 months
4. **Version header:** Optional `X-API-Version` header to specify version (defaults to latest)

### Version Lifecycle

- **Active:** Fully supported, receives updates
- **Deprecated:** Still supported but will be removed in future version
- **Sunset:** No longer supported, returns 410 Gone

---

## Authentication

### API Key Authentication

**Method:** API keys sent via HTTP header or query parameter

**Header format:**
```
Authorization: Bearer {api_key}
```

**Query parameter format (alternative):**
```
?api_key={api_key}
```

**Preference:** Header format is preferred; query parameter supported for compatibility.

### API Key Structure

**Format:** `osk_{environment}_{random_32_chars}`
- Prefix: `osk_` (OpenShutter Key)
- Environment: `prod`, `dev`, `test`
- Random: 32-character alphanumeric string

**Example:** `osk_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### API Key Scopes

Scopes define what operations an API key can perform:

**Read Scopes:**
- `albums:read` - Read album data
- `photos:read` - Read photo data
- `tags:read` - Read tag data
- `people:read` - Read people data
- `locations:read` - Read location data
- `pages:read` - Read page data
- `search:read` - Perform searches

**Write Scopes:**
- `photos:write` - Modify photo metadata
- `tags:write` - Add/remove tags from photos

**Admin Scopes (restricted):**
- `admin:read` - Read admin data (future use)
- `admin:write` - Write admin data (future use)

**Scope Combinations:**
- Default scope: `read` (all read operations)
- Full access: `read,write` (all read and write operations)
- Custom: Any combination of specific scopes

### API Key Management

**Creation:**
- Created by authenticated users (admin or owner) via developer portal
- User can create multiple API keys with different scopes
- Keys can be named/described for organization

**Storage:**
- Stored in `api_keys` collection
- Fields: `key`, `userId`, `name`, `description`, `scopes[]`, `createdAt`, `lastUsedAt`, `expiresAt`, `isActive`
- Keys are hashed before storage (SHA-256)

**Validation:**
- Check key exists and is active
- Verify key hasn't expired
- Validate scopes match requested operation
- Update `lastUsedAt` timestamp

**Revocation:**
- Keys can be deactivated by owner or admin
- Deactivated keys return 401 Unauthorized
- Expired keys return 401 Unauthorized

---

## Rate Limiting

### Rate Limit Strategy

**Tier-based limits:**

| Tier | Requests/Minute | Requests/Hour | Requests/Day |
|------|----------------|---------------|--------------|
| Free | 60 | 1,000 | 10,000 |
| Basic | 300 | 10,000 | 100,000 |
| Pro | 1,000 | 50,000 | 500,000 |
| Enterprise | Custom | Custom | Custom |

**Rate limit headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995200
```

**Response on limit exceeded:**
```json
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded. Try again in 15 seconds.",
  "retryAfter": 15
}
```
HTTP Status: `429 Too Many Requests`

### Implementation

- **Storage:** Redis for rate limit counters (or in-memory for single-instance)
- **Key format:** `rate_limit:{api_key}:{window}`
- **Window:** Sliding window or fixed window per minute/hour/day
- **Reset:** Automatic reset at window boundary

---

## OpenAPI/Swagger Documentation

### Documentation Generation

**Tool:** `@nestjs/swagger` for automatic OpenAPI generation

**Endpoints:**
- `/api/v1/docs` - Interactive Swagger UI
- `/api/v1/docs/json` - OpenAPI JSON specification
- `/api/v1/docs/yaml` - OpenAPI YAML specification

### Documentation Structure

1. **Overview:** API introduction, authentication, rate limits
2. **Endpoints:** Grouped by resource (albums, photos, tags, etc.)
3. **Schemas:** Request/response models
4. **Examples:** Sample requests and responses
5. **Error Codes:** Standard error responses

### Documentation Features

- Interactive API explorer
- Try-it-out functionality (with API key input)
- Code samples (cURL, JavaScript, Python, etc.)
- Downloadable OpenAPI spec

---

## Developer Portal

### Features

**1. Registration & Authentication**
- Developer account creation
- Email verification
- Login/logout
- Password reset

**2. API Key Management**
- Create new API keys
- View existing keys (masked display)
- Edit key name/description
- Revoke/deactivate keys
- View key usage statistics

**3. Documentation**
- Interactive API documentation
- Getting started guide
- Code examples and tutorials
- Changelog and version history

**4. Usage Analytics**
- Request count over time
- Endpoint usage breakdown
- Error rate monitoring
- Rate limit status

**5. Support**
- FAQ section
- Contact form
- Community forum link (if applicable)
- Status page link

### Portal Routes

- `/developers` - Developer portal home
- `/developers/signup` - Developer registration
- `/developers/login` - Developer login
- `/developers/keys` - API key management
- `/developers/docs` - API documentation
- `/developers/analytics` - Usage analytics
- `/developers/support` - Support resources

---

## Marketplace

### Purpose

A curated directory of approved integrations, plugins, scripts, and applications that use the OpenShutter API.

### Marketplace Structure

**Categories:**
- **Integrations:** Third-party service integrations (e.g., WordPress plugin, Zapier)
- **Tools:** Developer tools and utilities
- **Apps:** Mobile or desktop applications
- **Scripts:** Automation scripts and workflows
- **Themes:** Custom gallery themes

**Listing Fields:**
- Name
- Description
- Category
- Developer/Author
- Version
- Compatibility (API version)
- Screenshots/Demo
- Documentation link
- Download/Install link
- Rating/Reviews (future)

### Marketplace Management

**Submission Process:**
1. Developer submits integration via form
2. Admin reviews submission
3. Approval/rejection with feedback
4. Published listing

**Maintenance:**
- Admin can edit/update listings
- Developers can update their own listings
- Automatic compatibility checks (API version)
- Deprecation notices for outdated integrations

### Marketplace Routes

- `/marketplace` - Marketplace home (all listings)
- `/marketplace/category/:category` - Filtered by category
- `/marketplace/:id` - Individual listing details
- `/marketplace/submit` - Submission form (authenticated)

---

## Data Models

### API Key Model

```typescript
interface ApiKey {
  _id: ObjectId;
  key: string; // Hashed
  userId: ObjectId;
  name: string;
  description?: string;
  scopes: string[];
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  rateLimitTier: 'free' | 'basic' | 'pro' | 'enterprise';
}
```

### Marketplace Listing Model

```typescript
interface MarketplaceListing {
  _id: ObjectId;
  name: string;
  description: string;
  category: 'integration' | 'tool' | 'app' | 'script' | 'theme';
  developerName: string;
  developerEmail: string;
  version: string;
  apiVersionCompatible: string[]; // ['v1', 'v2']
  screenshots: string[];
  documentationUrl?: string;
  downloadUrl?: string;
  repositoryUrl?: string;
  isApproved: boolean;
  submittedBy: ObjectId; // userId
  approvedBy?: ObjectId; // admin userId
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Rate Limit Model (Redis)

```
Key: rate_limit:{api_key}:{window}
Value: { count: number, resetAt: timestamp }
TTL: window duration
```

---

## Security Considerations

### API Key Security

1. **Storage:** Keys stored as SHA-256 hashes
2. **Transmission:** HTTPS only (TLS 1.2+)
3. **Exposure:** Never log full keys; mask in UI
4. **Rotation:** Support key rotation without downtime
5. **Leakage:** Monitor for exposed keys; auto-revoke if detected

### Input Validation

1. **Sanitization:** All inputs validated and sanitized
2. **SQL Injection:** Not applicable (MongoDB)
3. **XSS:** Output encoding for all responses
4. **Path Traversal:** Validate file paths and IDs
5. **Rate Limiting:** Prevent abuse and DDoS

### Access Control

1. **Scope Enforcement:** Strict scope checking per endpoint
2. **Album Access:** Respect existing album access rules
3. **User Context:** API keys inherit user permissions where applicable
4. **Admin Operations:** Never expose admin endpoints

---

## Error Handling

### Standard Error Response

```json
{
  "error": {
    "code": "error_code",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `invalid_api_key` | 401 | API key is invalid or expired |
| `insufficient_scope` | 403 | API key lacks required scope |
| `rate_limit_exceeded` | 429 | Rate limit exceeded |
| `not_found` | 404 | Resource not found |
| `validation_error` | 400 | Request validation failed |
| `server_error` | 500 | Internal server error |

---

## Implementation Plan

### Phase 1: Core API Infrastructure
1. API versioning middleware (`/api/v1/`)
2. API key authentication guard
3. Scope validation middleware
4. Rate limiting middleware
5. Error handling standardization

### Phase 2: Public Endpoints
1. Expose read-only endpoints
2. Implement write endpoints with scope checks
3. Add access control integration
4. Comprehensive testing

### Phase 3: Developer Portal
1. Developer registration/login
2. API key management UI
3. Documentation integration
4. Usage analytics dashboard

### Phase 4: Marketplace
1. Marketplace listing model
2. Submission and approval workflow
3. Marketplace UI
4. Integration directory

### Phase 5: Documentation & Polish
1. OpenAPI/Swagger generation
2. Code examples and tutorials
3. Developer guides
4. Marketing materials

---

## Success Metrics

- **API Adoption:** Number of registered developers
- **Usage:** API request volume and growth
- **Marketplace:** Number of published integrations
- **Developer Satisfaction:** Support ticket volume and response time
- **Reliability:** API uptime and error rate

---

## Future Considerations

1. **OAuth 2.0:** Add OAuth support for more complex integrations
2. **Webhooks:** Event notifications for third-party systems
3. **GraphQL:** Alternative API interface
4. **SDKs:** Official SDKs for popular languages
5. **Sandbox Environment:** Test environment for developers
6. **API Analytics:** Advanced analytics for API usage
7. **Partner Program:** Revenue sharing for marketplace integrations

---

## References

- [NestJS Documentation](https://docs.nestjs.com/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [REST API Best Practices](https://restfulapi.net/)
- [API Security Best Practices](https://owasp.org/www-project-api-security/)

---

## Approval

**Design Status:** ✅ Complete  
**Next Step:** Stage 4.2 Implementation
