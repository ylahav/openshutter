import { google } from 'googleapis'
import { Logger } from '@nestjs/common'
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
import { storageConfigService } from '../config'

export class GoogleDriveService implements IStorageService {
  private readonly logger = new Logger(GoogleDriveService.name)
  private providerId: StorageProviderId = 'google-drive'
  private config: Record<string, any>
  protected drive: any
  private auth: any
  private lastTokenSave: number = 0
  private readonly TOKEN_SAVE_THROTTLE = 5000 // Save token max once per 5 seconds
  private lastInvalidGrantError: number = 0
  private readonly INVALID_GRANT_THROTTLE = 5 * 60 * 1000 // Don't retry invalid_grant for 5 minutes

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
   * Whether authentication uses a Service Account (no OAuth redirect/refresh).
   * Recommended for deployed servers to avoid invalid_grant and redirect URI issues.
   */
  private isServiceAccount(): boolean {
    return this.config.authMethod === 'service_account'
  }

  /**
   * Get the root folder ID based on storage type
   * - Service Account: folderId (required; folder must be shared with service account email)
   * - AppData: Hidden folder accessible only with drive.appdata scope
   * - Visible: User's Drive folder (root or specified folderId)
   */
  private getRootFolderId(): string {
    if (this.isServiceAccount()) {
      return this.config.folderId || 'root'
    }
    const storageType = this.config.storageType || 'appdata'
    if (storageType === 'visible') {
      if (this.config.folderId && this.config.folderId !== 'appDataFolder') {
        return this.config.folderId
      }
      return 'root'
    }
    return 'appDataFolder'
  }

  /**
   * Check if using AppData storage (hidden). Service account always uses shared folder (visible).
   */
  private isAppDataStorage(): boolean {
    if (this.isServiceAccount()) return false
    const storageType = this.config.storageType || 'appdata'
    return storageType === 'appdata'
  }

  /**
   * Parse service account credentials from config (serviceAccountJson string or client_email + private_key).
   */
  private getServiceAccountCredentials(): { client_email: string; private_key: string } {
    let key: { client_email?: string; private_key?: string }
    if (this.config.serviceAccountJson) {
      const raw = typeof this.config.serviceAccountJson === 'string'
        ? this.config.serviceAccountJson.trim()
        : JSON.stringify(this.config.serviceAccountJson)
      key = JSON.parse(raw) as { client_email?: string; private_key?: string }
    } else if (this.config.client_email && this.config.private_key) {
      key = {
        client_email: this.config.client_email,
        private_key: this.config.private_key
      }
    } else {
      throw new Error('Service account requires either serviceAccountJson or client_email + private_key')
    }
    if (!key.client_email || !key.private_key) {
      throw new Error('Service account JSON must contain client_email and private_key')
    }
    const private_key = key.private_key.replace(/\\n/g, '\n')
    return { client_email: key.client_email, private_key }
  }

  private initializeAuth() {
    if (this.isServiceAccount()) {
      const credentials = this.getServiceAccountCredentials()
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: credentials.client_email,
          private_key: credentials.private_key
        },
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/drive.file'
        ]
      })
      this.auth = auth
      this.drive = google.drive({ version: 'v3', auth: this.auth })
      return
    }
    this.auth = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret
    )
    if (this.config.redirectUri) {
      this.auth.redirectUri = this.config.redirectUri
    }
    if (this.config.accessToken && this.config.tokenExpiry && new Date() < this.config.tokenExpiry) {
      this.auth.setCredentials({ access_token: this.config.accessToken })
    } else if (this.config.refreshToken) {
      this.auth.setCredentials({ refresh_token: this.config.refreshToken })
    }
    this.drive = google.drive({ version: 'v3', auth: this.auth })
  }

  /**
   * Ensure valid auth: refresh OAuth token if needed; no-op for service account.
   */
  private async ensureAuth(): Promise<void> {
    if (this.isServiceAccount()) return
    if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
      await this.refreshAccessToken()
    }
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      if (!this.config.refreshToken) {
        throw new Error('Refresh token is missing')
      }
      
      // Check if we recently got an invalid_grant error - throttle retries to prevent endless loops
      const now = Date.now()
      const timeSinceLastError = now - this.lastInvalidGrantError
      if (this.lastInvalidGrantError > 0 && timeSinceLastError < this.INVALID_GRANT_THROTTLE) {
        const minutesRemaining = Math.ceil((this.INVALID_GRANT_THROTTLE - timeSinceLastError) / 60000)
        const error: any = new Error(
          `Refresh token is invalid or expired. Please generate a new token in the admin panel. Retry throttled for ${minutesRemaining} more minute(s) to prevent excessive error logging.`
        )
        error.code = 'invalid_grant'
        error.details = {
          authError: true,
          throttled: true,
          retryAfter: new Date(now + this.INVALID_GRANT_THROTTLE - timeSinceLastError),
          minutesRemaining
        }
        throw error
      }
      
      // Log token refresh attempt for debugging (without exposing sensitive data)
      // Only log if we haven't recently failed (to reduce noise)
      if (timeSinceLastError >= this.INVALID_GRANT_THROTTLE || this.lastInvalidGrantError === 0) {
        this.logger.debug('Attempting to refresh Google Drive access token', JSON.stringify({
          hasRefreshToken: !!this.config.refreshToken,
          refreshTokenLength: this.config.refreshToken?.length,
          refreshTokenPreview: this.config.refreshToken?.substring(0, 20) + '...',
          clientId: this.config.clientId ? `${this.config.clientId.substring(0, 20)}...` : 'missing',
          hasClientSecret: !!this.config.clientSecret
        }))
      }
      
      const { credentials } = await this.auth.refreshAccessToken()
      
      // Reset invalid_grant error tracking on successful refresh
      this.lastInvalidGrantError = 0
      this.config.accessToken = credentials.access_token
      this.config.tokenExpiry = credentials.expiry_date ? new Date(credentials.expiry_date) : undefined
      
      // Update the auth instance
      this.auth.setCredentials(credentials)
      
      this.logger.debug('Successfully refreshed Google Drive access token', JSON.stringify({
        hasAccessToken: !!credentials.access_token,
        expiryDate: credentials.expiry_date
      }))
      
      // Persist the new access token to database (throttled to avoid too many writes)
      await this.saveAccessTokenToDatabase(credentials.access_token, credentials.expiry_date)
    } catch (error: any) {
      this.logger.error(`Failed to refresh Google Drive access token: ${error instanceof Error ? error.message : String(error)}`)
      
      // Check for invalid_grant error specifically
      const responseData = error?.response?.data
      if (responseData?.error === 'invalid_grant') {
        // Record the time of this error to throttle future retries
        this.lastInvalidGrantError = Date.now()
        
        // Create a detailed error that preserves the Google API error structure
        const detailedError: any = new Error(
          `Authentication failed: The refresh token is invalid or expired. Please generate a new token in the admin storage settings.`
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
            'Go to Admin → Storage Settings → Google Drive → Click "Generate New Token"',
            'Complete the OAuth authorization flow',
            'The new refresh token will be automatically saved',
            'Verify your Client ID and Client Secret match your Google Cloud Console OAuth app',
            'Check if access was revoked at https://myaccount.google.com/permissions'
          ]
        }
        detailedError.originalError = error
        
        // Only log the error once per throttle period to reduce noise
        const timeSinceLastLog = Date.now() - this.lastInvalidGrantError
        if (timeSinceLastLog === 0 || timeSinceLastLog >= this.INVALID_GRANT_THROTTLE) {
          this.logger.error('GoogleDriveService: Invalid refresh token detected. Please generate a new token in admin storage settings.')
        }
        
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

  /**
   * Save access token to database (throttled to avoid excessive writes)
   */
  private async saveAccessTokenToDatabase(accessToken: string, expiryDate?: number): Promise<void> {
    const now = Date.now()
    
    // Throttle: Only save if enough time has passed since last save
    if (now - this.lastTokenSave < this.TOKEN_SAVE_THROTTLE) {
      return
    }
    
    try {
      this.lastTokenSave = now
      
      // Update only the accessToken and tokenExpiry in the config
      await storageConfigService.updateConfig(this.providerId, {
        config: {
          ...this.config,
          accessToken: accessToken,
          tokenExpiry: expiryDate ? new Date(expiryDate) : undefined
        }
      })
      
      this.logger.debug('Successfully saved Google Drive access token to database')
    } catch (error) {
      // Don't throw - token refresh succeeded, saving is just optimization
      this.logger.warn(`Failed to save Google Drive access token to database (non-critical): ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      if (this.isServiceAccount()) {
        this.getServiceAccountCredentials()
        if (!this.config.folderId || this.config.folderId === 'appDataFolder') {
          throw new Error('Service account requires a folder ID. Create a folder in Drive and share it with the service account email (Editor).')
        }
        await this.drive.files.get({
          fileId: this.config.folderId,
          fields: 'id,name'
        })
        return true
      }
      if (!this.config.clientId) throw new Error('Google Drive Client ID is not configured')
      if (!this.config.clientSecret) throw new Error('Google Drive Client Secret is not configured')
      if (!this.config.refreshToken && !this.config.accessToken) {
        throw new Error('Google Drive authentication tokens are missing. Please authorize the application.')
      }
      if (this.config.refreshToken) {
        const token = this.config.refreshToken.trim()
        if (token.length < 50 || (!token.startsWith('1/') && !token.startsWith('4/'))) {
          throw new Error(
            'Invalid refresh token format. Refresh tokens should be long strings starting with "1/" or "4/". ' +
            'Please generate a new refresh token using the "Generate New Token" button.'
          )
        }
      }
      await this.ensureAuth()
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
      this.logger.error(`Google Drive connection validation failed: ${error instanceof Error ? error.message : String(error)}`)
      
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
      await this.ensureAuth()

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
      await this.ensureAuth()

      // For Google Drive, we need to get the folder ID first
      const folderId = await this.getFolderIdByPath(folderPath)
      if (!folderId) {
        this.logger.warn(`GoogleDriveService: Folder not found for path: ${folderPath}`)
        return // Folder doesn't exist, nothing to delete
      }

      this.logger.debug(`GoogleDriveService: Deleting folder ${folderPath} (ID: ${folderId})`)

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

      this.logger.debug(`GoogleDriveService: Found ${filesToDelete.length} items to delete in folder ${folderPath}`)

      // Delete all files and sub-folders
      for (const fileId of filesToDelete) {
        try {
          await this.drive.files.delete({ fileId })
        } catch (deleteError) {
          this.logger.warn(`GoogleDriveService: Failed to delete item ${fileId} in folder ${folderPath}:`, deleteError)
          // Continue deleting other items even if one fails
        }
      }

      // Now delete the folder itself
      await this.drive.files.delete({ fileId: folderId })
      this.logger.debug(`GoogleDriveService: Successfully deleted folder ${folderPath}`)
    } catch (error) {
      this.logger.error(`GoogleDriveService: Failed to delete folder ${folderPath}:`, error)
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
        await this.ensureAuth()
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
        await this.ensureAuth()
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
        this.logger.debug('GoogleDriveService: Empty folder path, returning root folder')
        return this.getRootFolderId()
      }

      // Normalize path: remove leading/trailing slashes and split
      const normalizedPath = folderPath.trim().replace(/^\/+|\/+$/g, '')
      const pathParts = normalizedPath.split('/').filter(Boolean)
      
      this.logger.debug(`GoogleDriveService: Resolving path "${folderPath}" -> normalized: "${normalizedPath}" -> parts:`, pathParts)
      
      if (pathParts.length === 0) {
        this.logger.debug('GoogleDriveService: No path parts after normalization, returning root folder')
        return this.getRootFolderId()
      }

      let currentFolderId = this.getRootFolderId()
      this.logger.debug(`GoogleDriveService: Starting from root folder ID: ${currentFolderId}`)

      for (let i = 0; i < pathParts.length; i++) {
        const folderName = pathParts[i]
        const query = `'${currentFolderId}' in parents and name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
        
        this.logger.debug(`GoogleDriveService: Looking for folder "${folderName}" in parent ${currentFolderId}`)
        
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
          // If multiple folders with same name exist, use the first one
          // (Google Drive allows multiple folders with the same name in the same parent)
          currentFolderId = response.data.files[0].id
          this.logger.debug(`GoogleDriveService: Found folder "${folderName}" with ID: ${currentFolderId} (found ${response.data.files.length} folder(s) with this name)`)
        } else {
          this.logger.warn(`GoogleDriveService: Folder "${folderName}" not found in parent ${currentFolderId} (path part ${i + 1}/${pathParts.length})`)
          this.logger.warn(`GoogleDriveService: Query used: ${query}`)
          this.logger.warn(`GoogleDriveService: List params:`, JSON.stringify(listParams, null, 2))
          return null
        }
      }
      
      this.logger.debug(`GoogleDriveService: Successfully resolved path "${folderPath}" to folder ID: ${currentFolderId}`)
      return currentFolderId
    } catch (error) {
      this.logger.error('GoogleDriveService: Failed to get folder ID by path:', error)
      this.logger.error('GoogleDriveService: Error details:', {
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
        await this.ensureAuth()
      }

      // Resolve folder path to folder ID if provided, otherwise use AppData root
      let parentFolderId = this.getRootFolderId()
      if (folderPath) {
        this.logger.debug(`GoogleDriveService: Resolving folder path for upload: "${folderPath}"`)
        const resolvedFolderId = await this.getFolderIdByPath(folderPath)
        if (resolvedFolderId) {
          parentFolderId = resolvedFolderId
          this.logger.debug(`GoogleDriveService: Resolved folder path "${folderPath}" to folder ID: ${parentFolderId}`)
        } else {
          this.logger.warn(`GoogleDriveService: Failed to resolve folder path "${folderPath}", attempting to create missing folders`)
          // Try to create the folder structure if it doesn't exist
          try {
            const normalizedPath = folderPath.trim().replace(/^\/+|\/+$/g, '')
            const pathParts = normalizedPath.split('/').filter(Boolean)
            
            let currentParentId = this.getRootFolderId()
            for (const folderName of pathParts) {
              // Check if folder exists - retry logic to handle race conditions
              let folderFound = false
              let retries = 0
              const maxRetries = 3
              
              while (!folderFound && retries < maxRetries) {
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
                  this.logger.debug(`GoogleDriveService: Folder "${folderName}" found with ID: ${currentParentId}`)
                  folderFound = true
                } else {
                  // Folder doesn't exist, try to create it
                  if (retries === 0) {
                    this.logger.debug(`GoogleDriveService: Folder "${folderName}" not found, creating...`)
                  }
                  
                  try {
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
                    this.logger.debug(`GoogleDriveService: Created folder "${folderName}" with ID: ${currentParentId}`)
                    folderFound = true
                  } catch (createError: any) {
                    // If folder creation fails, it might have been created by another request
                    // Wait a bit and retry the check
                    if (createError.code === 409 || createError.status === 409 || 
                        (createError.message && (createError.message.includes('duplicate') || createError.message.includes('already exists')))) {
                      this.logger.debug(`GoogleDriveService: Folder "${folderName}" may have been created concurrently, retrying check (attempt ${retries + 1}/${maxRetries})...`)
                      retries++
                      if (retries < maxRetries) {
                        // Wait a short time before retrying (exponential backoff)
                        await new Promise(resolve => setTimeout(resolve, 100 * retries))
                        continue
                      }
                    }
                    
                    // If we've exhausted retries or it's a different error, log and handle
                    this.logger.error(`GoogleDriveService: Failed to create/find folder "${folderName}" in parent ${currentParentId}:`, createError)
                    this.logger.error(`GoogleDriveService: Create error details:`, {
                      message: createError.message,
                      code: createError.code,
                      status: createError.status,
                      response: createError.response?.data,
                      parentId: currentParentId,
                      folderName: folderName,
                      storageType: this.config.storageType || 'appdata',
                      isAppData: this.isAppDataStorage()
                    })
                    
                    // On final retry, try one more check in case folder was created
                    if (retries >= maxRetries - 1) {
                      const finalCheck = await this.drive.files.list(checkListParams)
                      if (finalCheck.data.files && finalCheck.data.files.length > 0) {
                        currentParentId = finalCheck.data.files[0].id
                        this.logger.debug(`GoogleDriveService: Found folder "${folderName}" on final check with ID: ${currentParentId}`)
                        folderFound = true
                        break
                      }
                    }
                    
                    throw createError // Re-throw to be caught by outer catch
                  }
                }
                
                retries++
              }
              
              if (!folderFound) {
                throw new Error(`Failed to create or find folder "${folderName}" after ${maxRetries} attempts`)
              }
            }
            parentFolderId = currentParentId
            this.logger.debug(`GoogleDriveService: Successfully created/resolved folder path "${folderPath}" to folder ID: ${parentFolderId}`)
          } catch (createError) {
            this.logger.error(`GoogleDriveService: Failed to create missing folders for path "${folderPath}":`, createError)
            const rootFolderId = this.getRootFolderId()
            const rootFolderName = this.isAppDataStorage() ? 'appDataFolder' : (rootFolderId === 'root' ? 'root' : `folder ${rootFolderId}`)
            this.logger.warn(`GoogleDriveService: Falling back to root folder (${rootFolderName})`)
            parentFolderId = rootFolderId
          }
        }
      } else {
        const rootFolderId = this.getRootFolderId()
        const rootFolderName = this.isAppDataStorage() ? 'appDataFolder' : (rootFolderId === 'root' ? 'root' : `folder ${rootFolderId}`)
        this.logger.debug(`GoogleDriveService: No folder path provided, using root folder (${rootFolderName})`)
      }
      
      // Google Drive API has specific fields - filter out custom metadata that conflicts
      // Store custom metadata in appProperties instead
      const googleDriveReservedFields = ['name', 'parents', 'size', 'mimeType', 'description', 'starred', 'trashed', 'viewedByMe', 'viewersCanCopyContent', 'writersCanShare']
      const customMetadata: Record<string, any> = {}
      const fileMetadata: any = {
        name: filename,
        parents: [parentFolderId]
      }
      
      // Separate custom metadata from Google Drive reserved fields
      if (metadata) {
        for (const [key, value] of Object.entries(metadata)) {
          if (googleDriveReservedFields.includes(key)) {
            // Skip reserved fields - they can't be set via metadata
            this.logger.debug(`GoogleDriveService: Skipping reserved field "${key}" from metadata`)
          } else {
            // Store custom metadata in appProperties (Google Drive's way to store custom data)
            customMetadata[key] = value
          }
        }
        
        // Add custom metadata as appProperties if any exists
        if (Object.keys(customMetadata).length > 0) {
          fileMetadata.appProperties = customMetadata
        }
      }

      this.logger.debug(`GoogleDriveService: Uploading file "${filename}" to parent folder ID: ${parentFolderId}`, {
        storageType: this.config.storageType || 'appdata',
        isAppData: this.isAppDataStorage(),
        fileSize: file.length,
        mimeType: mimeType
      })

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
      
      this.logger.debug(`GoogleDriveService: Successfully uploaded file "${filename}" with ID: ${response.data.id}`)

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
      this.logger.error(`GoogleDriveService: Upload failed for ${filename}:`, error)
      this.logger.error(`GoogleDriveService: Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        code: error.code,
        status: error.status,
        statusText: error.statusText,
        response: error.response?.data,
        folderPath: folderPath,
        storageType: this.config.storageType || 'appdata',
        isAppData: this.isAppDataStorage(),
        rootFolderId: this.getRootFolderId()
      })
      
      // Provide more detailed error message
      let errorMessage = `Failed to upload file ${filename}`
      if (error.code === 403 || error.status === 403) {
        errorMessage += '. Permission denied - check OAuth scopes and folder permissions'
      } else if (error.code === 404 || error.status === 404) {
        errorMessage += '. Folder not found - check if the album folder exists'
      } else if (error.message) {
        errorMessage += `: ${error.message}`
      }
      
      throw new StorageOperationError(
        errorMessage,
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
        await this.ensureAuth()
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
        await this.ensureAuth()
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
        await this.ensureAuth()
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
      this.logger.debug(`GoogleDriveService: Getting file ID for path: ${filePath}`)
      
      const pathParts = filePath.split('/').filter(Boolean)
      if (pathParts.length === 0) {
        this.logger.debug(`GoogleDriveService: Empty path parts for: ${filePath}`)
        return null
      }

      const fileName = pathParts[pathParts.length - 1]
      const folderPath = pathParts.slice(0, -1).join('/')
      
      this.logger.debug(`GoogleDriveService: File name: ${fileName}, folder path: ${folderPath}`)
      
      let parentFolderId = this.getRootFolderId()
      if (folderPath) {
        parentFolderId = await this.getFolderIdByPath(folderPath) || this.getRootFolderId()
        this.logger.debug(`GoogleDriveService: Resolved folder path to ID: ${parentFolderId}`)
      }

      // Escape single quotes in file name for the query
      const escapedFileName = fileName.replace(/'/g, "\\'")
      const query = `'${parentFolderId}' in parents and name='${escapedFileName}' and mimeType!='application/vnd.google-apps.folder' and trashed=false`
      this.logger.debug(`GoogleDriveService: Searching with query: ${query}`)

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
        this.logger.debug(`GoogleDriveService: Found file "${response.data.files[0].name}" with ID: ${response.data.files[0].id}`)
      }

      const fileId = response.data.files && response.data.files.length > 0 ? response.data.files[0].id : null
      this.logger.debug(`GoogleDriveService: Found file ID: ${fileId} for path: ${filePath}`)
      
      return fileId
    } catch (error) {
      this.logger.error('GoogleDriveService: Failed to get file ID by path:', error)
      return null
    }
  }

  async updateFileMetadata(filePath: string, metadata: Record<string, any>): Promise<void> {
    try {
      // Ensure we have a valid access token
      if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
        await this.ensureAuth()
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
        await this.ensureAuth()
      }

      const rootFolderId = this.getRootFolderId()
      let parentFolderId: string
      
      if (parentPath) {
        // Try to resolve the provided path
        const resolvedId = await this.getFolderIdByPath(parentPath)
        parentFolderId = resolvedId || rootFolderId
        this.logger.debug(`GoogleDriveService: Resolved parentPath "${parentPath}" to folder ID: ${parentFolderId}`)
      } else {
        // No path provided, use root folder
        parentFolderId = rootFolderId
        this.logger.debug(`GoogleDriveService: No parentPath provided, using root folder ID: ${parentFolderId}`)
      }
      
      this.logger.debug(`GoogleDriveService: Building folder tree`, {
        parentPath: parentPath || 'root',
        parentFolderId,
        rootFolderId,
        storageType: this.config.storageType || 'appdata',
        isAppData: this.isAppDataStorage(),
        configuredFolderId: this.config.folderId,
        maxDepth
      })
      
      const buildTree = async (folderId: string, folderPath: string, depth: number): Promise<any> => {
        if (depth > maxDepth) {
          return null // Prevent infinite recursion
        }

        this.logger.debug(`GoogleDriveService: Building tree for folder ID: ${folderId}, path: ${folderPath}, depth: ${depth}`)

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
          // For visible storage, don't add spaces parameter - it will search all of Drive
          if (this.isAppDataStorage()) {
            listParams.spaces = 'appDataFolder'
          }
          
          if (pageToken) {
            listParams.pageToken = pageToken
          }

          this.logger.debug(`GoogleDriveService: Listing files in folder ${folderId}`, {
            query: listParams.q,
            hasSpaces: !!listParams.spaces,
            isAppData: this.isAppDataStorage(),
            storageType: this.config.storageType || 'appdata',
            pageToken: pageToken || 'none',
            folderId: folderId,
            folderPath: folderPath
          })

          const listResponse = await this.drive.files.list(listParams)
          
          this.logger.debug(`GoogleDriveService: List response`, {
            fileCount: listResponse.data.files?.length || 0,
            hasNextPage: !!listResponse.data.nextPageToken,
            files: listResponse.data.files?.slice(0, 5).map((f: any) => ({ id: f.id, name: f.name, mimeType: f.mimeType })) || []
          })
          
          if (listResponse.data.files && listResponse.data.files.length > 0) {
            items.push(...listResponse.data.files)
          }

          pageToken = listResponse.data.nextPageToken
          hasMore = !!pageToken
        }
        
        this.logger.debug(`GoogleDriveService: Collected ${items.length} items from folder ${folderId}`, {
          folders: items.filter(item => item.mimeType === 'application/vnd.google-apps.folder').length,
          files: items.filter(item => item.mimeType !== 'application/vnd.google-apps.folder').length
        })

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
            createdAt: file.createdTime ? file.createdTime : null,
            updatedAt: file.modifiedTime ? file.modifiedTime : null,
          })),
          totalFiles: files.length,
          totalFolders: folders.length
        }
        
        // Log tree structure for debugging
        this.logger.debug(`GoogleDriveService: Tree structure built`, {
          path: tree.path,
          folderId: tree.folderId,
          foldersCount: tree.folders.length,
          filesCount: tree.files.length,
          totalFolders: tree.totalFolders,
          totalFiles: tree.totalFiles
        })

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

      const result = await buildTree(parentFolderId, parentPath || '/', 0)
      
      // Ensure we always return a valid tree structure, even if empty
      if (!result) {
        this.logger.warn(`GoogleDriveService: buildTree returned null, creating empty tree structure`)
        return {
          path: parentPath || '/',
          folderId: parentFolderId,
          folders: [],
          files: [],
          totalFiles: 0,
          totalFolders: 0
        }
      }
      
      this.logger.debug(`GoogleDriveService: Folder tree built successfully`, {
        path: result?.path,
        folderId: result?.folderId,
        foldersCount: result?.folders?.length || 0,
        filesCount: result?.files?.length || 0,
        folderCount: result?.totalFolders || 0,
        fileCount: result?.totalFiles || 0
      })
      return result
    } catch (error) {
      this.logger.error(`GoogleDriveService: Failed to get folder tree:`, error)
      this.logger.error(`GoogleDriveService: Error details:`, {
        parentPath: parentPath || 'root',
        storageType: this.config.storageType || 'appdata',
        isAppData: this.isAppDataStorage(),
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error
      })
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
      this.logger.debug(`GoogleDriveService: Getting file buffer for path: ${filePath}`)
      
      // Ensure we have a valid access token
      if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
        this.logger.debug('GoogleDriveService: Refreshing access token for getFileBuffer...')
        await this.ensureAuth()
      }

      const fileId = await this.getFileIdByPath(filePath)
      if (!fileId) {
        this.logger.debug(`GoogleDriveService: Could not find file ID for path: ${filePath}`)
        return null
      }

      this.logger.debug(`GoogleDriveService: Found file ID: ${fileId} for path: ${filePath}`)

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
          this.logger.debug(`GoogleDriveService: Successfully downloaded file, size: ${buffer.length} bytes`)
          resolve(buffer)
        })
        
        response.data.on('error', (error: Error) => {
          this.logger.error('GoogleDriveService: Stream error:', error)
          reject(error)
        })
      })
      
      return buffer
    } catch (error: any) {
      this.logger.error('GoogleDriveService: Failed to get file buffer from Google Drive:', error)
      this.logger.error('GoogleDriveService: Error details:', {
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
