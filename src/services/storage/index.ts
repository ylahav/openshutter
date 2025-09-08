// New Storage Architecture
export * from './types'
export * from './config'
export * from './manager'

// Provider Services
export { LocalStorageService } from './providers/local'
export { GoogleDriveService } from './providers/google-drive'
export { AwsS3Service } from './providers/aws-s3'

// Export individual storage classes for direct use if needed
export { LocalStorage } from './local'
export type { LocalStorageConfig } from './local'
