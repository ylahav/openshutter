export interface StorageProviderConfig {
  _id?: string
  providerId: string
  name: string
  isEnabled: boolean
  config: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface GoogleDriveConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
  folderId: string
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

export interface StorageConfig {
  googleDrive: GoogleDriveConfig
  awsS3: AwsS3Config
  local: LocalStorageConfig
}

export interface StorageProviderStatus {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'error'
  quota?: {
    used: string
    total: string
    percentage: number
  }
  lastSync?: string
  isEnabled: boolean
}
