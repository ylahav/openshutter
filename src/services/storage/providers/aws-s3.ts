import { 
  IStorageService, 
  StorageProviderId, 
  StorageUploadResult, 
  StorageFolderResult, 
  StorageFileInfo, 
  StorageFolderInfo,
  StorageConnectionError,
  StorageOperationError
} from '../types'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export class AwsS3Service implements IStorageService {
  private providerId: StorageProviderId = 'aws-s3'
  private config: Record<string, any>
  private s3Client!: S3Client

  constructor(config: Record<string, any>) {
    this.config = config
    console.log('AwsS3Service constructor - config:', JSON.stringify(config, null, 2))
    this.initializeS3Client()
  }

  private initializeS3Client() {
    this.s3Client = new S3Client({
      region: this.config.region || 'us-east-1',
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey
      }
    })
  }

  getProviderId(): StorageProviderId {
    return this.providerId
  }

  getConfig(): Record<string, any> {
    return this.config
  }

  async validateConnection(): Promise<boolean> {
    try {
      console.log('AwsS3Service: Validating connection to bucket:', this.config.bucketName)
      
      // Test connection by listing objects in the bucket
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        MaxKeys: 1
      })
      
      await this.s3Client.send(command)
      console.log('AwsS3Service: Connection validated successfully')
      return true
    } catch (error) {
      console.error('AwsS3Service: Connection validation failed:', error)
      return false
    }
  }

  async createFolder(name: string, parentPath?: string): Promise<StorageFolderResult> {
    try {
      console.log(`AwsS3Service: Creating folder '${name}' in path: ${parentPath || 'root'}`)
      
      // In S3, folders are logical constructs - we create an empty object with a trailing slash
      const folderKey = parentPath ? `${parentPath}/${name}/` : `${name}/`
      
      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: folderKey,
        Body: '' // Empty content for folder marker
      })
      
      await this.s3Client.send(command)
      console.log(`AwsS3Service: Created folder '${name}' with key: ${folderKey}`)
      
      return {
        provider: this.providerId,
        folderId: folderKey,
        name: name,
        path: folderKey,
        parentId: parentPath || undefined,
        metadata: {}
      }
    } catch (error) {
      console.error(`AwsS3Service: Failed to create folder '${name}':`, error)
      throw new StorageOperationError(
        `Failed to create folder ${name}`,
        this.providerId,
        'createFolder',
        error instanceof Error ? error : undefined
      )
    }
  }

  async deleteFolder(folderPath: string): Promise<void> {
    try {
      console.log(`AwsS3Service: Deleting folder: ${folderPath}`)
      
      // List all objects in the folder
      const listCommand = new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        Prefix: folderPath
      })
      
      const listResult = await this.s3Client.send(listCommand)
      
      if (listResult.Contents && listResult.Contents.length > 0) {
        // Delete all objects in the folder
        const deletePromises = listResult.Contents.map(obj => {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: this.config.bucketName,
            Key: obj.Key!
          })
          return this.s3Client.send(deleteCommand)
        })
        
        await Promise.all(deletePromises)
        console.log(`AwsS3Service: Successfully deleted folder: ${folderPath}`)
      }
    } catch (error) {
      console.error(`AwsS3Service: Failed to delete folder ${folderPath}:`, error)
      throw new StorageOperationError(
        `Failed to delete folder ${folderPath}`,
        this.providerId,
        'deleteFolder',
        error instanceof Error ? error : undefined
      )
    }
  }

  async getFolderInfo(folderPath: string): Promise<StorageFolderInfo> {
    try {
      // List objects in the folder to get info
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        Prefix: folderPath,
        MaxKeys: 1
      })
      
      const response = await this.s3Client.send(command)
      
      return {
        provider: this.providerId,
        folderId: folderPath,
        name: folderPath.split('/').pop() || folderPath,
        path: folderPath,
        parentId: folderPath.split('/').slice(0, -1).join('/') || undefined,
        metadata: {},
        fileCount: response.KeyCount || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    } catch (error) {
      throw new StorageOperationError(
        `Failed to get folder info for ${folderPath}`,
        this.providerId,
        'getFolderInfo',
        error instanceof Error ? error : undefined
      )
    }
  }

  async listFolders(parentPath?: string): Promise<StorageFolderInfo[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        Prefix: parentPath,
        Delimiter: '/'
      })
      
      const response = await this.s3Client.send(command)
      const folders: StorageFolderInfo[] = []
      
      if (response.CommonPrefixes) {
        for (const prefix of response.CommonPrefixes) {
          if (prefix.Prefix) {
            const folderName = prefix.Prefix.replace(parentPath || '', '').replace(/\/$/, '')
            folders.push({
              provider: this.providerId,
              folderId: prefix.Prefix,
              name: folderName,
              path: prefix.Prefix,
              parentId: parentPath || undefined,
              metadata: {},
              fileCount: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            })
          }
        }
      }
      
      return folders
    } catch (error) {
      throw new StorageOperationError(
        `Failed to list folders in ${parentPath || 'root'}`,
        this.providerId,
        'listFolders',
        error instanceof Error ? error : undefined
      )
    }
  }

  async uploadFile(
    file: Buffer,
    filename: string,
    mimeType: string,
    folderPath?: string,
    metadata?: Record<string, any>
  ): Promise<StorageUploadResult> {
    try {
      console.log(`AwsS3Service: Uploading file '${filename}' to path: ${folderPath || 'root'}`)
      
      const key = folderPath ? `${folderPath}/${filename}` : filename
      
      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: file,
        ContentType: mimeType,
        Metadata: metadata || {}
      })
      
      const result = await this.s3Client.send(command)
      console.log(`AwsS3Service: Uploaded file '${filename}' with key: ${key}`)
      
      return {
        provider: this.providerId,
        fileId: key,
        url: `/api/storage/serve/aws-s3/${encodeURIComponent(key)}`,
        folderId: folderPath || '',
        path: key,
        size: file.length,
        mimeType: mimeType,
        metadata: metadata || {}
      }
    } catch (error) {
      console.error(`AwsS3Service: Failed to upload file '${filename}':`, error)
      throw new StorageOperationError(
        `Failed to upload file ${filename}`,
        this.providerId,
        'uploadFile',
        error instanceof Error ? error : undefined
      )
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      console.log(`AwsS3Service: Deleting file: ${filePath}`)
      
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: filePath
      })
      
      await this.s3Client.send(command)
      console.log(`AwsS3Service: Successfully deleted file: ${filePath}`)
    } catch (error) {
      console.error(`AwsS3Service: Failed to delete file ${filePath}:`, error)
      throw new StorageOperationError(
        `Failed to delete file ${filePath}`,
        this.providerId,
        'deleteFile',
        error instanceof Error ? error : undefined
      )
    }
  }

  async getFileInfo(filePath: string): Promise<StorageFileInfo> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucketName,
        Key: filePath
      })
      
      const response = await this.s3Client.send(command)
      
      return {
        provider: this.providerId,
        fileId: filePath,
        name: filePath.split('/').pop() || filePath,
        path: filePath,
        size: parseInt(response.ContentLength?.toString() || '0'),
        mimeType: response.ContentType || 'application/octet-stream',
        url: this.getFileUrl(filePath),
        folderId: filePath.split('/').slice(0, -1).join('/') || undefined,
        metadata: response.Metadata || {},
        createdAt: response.LastModified || new Date(),
        updatedAt: response.LastModified || new Date()
      }
    } catch (error) {
      throw new StorageOperationError(
        `Failed to get file info for ${filePath}`,
        this.providerId,
        'getFileInfo',
        error instanceof Error ? error : undefined
      )
    }
  }

  async listFiles(folderPath?: string, pageSize?: number): Promise<StorageFileInfo[]> {
    try {
      console.log(`AwsS3Service: Listing files in folder: ${folderPath || 'root'}`)
      
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        Prefix: folderPath,
        MaxKeys: pageSize || 1000
      })
      
      const response = await this.s3Client.send(command)
      
      const files: StorageFileInfo[] = []
      
      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key && !obj.Key.endsWith('/')) { // Skip folder markers
            files.push({
              provider: this.providerId,
              fileId: obj.Key,
              name: obj.Key.split('/').pop() || obj.Key,
              path: obj.Key,
              size: obj.Size || 0,
              mimeType: 'application/octet-stream', // S3 doesn't store MIME type in listing
              url: this.getFileUrl(obj.Key),
              folderId: obj.Key.split('/').slice(0, -1).join('/') || undefined,
              metadata: {},
              createdAt: obj.LastModified || new Date(),
              updatedAt: obj.LastModified || new Date()
            })
          }
        }
      }
      
      console.log(`AwsS3Service: Found ${files.length} files`)
      return files
    } catch (error) {
      console.error(`AwsS3Service: Failed to list files in ${folderPath || 'root'}:`, error)
      throw new StorageOperationError(
        `Failed to list files in ${folderPath || 'root'}`,
        this.providerId,
        'listFiles',
        error instanceof Error ? error : undefined
      )
    }
  }

  async updateFileMetadata(filePath: string, metadata: Record<string, any>): Promise<void> {
    try {
      // Get the current object
      const headCommand = new HeadObjectCommand({
        Bucket: this.config.bucketName,
        Key: filePath
      })
      
      const headResponse = await this.s3Client.send(headCommand)
      
      // Copy the object with new metadata
      const copyCommand = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: filePath,
        Body: '', // We need to get the actual content
        ContentType: headResponse.ContentType,
        Metadata: metadata
      })
      
      await this.s3Client.send(copyCommand)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to update metadata for ${filePath}`,
        this.providerId,
        'updateFileMetadata',
        error instanceof Error ? error : undefined
      )
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucketName,
        Key: filePath
      })
      
      await this.s3Client.send(command)
      return true
    } catch (error) {
      return false
    }
  }

  async folderExists(folderPath: string): Promise<boolean> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        Prefix: folderPath,
        MaxKeys: 1
      })
      
      const response = await this.s3Client.send(command)
      return response.Contents ? response.Contents.length > 0 : false
    } catch (error) {
      return false
    }
  }

  getFileUrl(filePath: string): string {
    return `/api/storage/serve/aws-s3/${encodeURIComponent(filePath)}`
  }

  getFolderUrl(folderPath: string): string {
    return `/api/storage/serve/aws-s3/${encodeURIComponent(folderPath)}`
  }

  async getFileBuffer(filePath: string): Promise<Buffer | null> {
    try {
      console.log(`AwsS3Service: Getting file buffer for path: ${filePath}`)
      
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: filePath
      })
      
      const response = await this.s3Client.send(command)
      
      if (!response.Body) {
        console.log(`AwsS3Service: No body in response for file: ${filePath}`)
        return null
      }
      
      // Convert the readable stream to buffer
      const chunks: Uint8Array[] = []
      const reader = response.Body.transformToWebStream().getReader()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      
      const buffer = Buffer.concat(chunks)
      console.log(`AwsS3Service: Successfully downloaded file, size: ${buffer.length} bytes`)
      
      return buffer
    } catch (error) {
      console.error(`AwsS3Service: Failed to get file buffer for ${filePath}:`, error)
      return null
    }
  }
}
