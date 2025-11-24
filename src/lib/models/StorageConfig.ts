import mongoose, { Schema, Document } from 'mongoose'
import { StorageProviderConfig } from '@/types/storage'

// Make _id optional to avoid conflict with Document interface
export interface IStorageProviderConfig extends Omit<StorageProviderConfig, '_id'>, Document {}

const StorageProviderConfigSchema = new Schema<IStorageProviderConfig>({
  providerId: {
    type: String,
    required: true,
    unique: true,
    enum: ['google-drive', 'aws-s3', 'local']
  },
  name: {
    type: String,
    required: true
  },
  isEnabled: {
    type: Boolean,
    default: false
  },
  config: {
    type: Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Update the updatedAt field before saving
StorageProviderConfigSchema.pre('save', async function() {
  this.updatedAt = new Date()
})

// Create indexes - removed duplicate index definition
StorageProviderConfigSchema.index({ isEnabled: 1 })

export const StorageProviderConfigModel = mongoose.models.StorageProviderConfig || 
  mongoose.model<IStorageProviderConfig>('StorageProviderConfig', StorageProviderConfigSchema)

// Default configurations
export const DEFAULT_STORAGE_CONFIGS = [
  {
    providerId: 'google-drive',
    name: 'Google Drive',
    isEnabled: false,
    config: {
      clientId: '',
      clientSecret: '',
      refreshToken: '',
      folderId: '',
      isEnabled: false
    }
  },
  {
    providerId: 'aws-s3',
    name: 'Amazon S3',
    isEnabled: false,
    config: {
      accessKeyId: '',
      secretAccessKey: '',
      region: 'us-east-1',
      bucketName: '',
      isEnabled: false
    }
  },
  {
    providerId: 'local',
    name: 'Local Storage',
    isEnabled: false,
    config: {
      basePath: '/app/public/albums',
      maxFileSize: '100MB',
      isEnabled: false
    }
  }
]
