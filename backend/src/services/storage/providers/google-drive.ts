import { google } from 'googleapis'
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

export class GoogleDriveService implements IStorageService {
  private providerId: StorageProviderId = 'google-drive'
  private config: Record<string, any>
  protected drive: any
  private auth: any

  constructor(config: Record<string, any>) {
    this.config = config

    this.initializeAuth()
  }

  getProviderId(): StorageProviderId {
    return this.providerId
  }

  getConfig(): Record<string, any> {
    return this.config
  }

  private initializeAuth() {
    this.auth = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret
    )
    
    if (this.config.accessToken && this.config.tokenExpiry && new Date() < this.config.tokenExpiry) {
      this.auth.setCredentials({ access_token: this.config.accessToken })
    } else {
      this.auth.setCredentials({ refresh_token: this.config.refreshToken })
    }

    this.drive = google.drive({ version: 'v3', auth: this.auth })
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      if (!this.config.refreshToken) {
        throw new Error('Refresh token is missing')
      }
      
      const { credentials } = await this.auth.refreshAccessToken()
      this.config.accessToken = credentials.access_token
      this.config.tokenExpiry = credentials.expiry_date ? new Date(credentials.expiry_date) : undefined
      
      // Update the auth instance
      this.auth.setCredentials(credentials)
    } catch (error) {
      console.error('Failed to refresh Google Drive access token:', error)
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      // Check if required config is present
      if (!this.config.clientId) {
        throw new Error('Google Drive Client ID is not configured')
      }
      if (!this.config.clientSecret) {
        throw new Error('Google Drive Client Secret is not configured')
      }
      if (!this.config.refreshToken && !this.config.accessToken) {
        throw new Error('Google Drive authentication tokens are missing. Please authorize the application.')
      }

      // Ensure we have a valid access token
      if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
        await this.refreshAccessToken()
      }

      // Test connection by getting user info (more reliable than folder access)
      await this.drive.about.get({ fields: 'user' })
      return true
    } catch (error: any) {
      console.error('Google Drive connection validation failed:', error)
      
      // Extract detailed error information
      let errorMessage = 'Unknown error occurred'
      let errorCode: string | undefined
      let errorDetails: any = {}

      if (error instanceof Error) {
        errorMessage = error.message
        errorDetails.message = error.message
        errorDetails.stack = error.stack
      }

      // Check for Google API specific errors
      if (error?.response?.data) {
        errorCode = error.response.data.error?.code || error.response.status?.toString()
        errorMessage = error.response.data.error?.message || errorMessage
        errorDetails.googleApiError = {
          code: error.response.data.error?.code,
          message: error.response.data.error?.message,
          status: error.response.status,
          errors: error.response.data.error?.errors
        }
      } else if (error?.code) {
        errorCode = error.code.toString()
        errorDetails.code = error.code
      }

      // Check for authentication errors
      if (errorMessage.includes('invalid_grant') || errorMessage.includes('invalid_token') || errorMessage.includes('unauthorized')) {
        errorMessage = `Authentication failed: ${errorMessage}. Please re-authorize the application.`
        errorDetails.authError = true
      }

      // Check for network errors
      if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
        errorMessage = `Network error: ${errorMessage}. Please check your internet connection and firewall settings.`
        errorDetails.networkError = true
      }

      // Create a detailed error object
      const detailedError: any = new Error(errorMessage)
      detailedError.code = errorCode
      detailedError.details = errorDetails
      detailedError.originalError = error
      
      throw detailedError
    }
  }

  async createFolder(name: string, parentPath?: string): Promise<StorageFolderResult> {
    try {
      // Ensure we have a valid access token
      if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
        await this.refreshAccessToken()
      }

      // Resolve parentPath to folder ID if it's a path, otherwise use as folder ID
      let parentFolderId = this.config.folderId
      if (parentPath) {
        if (parentPath.includes('/') || parentPath !== this.config.folderId) {
          // It's a path, need to resolve it
          const resolvedFolderId = await this.getFolderIdByPath(parentPath)
          if (resolvedFolderId) {
            parentFolderId = resolvedFolderId
          } else {
            parentFolderId = this.config.folderId
          }
        } else {
          // It's already a folder ID
          parentFolderId = parentPath
        }
      }
      
      // Check if folder already exists
      const existingResponse = await this.drive.files.list({
        q: `'${parentFolderId}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id,name)',
        pageSize: 1
      })

      if (existingResponse.data.files && existingResponse.data.files.length > 0) {
        // Folder already exists, return existing folder info
        const existingFolder = existingResponse.data.files[0]
        return {
          provider: this.providerId,
          folderId: existingFolder.id,
          name: existingFolder.name,
          path: `${parentPath || ''}/${name}`.replace(/^\//, ''),
          parentId: parentFolderId,
          metadata: {}
        }
      }

      // Create new folder
      const folderMetadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId]
      }

      const response = await this.drive.files.create({
        requestBody: folderMetadata,
        fields: 'id,name,webViewLink'
      })

      return {
        provider: this.providerId,
        folderId: response.data.id,
        name: response.data.name,
        path: `${parentPath || ''}/${name}`.replace(/^\//, ''),
        parentId: parentFolderId,
        metadata: {}
      }
    } catch (error) {
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
      // Ensure we have a valid access token
      if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
        await this.refreshAccessToken()
      }

      // For Google Drive, we need to get the folder ID first
      const folderId = await this.getFolderIdByPath(folderPath)
      if (folderId) {
        await this.drive.files.delete({ fileId: folderId })
      }
    } catch (error) {
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
      // Ensure we have a valid access token
      if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
        await this.refreshAccessToken()
      }

      const folderId = await this.getFolderIdByPath(folderPath)
      if (!folderId) {
        throw new Error('Folder not found')
      }

      const response = await this.drive.files.get({
        fileId: folderId,
        fields: 'id,name,createdTime,modifiedTime,size'
      })

      // Get file count
      const filesResponse = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id)',
        pageSize: 1000
      })

      return {
        provider: this.providerId,
        folderId: response.data.id,
        name: response.data.name,
        path: folderPath,
        fileCount: filesResponse.data.files?.length || 0,
        metadata: {},
        createdAt: new Date(response.data.createdTime),
        updatedAt: new Date(response.data.modifiedTime)
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
      // Ensure we have a valid access token
      if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
        await this.refreshAccessToken()
      }

      const parentFolderId = parentPath || this.config.folderId
      
      const response = await this.drive.files.list({
        q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id,name,createdTime,modifiedTime)',
        pageSize: 1000
      })

      return response.data.files?.map((file: any) => ({
        provider: this.providerId,
        folderId: file.id,
        name: file.name,
        path: `${parentPath || ''}/${file.name}`.replace(/^\//, ''),
        parentId: parentFolderId,
        fileCount: 0, // Would need additional API call to get this
        metadata: {},
        createdAt: new Date(file.createdTime),
        updatedAt: new Date(file.modifiedTime)
      })) || []
    } catch (error) {
      throw new StorageOperationError(
        `Failed to list folders in ${parentPath || 'root'}`,
        this.providerId,
        'listFolders',
        error instanceof Error ? error : undefined
      )
    }
  }

  private async getFolderIdByPath(folderPath: string): Promise<string | null> {
    try {
      // If folderPath is empty or just whitespace, return the root folder ID
      if (!folderPath || folderPath.trim() === '') {
        return this.config.folderId
      }

      const pathParts = folderPath.split('/').filter(Boolean)
      let currentFolderId = this.config.folderId

      for (const folderName of pathParts) {
        const query = `'${currentFolderId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
        
        const response = await this.drive.files.list({
          q: query,
          fields: 'files(id,name)',
          pageSize: 1
        })

        if (response.data.files && response.data.files.length > 0) {
          currentFolderId = response.data.files[0].id
        } else {
          return null
        }
      }
      return currentFolderId
    } catch (error) {
      console.error('GoogleDriveService: Failed to get folder ID by path:', error)
      return null
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
      // Ensure we have a valid access token
      if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
        await this.refreshAccessToken()
      }

      // Resolve folder path to folder ID if provided
      let parentFolderId = this.config.folderId
      if (folderPath) {
        const resolvedFolderId = await this.getFolderIdByPath(folderPath)
        if (resolvedFolderId) {
          parentFolderId = resolvedFolderId
        }
      }
      
      const fileMetadata = {
        name: filename,
        parents: [parentFolderId],
        ...metadata
      }

      // Convert Buffer to readable stream for Google Drive API
      const { Readable } = require('stream')
      const stream = Readable.from(file)

      const media = {
        mimeType,
        body: stream
      }

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id,name,size,webViewLink,webContentLink,createdTime,modifiedTime'
      })

      return {
        provider: this.providerId,
        fileId: response.data.id,
        url: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
        folderId: parentFolderId,
        path: `${folderPath || ''}/${filename}`.replace(/^\//, ''),
        size: parseInt(response.data.size || '0'),
        mimeType: mimeType,
        metadata: metadata || {}
      }
    } catch (error: any) {
      console.error(`GoogleDriveService: Upload failed for ${filename}:`, error)
      console.error(`GoogleDriveService: Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        code: error.code,
        status: error.status,
        response: error.response?.data
      })
      
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
      // Ensure we have a valid access token
      if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
        await this.refreshAccessToken()
      }

      // For Google Drive, we need to get the file ID first
      const fileId = await this.getFileIdByPath(filePath)
      if (fileId) {
        await this.drive.files.delete({ fileId })
      }
    } catch (error) {
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
      // Ensure we have a valid access token
      if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
        await this.refreshAccessToken()
      }

      const fileId = await this.getFileIdByPath(filePath)
      if (!fileId) {
        throw new Error('File not found')
      }

      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id,name,size,mimeType,webViewLink,webContentLink,createdTime,modifiedTime,parents'
      })

      return {
        provider: this.providerId,
        fileId: response.data.id,
        name: response.data.name,
        path: filePath,
        size: parseInt(response.data.size || '0'),
        mimeType: response.data.mimeType,
        url: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
        folderId: response.data.parents?.[0],
        metadata: {},
        createdAt: new Date(response.data.createdTime),
        updatedAt: new Date(response.data.modifiedTime)
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
      // Ensure we have a valid access token
      if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
        await this.refreshAccessToken()
      }

      const parentFolderId = folderPath || this.config.folderId
      
      const response = await this.drive.files.list({
        q: `'${parentFolderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id,name,size,mimeType,webViewLink,createdTime,modifiedTime)',
        pageSize: pageSize || 1000
      })

      return response.data.files?.map((file: any) => ({
        provider: this.providerId,
        fileId: file.id,
        name: file.name,
        path: `${folderPath || ''}/${file.name}`.replace(/^\//, ''),
        size: parseInt(file.size || '0'),
        mimeType: file.mimeType,
        url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
        folderId: parentFolderId,
        metadata: {},
        createdAt: new Date(file.createdTime),
        updatedAt: new Date(file.modifiedTime)
      })) || []
    } catch (error) {
      throw new StorageOperationError(
        `Failed to list files in ${folderPath || 'root'}`,
        this.providerId,
        'listFiles',
        error instanceof Error ? error : undefined
      )
    }
  }

  private async getFileIdByPath(filePath: string): Promise<string | null> {
    try {
      console.log(`GoogleDriveService: Getting file ID for path: ${filePath}`)
      
      const pathParts = filePath.split('/').filter(Boolean)
      if (pathParts.length === 0) {
        console.log(`GoogleDriveService: Empty path parts for: ${filePath}`)
        return null
      }

      const fileName = pathParts[pathParts.length - 1]
      const folderPath = pathParts.slice(0, -1).join('/')
      
      console.log(`GoogleDriveService: File name: ${fileName}, folder path: ${folderPath}`)
      
      let parentFolderId = this.config.folderId
      if (folderPath) {
        parentFolderId = await this.getFolderIdByPath(folderPath) || this.config.folderId
        console.log(`GoogleDriveService: Resolved folder path to ID: ${parentFolderId}`)
      }

      const query = `'${parentFolderId}' in parents and name='${fileName}' and mimeType!='application/vnd.google-apps.folder' and trashed=false`
      console.log(`GoogleDriveService: Searching with query: ${query}`)

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id)',
        pageSize: 1
      })

      const fileId = response.data.files && response.data.files.length > 0 ? response.data.files[0].id : null
      console.log(`GoogleDriveService: Found file ID: ${fileId} for path: ${filePath}`)
      
      return fileId
    } catch (error) {
      console.error('GoogleDriveService: Failed to get file ID by path:', error)
      return null
    }
  }

  async updateFileMetadata(filePath: string, metadata: Record<string, any>): Promise<void> {
    try {
      // Ensure we have a valid access token
      if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
        await this.refreshAccessToken()
      }

      const fileId = await this.getFileIdByPath(filePath)
      if (!fileId) {
        throw new Error('File not found')
      }

      await this.drive.files.update({
        fileId: fileId,
        requestBody: metadata
      })
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
      const fileId = await this.getFileIdByPath(filePath)
      return fileId !== null
    } catch (error) {
      return false
    }
  }

  async folderExists(folderPath: string): Promise<boolean> {
    try {
      const folderId = await this.getFolderIdByPath(folderPath)
      return folderId !== null
    } catch (error) {
      return false
    }
  }

  getFileUrl(filePath: string): string {
    // For Google Drive, we need to get the file ID first
    // This is a simplified implementation - in practice, you'd want to cache file IDs
    return `/api/storage/serve/google-drive/${filePath}`
  }

  getFolderUrl(folderPath: string): string {
    // For Google Drive, we need to get the folder ID first
    // This is a simplified implementation - in practice, you'd want to cache folder IDs
    return `/api/storage/serve/google-drive/${folderPath}`
  }

  async getFileBuffer(filePath: string): Promise<Buffer | null> {
    try {
      console.log(`GoogleDriveService: Getting file buffer for path: ${filePath}`)
      
      // Ensure we have a valid access token
      if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
        console.log('GoogleDriveService: Refreshing access token for getFileBuffer...')
        await this.refreshAccessToken()
      }

      const fileId = await this.getFileIdByPath(filePath)
      if (!fileId) {
        console.log(`GoogleDriveService: Could not find file ID for path: ${filePath}`)
        return null
      }

      console.log(`GoogleDriveService: Found file ID: ${fileId} for path: ${filePath}`)

      const response = await this.drive.files.get({
        fileId: fileId,
        alt: 'media'
      })

      console.log(`GoogleDriveService: Successfully downloaded file, size: ${response.data.length} bytes`)
      
      // Handle different response data types
      if (response.data instanceof Buffer) {
        return response.data
      } else if (response.data instanceof Uint8Array) {
        return Buffer.from(response.data)
      } else if (response.data instanceof ArrayBuffer) {
        return Buffer.from(response.data)
      } else if (typeof response.data === 'string') {
        return Buffer.from(response.data, 'binary')
      } else {
        // For Blob or other types, try to convert to ArrayBuffer first
        console.log(`GoogleDriveService: Response data type: ${typeof response.data}, constructor: ${response.data.constructor.name}`)
        if (response.data.arrayBuffer) {
          const arrayBuffer = await response.data.arrayBuffer()
          return Buffer.from(arrayBuffer)
        } else {
          // Fallback: try to convert directly
          return Buffer.from(response.data as any)
        }
      }
    } catch (error) {
      console.error('GoogleDriveService: Failed to get file buffer from Google Drive:', error)
      return null
    }
  }
}
