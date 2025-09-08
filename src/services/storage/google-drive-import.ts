import { GoogleDriveService } from './providers/google-drive'
import { GoogleDriveConfig } from './types'

export interface GoogleDriveFolder {
  id: string
  name: string
  path: string
  parentPath?: string
}

export interface GoogleDriveFile {
  id: string
  name: string
  path: string
  parentPath: string
  size: number
  mimeType: string
}

export class GoogleDriveImportService extends GoogleDriveService {
  constructor(config: GoogleDriveConfig) {
    super(config)
  }

  async listImportFolders(): Promise<GoogleDriveFolder[]> {
    try {
      const folders: GoogleDriveFolder[] = []
      const config = this.getConfig()
      
      // Recursively scan folders starting from the root folder
      await this.scanFoldersRecursively(config.folderId, folders)
      
      return folders
    } catch (error) {
      console.error('Failed to list Google Drive folders:', error)
      throw new Error(`Failed to list folders: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async scanFoldersRecursively(folderId: string, folders: GoogleDriveFolder[]): Promise<void> {
    try {
      let nextPageToken: string | undefined

      do {
        const response = await this.drive.files.list({
          q: `mimeType='application/vnd.google-apps.folder' and '${folderId}' in parents and trashed=false`,
          pageSize: 100,
          fields: 'nextPageToken,files(id,name,parents,trashed)',
          pageToken: nextPageToken
        })

        for (const folder of response.data.files || []) {
          // Skip trashed folders immediately
          if (folder.trashed) {
            continue
          }
          
          // Skip thumb folders immediately as they are part of album data, not separate albums
          if (folder.name?.toLowerCase() === 'thumb') {
            continue
          }

          // Skip trash folders by name immediately
          if (folder.name?.toLowerCase().includes('trash') || folder.name?.toLowerCase().includes('bin')) {
            continue
          }

          const path = await this.getFolderPath(folder.id!)
          const parentPath = folder.parents && folder.parents.length > 0 
            ? await this.getFolderPath(folder.parents[0])
            : undefined

          folders.push({
            id: folder.id!,
            name: folder.name!,
            path,
            parentPath
          })

          // Recursively scan subfolders
          await this.scanFoldersRecursively(folder.id!, folders)
        }

        nextPageToken = response.data.nextPageToken
      } while (nextPageToken)
    } catch (error) {
      console.warn(`Failed to scan folder ${folderId}:`, error)
      // Continue with other folders even if one fails
    }
  }

  async listImportFiles(folderId?: string): Promise<GoogleDriveFile[]> {
    try {
      const files: GoogleDriveFile[] = []
      const config = this.getConfig()
      
      // Use provided folderId or default to root folder
      const targetFolderId = folderId || config.folderId
      
      // If folderId is provided, scan only that folder (non-recursive)
      // If no folderId, scan from root recursively
      const recursive = !folderId
      
      await this.scanFilesRecursively(targetFolderId, files, recursive)
      
      return files
    } catch (error) {
      console.error('Failed to list Google Drive files:', error)
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async scanFilesRecursively(folderId: string, files: GoogleDriveFile[], recursive: boolean = true): Promise<void> {
    try {
      let nextPageToken: string | undefined

      do {
        const query = `mimeType contains 'image/' and '${folderId}' in parents and trashed=false`
        
        const response = await this.drive.files.list({
          q: query,
          pageSize: 100,
          fields: 'nextPageToken,files(id,name,parents,size,mimeType,trashed)',
          pageToken: nextPageToken
        })

        for (const file of response.data.files || []) {
          try {
            // Skip trashed files immediately
            if (file.trashed) {
              continue
            }
            
            // Skip files that start with 'thumb-' as they are thumbnails
            if (file.name?.toLowerCase().startsWith('thumb-')) {
              continue
            }
            
            const path = await this.getFilePath(file.id!)
            const parentPath = file.parents && file.parents.length > 0 
              ? await this.getFolderPath(file.parents[0])
              : ''

            // Skip files in thumb folders as they are thumbnails, not original photos
            if (parentPath.includes('/thumb')) {
              continue
            }

            // Skip files in trash folders
            if (parentPath.toLowerCase().includes('trash') || parentPath.toLowerCase().includes('bin')) {
              continue
            }

            files.push({
              id: file.id!,
              name: file.name!,
              path,
              parentPath,
              size: parseInt(file.size || '0'),
              mimeType: file.mimeType!
            })
          } catch (fileError: any) {
            console.warn(`Failed to process file ${file.name}:`, fileError.message)
            // Continue with other files
          }
        }

        nextPageToken = response.data.nextPageToken
      } while (nextPageToken)

      // Also scan for subfolders and recursively scan files in them (only if recursive=true)
      if (recursive) {
        const subfoldersResponse = await this.drive.files.list({
          q: `mimeType='application/vnd.google-apps.folder' and '${folderId}' in parents and trashed=false`,
          pageSize: 100,
          fields: 'files(id)'
        })

        for (const subfolder of subfoldersResponse.data.files || []) {
          await this.scanFilesRecursively(subfolder.id!, files, true)
        }
      }
    } catch (error) {
      console.warn(`Failed to scan files in folder ${folderId}:`, error)
      // Continue with other folders even if one fails
    }
  }

  async getImportFileBuffer(fileId: string): Promise<Buffer | null> {
    // Use the provider's getFileBuffer method which handles path resolution
    // First, we need to get the file path from the fileId
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id,name,parents'
      })

      const file = response.data
      const parentPath = file.parents && file.parents.length > 0 
        ? await this.getFolderPath(file.parents[0])
        : '/'
      
      const filePath = `${parentPath}/${file.name}`
      return await super.getFileBuffer(filePath)
    } catch (error) {
      console.error(`Failed to get file buffer for ${fileId}:`, error)
      return null
    }
  }

  private async getFolderPath(folderId: string): Promise<string> {
    try {
      const config = this.getConfig()
      
      // If this is the root folder ID from config, return root path
      if (folderId === config.folderId) {
        return '/'
      }

      const pathParts: string[] = []
      let currentId = folderId

      while (currentId) {
        // Check if we've reached the root folder BEFORE making the API call
        if (currentId === config.folderId) {
          break
        }
        
        try {
          const response = await this.drive.files.get({
            fileId: currentId,
            fields: 'id,name,parents'
          })

          const folder = response.data
          pathParts.unshift(folder.name!)

          // If no parents, stop here
          if (!folder.parents || folder.parents.length === 0) {
            break
          }

          currentId = folder.parents[0]
        } catch (folderError: any) {
          // If we can't access a parent folder, stop traversing and use what we have
          console.warn(`Cannot access parent folder ${currentId}:`, folderError.message)
          break
        }
      }

      return pathParts.length > 0 ? '/' + pathParts.join('/') : `/${folderId}`
    } catch (error) {
      console.error(`Failed to get folder path for ${folderId}:`, error)
      return `/${folderId}`
    }
  }

  private async getFilePath(fileId: string): Promise<string> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id,name,parents'
      })

      const file = response.data
      const parentPath = file.parents && file.parents.length > 0 
        ? await this.getFolderPath(file.parents[0])
        : '/'

      return `${parentPath}/${file.name}`
    } catch (error) {
      console.error(`Failed to get file path for ${fileId}:`, error)
      return `/${fileId}`
    }
  }
}
