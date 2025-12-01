// Common Form Types
export interface LoginFormData {
  email: string
  password: string
}

// Entity Types (for API responses)
export interface Person {
  _id: string
  firstName: { en?: string; he?: string }
  lastName: { en?: string; he?: string }
  fullName: { en?: string; he?: string }
  nickname?: { en?: string; he?: string }
  birthDate?: string
  description?: { en?: string; he?: string }
  profileImage?: {
    url: string
    storageProvider: string
    fileId: string
  }
  tags: (string | { _id: string; name: string; color?: string })[]
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Location {
  _id: string
  name: { en?: string; he?: string }
  description?: { en?: string; he?: string }
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  placeId?: string
  category: string
  isActive: boolean
  usageCount: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

// Storage Provider Types
export interface StorageProvider {
  _id: string
  name: string
  type: 'google-drive' | 'aws-s3' | 'local' | 'backblaze' | 'wasabi'
  config: StorageConfig
  isActive: boolean
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

export interface StorageConfig {
  googleDrive?: {
    clientId: string
    clientSecret: string
    refreshToken: string
    folderId: string
    accessToken?: string
    tokenExpiry?: Date
  }
  awsS3?: {
    bucket: string
    region: string
    accessKeyId: string
    secretAccessKey: string
  }
  local?: {
    path: string
    maxSize: number
  }
  backblaze?: {
    applicationKeyId: string
    applicationKey: string
    bucketName: string
    region: string
  }
  wasabi?: {
    accessKeyId: string
    secretAccessKey: string
    bucketName: string
    region: string
    endpoint: string
  }
}

// Album Types
import { MultiLangText, MultiLangHTML } from '@/types/multi-lang'

export interface Album {
  _id?: string
  name: MultiLangText
  alias: string // URL-friendly name, used for folder structure
  description?: MultiLangHTML
  isPublic: boolean
  isFeatured: boolean
  storageProvider: 'google-drive' | 'aws-s3' | 'local' | 'backblaze' | 'wasabi'
  storagePath: string // Full storage path like /parent/son/alias
  parentAlbumId?: string // Reference to parent album
  parentPath?: string // Path to parent like /parent/son
  level: number // Hierarchy level (0 = root, 1 = first level, etc.)
  order: number // Order within parent
  coverPhotoId?: string
  photoCount: number
  firstPhotoDate?: Date // Date of the earliest photo in the album
  lastPhotoDate?: Date // Date of the latest photo in the album
  createdAt: Date
  updatedAt: Date
  createdBy: string // ObjectId as string for API compatibility
  tags: string[]
  // Access control fields
  allowedGroups?: string[] // Array of group aliases that can access this album
  allowedUsers?: string[] // Array of user ObjectIds that can access this album
  metadata?: {
    location?: string
    date?: Date
    category?: string
    [key: string]: any
  }
}

// User/Group Types
export type UserRole = 'admin' | 'owner' | 'guest'

// Audit logging
export type AuditAction =
  | 'album.view.allow'
  | 'album.view.deny'
  | 'photo.view.allow'
  | 'photo.view.deny'

export interface AuditLogEntry {
  _id?: string
  timestamp: Date
  action: AuditAction
  userId?: string | null
  userRole?: UserRole | null
  ip?: string | null
  userAgent?: string | null
  resourceType: 'album' | 'photo'
  resourceId?: string | null
  resourceAlias?: string | null
  details?: Record<string, unknown>
}

export interface Group {
  _id?: string
  alias: string
  name: MultiLangText
  createdAt: Date
  updatedAt: Date
}

export interface User {
  _id?: string
  name: MultiLangText
  username: string // email
  passwordHash: string
  role: UserRole
  groupAliases: string[]
  blocked: boolean
  allowedStorageProviders: string[] // Array of storage provider IDs the user can use
  createdAt: Date
  updatedAt: Date
}

// Photo Types
export interface Photo {
  _id: string
  title: Record<string, string>
  description: Record<string, string>
  filename: string
  originalFilename: string
  mimeType: string
  size: number
  originalSize?: number
  compressionRatio?: number
  dimensions: {
    width: number
    height: number
  }
  storage: {
    provider: string
    fileId: string
    url: string
    bucket?: string
    folderId?: string
    thumbnailPath?: string
    thumbnails?: Record<string, string>
    blurDataURL?: string
  }
  albumId?: string
  tags: string[]
  people: string[] // Array of person names
  location?: {
    name: string // Location name (e.g., "Paris, France")
    coordinates?: {
      latitude: number
      longitude: number
    }
    address?: string // Full address
  }
  isPublished: boolean
  isLeading: boolean
  isGalleryLeading: boolean
  uploadedBy: string // ObjectId as string for API compatibility
  uploadedAt: Date
  updatedAt: Date
  faceRecognition?: {
    faces: Array<{
      descriptor: number[] // 128D vector
      box: { x: number; y: number; width: number; height: number }
      landmarks?: {
        leftEye: { x: number; y: number }
        rightEye: { x: number; y: number }
        nose: { x: number; y: number }
        mouth: { x: number; y: number }
      }
      matchedPersonId?: string // ObjectId as string for API compatibility
      confidence?: number
      detectedAt: Date
    }>
    processedAt?: Date
    modelVersion?: string
  }
}

// Tag Types
export interface Tag {
  _id: string
  name: Record<string, string> // Multi-language support
  description: Record<string, string>
  color?: string
  category: string
  isHomeView: boolean
  usageCount: number
  createdAt: Date
  updatedAt: Date
}

// Language Types
export interface Language {
  code: string
  name: string
  nativeName: string
  isPublished: boolean
  isDefault: boolean
  isRTL: boolean
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Upload Types
export interface UploadProgress {
  filename: string
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
}

export interface BatchUploadRequest {
  files: File[]
  albumId?: string
  tags?: string[]
  storageProviderId: string
}

// Blog Article Types
export interface BlogArticle {
  _id?: string
  title: MultiLangText
  slug: string
  leadingImage?: {
    url: string
    alt: MultiLangText
    storageProvider: string
    storagePath: string
  }
  category: string
  tags: string[]
  content: MultiLangHTML
  excerpt?: MultiLangText
  isPublished: boolean
  isFeatured: boolean
  authorId: string
  publishedAt?: Date
  createdAt: Date
  updatedAt: Date
  viewCount: number
  seoTitle?: MultiLangText
  seoDescription?: MultiLangText
}

// Blog Category Types
export interface BlogCategory {
  _id?: string
  alias: string
  title: MultiLangText
  description?: MultiLangText
  leadingImage?: {
    url: string
    alt: MultiLangText
    storageProvider: string
    storagePath: string
  }
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

// Search and Filter Types
export interface PhotoFilters {
  albumId?: string
  tags?: string[]
  isPublished?: boolean
  uploadedBy?: string
  dateRange?: {
    start: Date
    end: Date
  }
  sizeRange?: {
    min: number
    max: number
  }
}

export interface SearchQuery {
  q: string
  filters?: PhotoFilters
  page?: number
  limit?: number
  sortBy?: 'uploadedAt' | 'filename' | 'size' | 'dimensions'
  sortOrder?: 'asc' | 'desc'
}

// ============================================================================
// TEMPLATE-SPECIFIC TYPES
// ============================================================================
// These types are designed for template compatibility and API responses
// They convert Date objects to strings and add template-specific fields

// Template Album - for use in templates and API responses
export interface TemplateAlbum extends Omit<Album, '_id' | 'createdAt' | 'updatedAt' | 'firstPhotoDate' | 'lastPhotoDate'> {
  // Make _id required for templates (API responses always have _id)
  _id: string
  
  // Convert Date fields to strings for template compatibility
  createdAt: string
  updatedAt: string
  firstPhotoDate?: string
  lastPhotoDate?: string
  
  // Additional template-specific fields
  childAlbumCount?: number  // Count of direct child albums
  coverPhotoUrl?: string    // Direct URL to cover photo for easy access
}

// Template Photo - for use in templates and API responses  
export interface TemplatePhoto extends Omit<Photo, 'uploadedAt' | 'updatedAt' | 'storage'> {
  // Convert Date fields to strings for template compatibility
  uploadedAt: string
  updatedAt: string
  
  // Enhanced storage type for templates
  storage: {
    provider: string
    fileId: string
    url: string
    bucket?: string
    folderId?: string
    path: string           // Full storage path
    thumbnailPath: string  // Thumbnail path for templates
    thumbnails?: Record<string, string>  // Multiple thumbnail sizes
    blurDataURL?: string   // Blur placeholder for progressive loading
  }
  
  // Additional template-specific fields
  url?: string              // Direct URL for backward compatibility
  thumbnailUrl?: string     // Direct thumbnail URL for easy access
  alt?: MultiLangText       // Alt text for accessibility
  albumName?: string        // Album name for display
  metadata?: {              // Additional metadata for templates
    width: number
    height: number
    size: number
    mimeType: string
  }
  
  // EXIF data for templates
  exif?: {
    dateTimeOriginal?: string
    make?: string
    model?: string
    exposureTime?: string
    fNumber?: string
    iso?: number
    focalLength?: string
    flash?: string
    whiteBalance?: string
    meteringMode?: string
    exposureProgram?: string
    exposureMode?: string
    sceneCaptureType?: string
    colorSpace?: string
    lensModel?: string
    lensInfo?: string
    serialNumber?: string
    software?: string
    xResolution?: number
    yResolution?: number
    resolutionUnit?: string
    subsecTimeOriginal?: string
    subsecTimeDigitized?: string
    gps?: {
      latitude?: number
      longitude?: number
      altitude?: number
    }
  }
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================
// These types are specifically designed for API responses and include
// additional computed fields that are commonly needed

// Album API Response - includes computed fields for API responses
export interface AlbumApiResponse extends TemplateAlbum {
  // Additional API-specific computed fields
  childAlbumCount: number   // Always present in API responses
  totalPhotoCount?: number  // Total photos including sub-albums
  coverPhotoUrl?: string    // Direct URL to cover photo
  breadcrumbs?: Array<{     // Navigation breadcrumbs
    _id: string
    name: string
    alias: string
  }>
}

// Photo API Response - includes computed fields for API responses
export interface PhotoApiResponse extends TemplatePhoto {
  // Additional API-specific computed fields
  thumbnailUrl: string      // Always present in API responses
  fullSizeUrl: string       // Full size image URL
  exifData?: {              // Processed EXIF data
    make?: string
    model?: string
    dateTime?: string
    exposureTime?: string
    fNumber?: number
    iso?: number
    focalLength?: number
    gps?: {
      latitude: number
      longitude: number
    }
  }
}

// ============================================================================
// COMPONENT-SPECIFIC TYPES
// ============================================================================
// These types are designed for specific component use cases

// Album Card Props - for album card components
export interface AlbumCardData extends TemplateAlbum {
  coverPhotoUrl?: string
  childAlbumCount: number
  photoCount: number
}

// Photo Card Props - for photo card components
export interface PhotoCardData extends TemplatePhoto {
  thumbnailUrl: string
  fullSizeUrl: string
  alt: MultiLangText
}

// Gallery Grid Props - for gallery grid components
export interface GalleryGridData {
  albums: AlbumCardData[]
  photos: PhotoCardData[]
  loading: boolean
  error?: string
}

// ============================================================================
// LEGACY COMPATIBILITY TYPES
// ============================================================================
// These types maintain backward compatibility with existing code
// that uses 'any' types or simplified structures

// Legacy Album - for backward compatibility with existing templates
export interface LegacyAlbum {
  _id: string
  name: any  // MultiLangText or string
  alias: string
  description: any  // MultiLangHTML or string
  photoCount: number
  childAlbumCount?: number
  coverPhotoId?: string
  isPublic: boolean
  isFeatured: boolean
  createdAt: string
  level: number
  order: number
  parentAlbumId?: string
  parentPath?: string
}

// Legacy Photo - for backward compatibility with existing templates
export interface LegacyPhoto {
  _id: string
  url?: string
  storage?: {
    url: string
    thumbnailPath: string
    path: string
    provider: string
  }
  alt?: any  // MultiLangText or string
  title?: any
  description?: any
  isPublished: boolean
  isLeading?: boolean
  isGalleryLeading?: boolean
}

// ============================================================================
// TYPE UTILITIES
// ============================================================================
// Helper types and utilities for type conversion and validation

// Convert API response to template type
export type ApiToTemplate<T> = T extends AlbumApiResponse ? TemplateAlbum :
  T extends PhotoApiResponse ? TemplatePhoto : T

// Convert template type to legacy type
export type TemplateToLegacy<T> = T extends TemplateAlbum ? LegacyAlbum :
  T extends TemplatePhoto ? LegacyPhoto : T

// Union type for all album variants
export type AnyAlbum = Album | TemplateAlbum | AlbumApiResponse | LegacyAlbum

// Union type for all photo variants  
export type AnyPhoto = Photo | TemplatePhoto | PhotoApiResponse | LegacyPhoto

// Type guard functions
export const isTemplateAlbum = (album: AnyAlbum): album is TemplateAlbum => {
  return 'createdAt' in album && typeof album.createdAt === 'string'
}

export const isTemplatePhoto = (photo: AnyPhoto): photo is TemplatePhoto => {
  return 'uploadedAt' in photo && typeof photo.uploadedAt === 'string'
}

export const isApiAlbum = (album: AnyAlbum): album is AlbumApiResponse => {
  return 'childAlbumCount' in album && typeof album.childAlbumCount === 'number'
}

export const isApiPhoto = (photo: AnyPhoto): photo is PhotoApiResponse => {
  return 'thumbnailUrl' in photo && typeof photo.thumbnailUrl === 'string'
}
