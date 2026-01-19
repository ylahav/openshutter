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

  /**
   * Get the root folder ID based on storage type
   * - AppData: Hidden folder accessible only with drive.appdata scope
   * - Visible: User's Drive folder (root or specified folderId)
   */
  private getRootFolderId(): string {
    // Check if storageType is set to 'visible'
    const storageType = this.config.storageType || 'appdata'
    
    if (storageType === 'visible') {
      // Use folderId from config if provided, otherwise use root
      if (this.config.folderId && this.config.folderId !== 'appDataFolder') {
        return this.config.folderId
      }
      return 'root'
    }
    
    // Default: Use AppData folder (hidden)
    return 'appDataFolder'
  }

  /**
   * Check if using AppData storage (hidden)
   */
  private isAppDataStorage(): boolean {
    const storageType = this.config.storageType || 'appdata'
    return storageType === 'appdata'
  }

  private initializeAuth() {
    this.auth = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret
    )
    
    // Set redirect URI if provided (helps with token validation)
    if (this.config.redirectUri) {
      this.auth.redirectUri = this.config.redirectUri
    }
    
    if (this.config.accessToken && this.config.tokenExpiry && new Date() < this.config.tokenExpiry) {
      this.auth.setCredentials({ access_token: this.config.accessToken })
    } else if (this.config.refreshToken) {
      // Set both refresh token and client credentials
      this.auth.setCredentials({ 
        refresh_token: this.config.refreshToken 
      })
    }

    this.drive = google.drive({ version: 'v3', auth: this.auth })
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      if (!this.config.refreshToken) {
        throw new Error('Refresh token is missing')
      }
      
      // Log token refresh attempt for debugging (without exposing sensitive data)
      console.log('Attempting to refresh Google Drive access token', {
        hasRefreshToken: !!this.config.refreshToken,
        refreshTokenLength: this.config.refreshToken?.length,
        refreshTokenPreview: this.config.refreshToken?.substring(0, 20) + '...',
        clientId: this.config.clientId ? `${this.config.clientId.substring(0, 20)}...` : 'missing',
        hasClientSecret: !!this.config.clientSecret
      })
      
      const { credentials } = await this.auth.refreshAccessToken()
      this.config.accessToken = credentials.access_token
      this.config.tokenExpiry = credentials.expiry_date ? new Date(credentials.expiry_date) : undefined
      
      // Update the auth instance
      this.auth.setCredentials(credentials)
      
      console.log('Successfully refreshed Google Drive access token', {
        hasAccessToken: !!credentials.access_token,
        expiryDate: credentials.expiry_date
      })
    } catch (error: any) {
      console.error('Failed to refresh Google Drive access token:', error)
      
      // Check for invalid_grant error specifically
      const responseData = error?.response?.data
      if (responseData?.error === 'invalid_grant') {
        // Create a detailed error that preserves the Google API error structure
        const detailedError: any = new Error(
          `Authentication failed: The refresh token is invalid or expired. To fix this:
1. Click "Generate New Token" button in the Google Drive configuration
2. Complete the OAuth authorization flow
3. The new refresh token will be automatically saved

If the issue persists, verify your Client ID and Client Secret match your Google Cloud Console OAuth app credentials.`
        )
        detailedError.code = 'invalid_grant'
        detailedError.details = {
          authError: true,
          googleApiError: {
            error: responseData.error,
            error_description: responseData.error_description || 'Bad Request',
            status: error.response?.status || 400
          },
          response: {
            data: responseData,
            status: error.response?.status
          },
          suggestions: [
            'Click "Generate New Token" to create a fresh refresh token with your current Client ID and Secret',
            'Verify your Client ID and Client Secret in the config match your Google Cloud Console OAuth app',
            'Check if access was revoked at https://myaccount.google.com/permissions and re-authorize if needed',
            'Ensure your OAuth app redirect URI matches: [your-domain]/api/auth/google/callback',
            'In Google Cloud Console, verify the OAuth app is in "Testing" or "Published" status'
          ]
        }
        detailedError.originalError = error
        throw detailedError
      }
      
      // For other errors, preserve the original error structure
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const detailedError: any = new Error(`Authentication failed: ${errorMessage}`)
      detailedError.code = error?.code || error?.response?.status
      detailedError.details = {
        message: errorMessage,
        response: error?.response?.data,
        status: error?.response?.status
      }
      detailedError.originalError = error
      throw detailedError
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

      // Validate refresh token format if present
      if (this.config.refreshToken) {
        // Google refresh tokens typically start with "1/" or "4/0A" and are quite long
        const token = this.config.refreshToken.trim()
        if (token.length < 50 || (!token.startsWith('1/') && !token.startsWith('4/'))) {
          throw new Error(
            'Invalid refresh token format. Refresh tokens should be long strings starting with "1/" or "4/". ' +
            'Please generate a new refresh token using the "Generate New Token" button.'
          )
        }
      }

      // Ensure we have a valid access token
      if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
        await this.refreshAccessToken()
      }

      // Test connection based on storage type
      const storageType = this.config.storageType || 'appdata'
      
      if (storageType === 'visible') {
        // For visible storage, test by getting root folder info
        // This validates drive.file or drive scope
        try {
          await this.drive.files.get({
            fileId: 'root',
            fields: 'id,name'
          })
        } catch (error: any) {
          // If root access fails, try listing root folder
          const listParams: any = {
            q: `'root' in parents and trashed=false`,
            fields: 'files(id)',
            pageSize: 1
          }
          await this.drive.files.list(listParams)
        }
      } else {
        // For AppData storage, test by listing AppData folder
        // This validates drive.appdata scope
        const listParams: any = {
          q: `'${this.getRootFolderId()}' in parents and trashed=false`,
          spaces: 'appDataFolder',
          fields: 'files(id)',
          pageSize: 1
        }
        await this.drive.files.list(listParams)
      }
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

      // Check if error already has structured details (from refreshAccessToken)
      if (error?.details?.googleApiError) {
        const apiError = error.details.googleApiError
        errorCode = apiError.status?.toString() || error.code
        errorMessage = error.message || apiError.error_description || apiError.error || errorMessage
        errorDetails.googleApiError = apiError
        errorDetails.authError = error.details.authError || false
      }
      // Check for Google API specific errors from direct API calls
      // Google API errors can have different structures:
      // 1. error.response.data.error = string (e.g., 'invalid_grant')
      // 2. error.response.data.error = object with code/message
      // 3. error.response.data = { error: string, error_description: string }
      else if (error?.response?.data) {
        const responseData = error.response.data
        const apiError = typeof responseData.error === 'string' 
          ? { error: responseData.error, error_description: responseData.error_description }
          : (responseData.error || responseData)
        
        errorCode = apiError.code || error.response.status?.toString()
        errorMessage = apiError.message || apiError.error_description || apiError.error || errorMessage
        errorDetails.googleApiError = {
          code: apiError.code,
          message: apiError.message || apiError.error_description,
          error: apiError.error, // invalid_grant is in error field
          error_description: apiError.error_description,
          status: error.response.status,
          errors: apiError.errors
        }
        // Extract invalid_grant from error field
        if (apiError.error === 'invalid_grant' || apiError.error === 'invalid_token' || errorMessage.includes('invalid_grant')) {
          errorMessage = `Authentication failed: ${apiError.error_description || apiError.error || errorMessage}. Please re-authorize the application.`
          errorDetails.authError = true
        }
      } else if (error?.code) {
        errorCode = error.code.toString()
        errorDetails.code = error.code
        // Check if code indicates invalid_grant
        if (error.code === 'invalid_grant' || error.code === 'invalid_token') {
          errorMessage = `Authentication failed: The refresh token is invalid or has expired. Please re-authorize the application.`
          errorDetails.authError = true
        }
      }

      // Check for authentication errors in error message
      if (errorMessage.includes('invalid_grant') || errorMessage.includes('invalid_token') || errorMessage.includes('unauthorized')) {
        if (!errorDetails.authError) {
          // Avoid double-wrapping if already prefixed with "Authentication failed"
          if (!errorMessage.startsWith('Authentication failed:')) {
            errorMessage = `Authentication failed: ${errorMessage}. Please re-authorize the application.`
          } else if (!errorMessage.includes('re-authorize')) {
            // Already wrapped, just ensure it mentions re-authorization
            errorMessage = `${errorMessage} Please re-authorize the application.`
          }
          errorDetails.authError = true
        }
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

      // Resolve parentPath to folder ID if it's a path, otherwise use AppData root
      let parentFolderId = this.getRootFolderId()
      if (parentPath) {
        if (parentPath.includes('/') || parentPath !== this.getRootFolderId()) {
          // It's a path, need to resolve it
          const resolvedFolderId = await this.getFolderIdByPath(parentPath)
          if (resolvedFolderId) {
            parentFolderId = resolvedFolderId
          } else {
            parentFolderId = this.getRootFolderId()
          }
        } else {
          // It's already a folder ID
          parentFolderId = parentPath
        }
      }
      
      // Check if folder already exists
      const listParams: any = {
        q: `'${parentFolderId}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id,name)',
        pageSize: 1
      }
      
      // Only add spaces parameter for AppData storage
      if (this.isAppDataStorage()) {
        listParams.spaces = 'appDataFolder'
      }
      
      const existingResponse = await this.drive.files.list(listParams)

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
      if (!folderId) {
        console.warn(`GoogleDriveService: Folder not found for path: ${folderPath}`)
        return // Folder doesn't exist, nothing to delete
      }

      console.log(`GoogleDriveService: Deleting folder ${folderPath} (ID: ${folderId})`)

      // Google Drive requires deleting all contents before deleting the folder
      // List all files and folders inside this folder
      let hasMore = true
      let pageToken: string | undefined = undefined
      const filesToDelete: string[] = []

      while (hasMore) {
        const query = `'${folderId}' in parents and trashed=false`
        const listParams: any = {
          q: query,
          fields: 'nextPageToken, files(id, name, mimeType)',
          pageSize: 1000
        }
        
        // Only add spaces parameter for AppData storage
        if (this.isAppDataStorage()) {
          listParams.spaces = 'appDataFolder'
        }
        
        if (pageToken) {
          listParams.pageToken = pageToken
        }

        const listResponse = await this.drive.files.list(listParams)
        
        if (listResponse.data.files && listResponse.data.files.length > 0) {
          for (const file of listResponse.data.files) {
            filesToDelete.push(file.id)
          }
        }

        pageToken = listResponse.data.nextPageToken
        hasMore = !!pageToken
      }

      console.log(`GoogleDriveService: Found ${filesToDelete.length} items to delete in folder ${folderPath}`)

      // Delete all files and sub-folders
      for (const fileId of filesToDelete) {
        try {
          await this.drive.files.delete({ fileId })
        } catch (deleteError) {
          console.warn(`GoogleDriveService: Failed to delete item ${fileId} in folder ${folderPath}:`, deleteError)
          // Continue deleting other items even if one fails
        }
      }

      // Now delete the folder itself
      await this.drive.files.delete({ fileId: folderId })
      console.log(`GoogleDriveService: Successfully deleted folder ${folderPath}`)
    } catch (error) {
      console.error(`GoogleDriveService: Failed to delete folder ${folderPath}:`, error)
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
      const listParams: any = {
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id)',
        pageSize: 1000
      }
      
      // Only add spaces parameter for AppData storage
      if (this.isAppDataStorage()) {
        listParams.spaces = 'appDataFolder'
      }
      
      const filesResponse = await this.drive.files.list(listParams)

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

      const parentFolderId = parentPath ? await this.getFolderIdByPath(parentPath) || this.getRootFolderId() : this.getRootFolderId()
      
      const listParams: any = {
        q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id,name,createdTime,modifiedTime)',
        pageSize: 1000
      }
      
      // Only add spaces parameter for AppData storage
      if (this.isAppDataStorage()) {
        listParams.spaces = 'appDataFolder'
      }
      
      const response = await this.drive.files.list(listParams)

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
      // If folderPath is empty or just whitespace, return the AppData root folder ID
      if (!folderPath || folderPath.trim() === '') {
        console.log('GoogleDriveService: Empty folder path, returning root folder')
        return this.getRootFolderId()
      }

      // Normalize path: remove leading/trailing slashes and split
      const normalizedPath = folderPath.trim().replace(/^\/+|\/+$/g, '')
      const pathParts = normalizedPath.split('/').filter(Boolean)
      
      console.log(`GoogleDriveService: Resolving path "${folderPath}" -> normalized: "${normalizedPath}" -> parts:`, pathParts)
      
      if (pathParts.length === 0) {
        console.log('GoogleDriveService: No path parts after normalization, returning root folder')
        return this.getRootFolderId()
      }

      let currentFolderId = this.getRootFolderId()
      console.log(`GoogleDriveService: Starting from root folder ID: ${currentFolderId}`)

      for (let i = 0; i < pathParts.length; i++) {
        const folderName = pathParts[i]
        const query = `'${currentFolderId}' in parents and name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
        
        console.log(`GoogleDriveService: Looking for folder "${folderName}" in parent ${currentFolderId}`)
        
        const listParams: any = {
          q: query,
          fields: 'files(id,name)',
          pageSize: 1
        }
        
        // Only add spaces parameter for AppData storage
        if (this.isAppDataStorage()) {
          listParams.spaces = 'appDataFolder'
        }
        
        const response = await this.drive.files.list(listParams)

        if (response.data.files && response.data.files.length > 0) {
          currentFolderId = response.data.files[0].id
          console.log(`GoogleDriveService: Found folder "${folderName}" with ID: ${currentFolderId}`)
        } else {
          console.warn(`GoogleDriveService: Folder "${folderName}" not found in parent ${currentFolderId} (path part ${i + 1}/${pathParts.length})`)
          return null
        }
      }
      
      console.log(`GoogleDriveService: Successfully resolved path "${folderPath}" to folder ID: ${currentFolderId}`)
      return currentFolderId
    } catch (error) {
      console.error('GoogleDriveService: Failed to get folder ID by path:', error)
      console.error('GoogleDriveService: Error details:', {
        folderPath,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
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

      // Resolve folder path to folder ID if provided, otherwise use AppData root
      let parentFolderId = this.getRootFolderId()
      if (folderPath) {
        console.log(`GoogleDriveService: Resolving folder path for upload: "${folderPath}"`)
        const resolvedFolderId = await this.getFolderIdByPath(folderPath)
        if (resolvedFolderId) {
          parentFolderId = resolvedFolderId
          console.log(`GoogleDriveService: Resolved folder path "${folderPath}" to folder ID: ${parentFolderId}`)
        } else {
          console.warn(`GoogleDriveService: Failed to resolve folder path "${folderPath}", attempting to create missing folders`)
          // Try to create the folder structure if it doesn't exist
          try {
            const normalizedPath = folderPath.trim().replace(/^\/+|\/+$/g, '')
            const pathParts = normalizedPath.split('/').filter(Boolean)
            
            let currentParentId = this.getRootFolderId()
            for (const folderName of pathParts) {
              // Check if folder exists
              const checkQuery = `'${currentParentId}' in parents and name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
              const checkListParams: any = {
                q: checkQuery,
                fields: 'files(id,name)',
                pageSize: 1
              }
              
              // Only add spaces parameter for AppData storage
              if (this.isAppDataStorage()) {
                checkListParams.spaces = 'appDataFolder'
              }
              
              const checkResponse = await this.drive.files.list(checkListParams)
              
              if (checkResponse.data.files && checkResponse.data.files.length > 0) {
                currentParentId = checkResponse.data.files[0].id
                console.log(`GoogleDriveService: Folder "${folderName}" already exists with ID: ${currentParentId}`)
              } else {
                // Create folder
                console.log(`GoogleDriveService: Creating missing folder "${folderName}" in parent ${currentParentId}`)
                const folderMetadata = {
                  name: folderName,
                  mimeType: 'application/vnd.google-apps.folder',
                  parents: [currentParentId]
                }
                const createResponse = await this.drive.files.create({
                  requestBody: folderMetadata,
                  fields: 'id,name'
                })
                currentParentId = createResponse.data.id
                console.log(`GoogleDriveService: Created folder "${folderName}" with ID: ${currentParentId}`)
              }
            }
            parentFolderId = currentParentId
            console.log(`GoogleDriveService: Successfully created/resolved folder path "${folderPath}" to folder ID: ${parentFolderId}`)
          } catch (createError) {
            console.error(`GoogleDriveService: Failed to create missing folders for path "${folderPath}":`, createError)
            console.warn(`GoogleDriveService: Falling back to root folder (appDataFolder)`)
            parentFolderId = this.getRootFolderId()
          }
        }
      } else {
        console.log(`GoogleDriveService: No folder path provided, using root folder (appDataFolder)`)
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

      const parentFolderId = folderPath ? await this.getFolderIdByPath(folderPath) || this.getRootFolderId() : this.getRootFolderId()
      
      const listParams: any = {
        q: `'${parentFolderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id,name,size,mimeType,webViewLink,createdTime,modifiedTime)',
        pageSize: pageSize || 1000
      }
      
      // Only add spaces parameter for AppData storage
      if (this.isAppDataStorage()) {
        listParams.spaces = 'appDataFolder'
      }
      
      const response = await this.drive.files.list(listParams)

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
      
      let parentFolderId = this.getRootFolderId()
      if (folderPath) {
        parentFolderId = await this.getFolderIdByPath(folderPath) || this.getRootFolderId()
        console.log(`GoogleDriveService: Resolved folder path to ID: ${parentFolderId}`)
      }

      // Escape single quotes in file name for the query
      const escapedFileName = fileName.replace(/'/g, "\\'")
      const query = `'${parentFolderId}' in parents and name='${escapedFileName}' and mimeType!='application/vnd.google-apps.folder' and trashed=false`
      console.log(`GoogleDriveService: Searching with query: ${query}`)

      const listParams: any = {
        q: query,
        fields: 'files(id,name)',
        pageSize: 1
      }
      
      // Only add spaces parameter for AppData storage
      if (this.isAppDataStorage()) {
        listParams.spaces = 'appDataFolder'
      }
      
      const response = await this.drive.files.list(listParams)
      
      if (response.data.files && response.data.files.length > 0) {
        console.log(`GoogleDriveService: Found file "${response.data.files[0].name}" with ID: ${response.data.files[0].id}`)
      }

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

  /**
   * Get a recursive tree structure of folders and files from Google Drive
   * This method lists everything directly from Google Drive without using database data
   */
  async getFolderTree(parentPath?: string, maxDepth: number = 10): Promise<any> {
    try {
      // Ensure we have a valid access token
      if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
        await this.refreshAccessToken()
      }

      const parentFolderId = parentPath ? await this.getFolderIdByPath(parentPath) || this.getRootFolderId() : this.getRootFolderId()
      
      const buildTree = async (folderId: string, folderPath: string, depth: number): Promise<any> => {
        if (depth > maxDepth) {
          return null // Prevent infinite recursion
        }

        // List all items in this folder (both files and subfolders)
        let hasMore = true
        let pageToken: string | undefined = undefined
        const items: any[] = []

        while (hasMore) {
          const listParams: any = {
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime)',
            pageSize: 1000,
            orderBy: 'name'
          }
          
          // Only add spaces parameter for AppData storage
          if (this.isAppDataStorage()) {
            listParams.spaces = 'appDataFolder'
          }
          
          if (pageToken) {
            listParams.pageToken = pageToken
          }

          const listResponse = await this.drive.files.list(listParams)
          
          if (listResponse.data.files && listResponse.data.files.length > 0) {
            items.push(...listResponse.data.files)
          }

          pageToken = listResponse.data.nextPageToken
          hasMore = !!pageToken
        }

        // Separate folders and files
        const folders = items.filter(item => item.mimeType === 'application/vnd.google-apps.folder')
        const files = items.filter(item => item.mimeType !== 'application/vnd.google-apps.folder')

        // Build tree structure
        const tree: any = {
          path: folderPath || '/',
          folderId: folderId,
          folders: [],
          files: files.map((file: any) => ({
            id: file.id,
            name: file.name,
            path: `${folderPath || ''}/${file.name}`.replace(/^\//, ''),
            size: parseInt(file.size || '0'),
            mimeType: file.mimeType,
            createdAt: file.createdTime ? new Date(file.createdTime) : null,
            updatedAt: file.modifiedTime ? new Date(file.modifiedTime) : null,
          })),
          totalFiles: files.length,
          totalFolders: folders.length
        }

        // Recursively build subfolder trees
        for (const folder of folders) {
          const subFolderPath = `${folderPath || ''}/${folder.name}`.replace(/^\//, '')
          const subTree = await buildTree(folder.id, subFolderPath, depth + 1)
          if (subTree) {
            tree.folders.push(subTree)
            tree.totalFiles += subTree.totalFiles
            tree.totalFolders += subTree.totalFolders
          }
        }

        return tree
      }

      return await buildTree(parentFolderId, parentPath || '/', 0)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to get folder tree from ${parentPath || 'root'}`,
        this.providerId,
        'getFolderTree',
        error instanceof Error ? error : undefined
      )
    }
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

      // Use alt: 'media' to download file content
      // The googleapis library returns a stream when alt: 'media' is used
      const response = await this.drive.files.get(
        {
          fileId: fileId,
          alt: 'media'
        },
        {
          responseType: 'stream' // Request stream response
        }
      )

      // Convert stream to Buffer
      const chunks: Buffer[] = []
      const buffer = await new Promise<Buffer>((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          chunks.push(chunk)
        })
        
        response.data.on('end', () => {
          const buffer = Buffer.concat(chunks)
          console.log(`GoogleDriveService: Successfully downloaded file, size: ${buffer.length} bytes`)
          resolve(buffer)
        })
        
        response.data.on('error', (error: Error) => {
          console.error('GoogleDriveService: Stream error:', error)
          reject(error)
        })
      })
      
      return buffer
    } catch (error: any) {
      console.error('GoogleDriveService: Failed to get file buffer from Google Drive:', error)
      console.error('GoogleDriveService: Error details:', {
        filePath,
        message: error instanceof Error ? error.message : String(error),
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data
      })
      return null
    }
  }
}
