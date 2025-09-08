// Storage Provider Types
export interface StorageProvider {
  _id: string
  name: string
  type: 'google-drive' | 'aws-s3' | 'local'
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
  storageProvider: 'google-drive' | 'aws-s3' | 'local'
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
  createdBy: string
  tags: string[]
  metadata?: {
    location?: string
    date?: Date
    category?: string
    [key: string]: any
  }
}

// User/Group Types
export type UserRole = 'admin' | 'owner' | 'guest'

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
  uploadedBy: string
  uploadedAt: Date
  updatedAt: Date
}

// Tag Types
export interface Tag {
  _id: string
  name: Record<string, string> // Multi-language support
  description: Record<string, string>
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
