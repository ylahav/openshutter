// Storage Provider Types
export type StorageProviderId = 'google-drive' | 'aws-s3' | 'local' | 'backblaze' | 'wasabi'

// Base Storage Configuration
export interface BaseStorageConfig {
  providerId: StorageProviderId
  name: string
  isEnabled: boolean
  config: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

// Storage Provider Specific Configurations
export interface GoogleDriveConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
  folderId: string
  storageType?: 'appdata' | 'visible'  // 'appdata' = hidden, 'visible' = user sees files
  isEnabled: boolean
}

export interface AwsS3Config {
  accessKeyId: string
  secretAccessKey: string
  region: string
  bucketName: string
  isEnabled: boolean
}

export interface LocalStorageConfig {
  basePath: string
  maxFileSize: string
  isEnabled: boolean
}

export interface BackblazeConfig {
  applicationKeyId: string
  applicationKey: string
  bucketName: string
  region: string
  endpoint?: string
  isEnabled: boolean
}

export interface WasabiConfig {
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  region: string
  endpoint: string
  isEnabled: boolean
}

// Storage Operation Results
export interface StorageUploadResult {
  provider: StorageProviderId
  fileId: string
  url: string
  folderId?: string
  path: string
  size: number
  mimeType: string
  metadata?: Record<string, any>
}

export interface StorageFolderResult {
  provider: StorageProviderId
  folderId: string
  name: string
  path: string
  parentId?: string
  metadata?: Record<string, any>
}

export interface StorageFileInfo {
  provider: StorageProviderId
  fileId: string
  name: string
  path: string
  size: number
  mimeType: string
  url: string
  folderId?: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface StorageFolderInfo {
  provider: StorageProviderId
  folderId: string
  name: string
  path: string
  parentId?: string
  fileCount: number
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

// Storage Service Interface
export interface IStorageService {
  // Configuration
  getProviderId(): StorageProviderId
  getConfig(): Record<string, any>
  validateConnection(): Promise<boolean>
  
  // Folder Operations
  createFolder(name: string, parentPath?: string): Promise<StorageFolderResult>
  deleteFolder(folderPath: string): Promise<void>
  getFolderInfo(folderPath: string): Promise<StorageFolderInfo>
  listFolders(parentPath?: string): Promise<StorageFolderInfo[]>
  
  // File Operations
  uploadFile(
    file: Buffer,
    filename: string,
    mimeType: string,
    folderPath?: string,
    metadata?: Record<string, any>
  ): Promise<StorageUploadResult>
  
  deleteFile(filePath: string): Promise<void>
  getFileInfo(filePath: string): Promise<StorageFileInfo>
  listFiles(folderPath?: string, pageSize?: number): Promise<StorageFileInfo[]>
  updateFileMetadata(filePath: string, metadata: Record<string, any>): Promise<void>
  
  // Utility Operations
  fileExists(filePath: string): Promise<boolean>
  folderExists(folderPath: string): Promise<boolean>
  getFileUrl(filePath: string): string
  getFolderUrl(folderPath: string): string
  getFileBuffer(filePath: string): Promise<Buffer | null>
  
  // Tree Operations (optional - may not be supported by all providers)
  getFolderTree?(parentPath?: string, maxDepth?: number): Promise<any>
}

// Storage Manager Interface
export interface IStorageManager {
  // Provider Management
  getProvider(providerId: StorageProviderId): Promise<IStorageService>
  getActiveProviders(): Promise<StorageProviderId[]>
  validateProvider(providerId: StorageProviderId): Promise<boolean>
  
  // Album Operations
  createAlbum(albumName: string, albumAlias: string, providerId: StorageProviderId, parentPath?: string): Promise<StorageFolderResult>
  deleteAlbum(albumPath: string, providerId: StorageProviderId): Promise<void>
  getAlbumInfo(albumPath: string, providerId: StorageProviderId): Promise<StorageFolderInfo>
  
  // Photo Operations
  uploadPhoto(
    file: Buffer,
    filename: string,
    mimeType: string,
    albumPath: string,
    providerId: StorageProviderId,
    metadata?: Record<string, any>
  ): Promise<StorageUploadResult>
  
  deletePhoto(photoPath: string, providerId: StorageProviderId): Promise<void>
  getPhotoInfo(photoPath: string, providerId: StorageProviderId): Promise<StorageFileInfo>
  listAlbumPhotos(albumPath: string, providerId: StorageProviderId): Promise<StorageFileInfo[]>
  
  // Utility Operations
  getPhotoUrl(photoPath: string, providerId: StorageProviderId): Promise<string>
  getAlbumUrl(albumPath: string, providerId: StorageProviderId): Promise<string>
  getPhotoBuffer(providerId: StorageProviderId, photoPath: string): Promise<Buffer | null>
}

// Error Types
export class StorageError extends Error {
  constructor(
    message: string,
    public providerId: StorageProviderId,
    public operation: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'StorageError'
  }
}

export class StorageConfigError extends StorageError {
  constructor(message: string, providerId: StorageProviderId) {
    super(message, providerId, 'config')
    this.name = 'StorageConfigError'
  }
}

export class StorageConnectionError extends StorageError {
  constructor(message: string, providerId: StorageProviderId, originalError?: Error) {
    super(message, providerId, 'connection', originalError)
    this.name = 'StorageConnectionError'
  }
}

export class StorageOperationError extends StorageError {
  constructor(message: string, providerId: StorageProviderId, operation: string, originalError?: Error) {
    super(message, providerId, operation, originalError)
    this.name = 'StorageOperationError'
  }
}
