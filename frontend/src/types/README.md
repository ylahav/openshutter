# OpenShutter Type System Documentation

## Overview

This document explains the centralized type system designed to eliminate interface duplication across the OpenShutter codebase. The system provides multiple type variants optimized for different use cases while maintaining backward compatibility.

## Type Hierarchy

```
Base Types (Database Models)
├── Album (Complete database model)
├── Photo (Complete database model)
└── Other models...

Template Types (Frontend Templates)
├── TemplateAlbum (String dates, template fields)
├── TemplatePhoto (String dates, template fields)
└── Component-specific types...

API Response Types (API Endpoints)
├── AlbumApiResponse (Computed fields, breadcrumbs)
├── PhotoApiResponse (EXIF data, URLs)
└── Paginated responses...

Legacy Types (Backward Compatibility)
├── LegacyAlbum (any types, simplified)
├── LegacyPhoto (any types, simplified)
└── Migration helpers...
```

## Type Categories

### 1. Base Types (`Album`, `Photo`)
- **Purpose**: Complete database models with all fields
- **Use Case**: Database operations, server-side processing
- **Features**: 
  - Proper `MultiLangText`/`MultiLangHTML` types
  - `Date` objects for timestamps
  - All database fields included

### 2. Template Types (`TemplateAlbum`, `TemplatePhoto`)
- **Purpose**: Frontend template compatibility
- **Use Case**: React components, template rendering
- **Features**:
  - String dates for JSON serialization
  - Additional template-specific fields
  - Backward compatibility with existing code

### 3. API Response Types (`AlbumApiResponse`, `PhotoApiResponse`)
- **Purpose**: API endpoint responses
- **Use Case**: REST API, data fetching
- **Features**:
  - Computed fields (childAlbumCount, totalPhotoCount)
  - Direct URLs for easy access
  - EXIF data and metadata
  - Navigation breadcrumbs

### 4. Component Types (`AlbumCardData`, `PhotoCardData`)
- **Purpose**: Specific component use cases
- **Use Case**: UI components, cards, grids
- **Features**:
  - Required fields for components
  - Optimized for rendering
  - Type-safe props

### 5. Legacy Types (`LegacyAlbum`, `LegacyPhoto`)
- **Purpose**: Backward compatibility
- **Use Case**: Gradual migration, existing code
- **Features**:
  - `any` types for flexible migration
  - Simplified structures
  - Easy conversion from existing code

## Usage Examples

### Template Components
```typescript
import { TemplateAlbum, TemplatePhoto } from '@/types'

// Gallery component
interface GalleryProps {
  albums: TemplateAlbum[]
  photos: TemplatePhoto[]
}

// Album card component
interface AlbumCardProps {
  album: TemplateAlbum
  onClick: (album: TemplateAlbum) => void
}
```

### API Endpoints
```typescript
import { AlbumApiResponse, PhotoApiResponse } from '@/types'

// API response
export async function GET(): Promise<AlbumApiResponse[]> {
  // Return albums with computed fields
}

// Photo API with EXIF data
export async function GET(): Promise<PhotoApiResponse[]> {
  // Return photos with EXIF and URLs
}
```

### Database Operations
```typescript
import { Album, Photo } from '@/types'

// Database operations use base types
async function createAlbum(album: Omit<Album, '_id'>): Promise<Album> {
  // Database operations
}
```

### Type Conversion
```typescript
import { Album, TemplateAlbum, isTemplateAlbum } from '@/types'

// Convert database model to template
function convertToTemplate(album: Album): TemplateAlbum {
  return {
    ...album,
    createdAt: album.createdAt.toISOString(),
    updatedAt: album.updatedAt.toISOString(),
    firstPhotoDate: album.firstPhotoDate?.toISOString(),
    lastPhotoDate: album.lastPhotoDate?.toISOString()
  }
}

// Type guards
function processAlbum(album: any) {
  if (isTemplateAlbum(album)) {
    // TypeScript knows this is TemplateAlbum
    console.log(album.createdAt) // string
  }
}
```

## Migration Strategy

### Phase 1: Update Imports
```typescript
// Before
interface Album { ... }
interface Photo { ... }

// After
import { TemplateAlbum, TemplatePhoto } from '@/types'
```

### Phase 2: Replace Types
```typescript
// Before
const albums: Album[] = await fetchAlbums()

// After
const albums: TemplateAlbum[] = await fetchAlbums()
```

### Phase 3: Remove Local Interfaces
```typescript
// Before
interface Album { ... } // Remove this
const albums: Album[] = ...

// After
import { TemplateAlbum } from '@/types'
const albums: TemplateAlbum[] = ...
```

## Type Safety Benefits

1. **Consistent Types**: All components use the same type definitions
2. **Better IntelliSense**: IDE provides accurate autocomplete
3. **Compile-time Errors**: Catch type mismatches before runtime
4. **Refactoring Safety**: Changes propagate automatically
5. **Documentation**: Types serve as living documentation

## Performance Benefits

1. **Reduced Bundle Size**: Eliminate duplicate interface definitions
2. **Better Tree Shaking**: Import only needed types
3. **Faster Compilation**: TypeScript processes fewer duplicate types
4. **Memory Efficiency**: Shared type definitions

## Best Practices

### 1. Use Appropriate Types
- **Templates**: Use `TemplateAlbum`/`TemplatePhoto`
- **APIs**: Use `AlbumApiResponse`/`PhotoApiResponse`
- **Database**: Use `Album`/`Photo`
- **Components**: Use `AlbumCardData`/`PhotoCardData`

### 2. Import Only What You Need
```typescript
// Good
import { TemplateAlbum } from '@/types'

// Avoid
import * as Types from '@/types'
```

### 3. Use Type Guards
```typescript
if (isTemplateAlbum(album)) {
  // TypeScript knows the type
}
```

### 4. Prefer Composition Over Inheritance
```typescript
// Good
interface GalleryProps {
  albums: TemplateAlbum[]
  photos: TemplatePhoto[]
}

// Avoid
interface GalleryProps extends TemplateAlbum {
  // Don't extend base types for props
}
```

## Troubleshooting

### Common Issues

1. **Type Mismatches**: Ensure you're using the correct type variant
2. **Missing Fields**: Check if you need API response types instead
3. **Date Handling**: Use template types for string dates
4. **Legacy Code**: Use legacy types during migration

### Debugging Tips

1. **Use Type Guards**: Check types at runtime
2. **Type Assertions**: Use `as` when you're certain of the type
3. **Console Logging**: Log types to understand structure
4. **IDE Inspection**: Use hover to see type information

## Future Enhancements

1. **GraphQL Types**: Add GraphQL-specific type variants
2. **Validation Types**: Add runtime validation types
3. **Form Types**: Add form-specific type variants
4. **State Types**: Add Redux/Zustand state types
5. **Test Types**: Add testing-specific type variants

---

This type system provides a solid foundation for eliminating duplication while maintaining flexibility and backward compatibility. Use it as a guide for refactoring existing code and building new features.
