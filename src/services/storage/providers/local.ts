import fs from 'fs/promises'
import path from 'path'
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

export class LocalStorageService implements IStorageService {
  private providerId: StorageProviderId = 'local'
  private config: Record<string, any>
  private basePath: string

  constructor(config: Record<string, any>) {
    this.config = config
    this.basePath = config.basePath || process.env.LOCAL_STORAGE_PATH || './uploads'
  }

  getProviderId(): StorageProviderId {
    return this.providerId
  }

  getConfig(): Record<string, any> {
    return this.config
  }

  async validateConnection(): Promise<boolean> {
    try {
      const fullPath = path.isAbsolute(this.basePath) 
        ? this.basePath 
        : path.join(process.cwd(), this.basePath)
      
      await fs.access(fullPath)
      return true
    } catch (error) {
      console.error('Local storage validation failed:', error)
      return false
    }
  }

  async createFolder(name: string, parentPath?: string): Promise<StorageFolderResult> {
    try {
      const folderPath = parentPath ? `${parentPath}/${name}` : name
      const fullPath = this.getFullPath(folderPath)
      
      await this.ensureDirectoryExists(fullPath)
      
      return {
        provider: this.providerId,
        folderId: folderPath,
        name,
        path: folderPath,
        parentId: parentPath,
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
      const fullPath = this.getFullPath(folderPath)
      await fs.rm(fullPath, { recursive: true, force: true })
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
      const fullPath = this.getFullPath(folderPath)
      const stats = await fs.stat(fullPath)
      const files = await fs.readdir(fullPath)
      
      return {
        provider: this.providerId,
        folderId: folderPath,
        name: path.basename(folderPath),
        path: folderPath,
        fileCount: files.length,
        metadata: {},
        createdAt: stats.birthtime,
        updatedAt: stats.mtime
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
      const fullPath = this.getFullPath(parentPath || '')
      const items = await fs.readdir(fullPath, { withFileTypes: true })
      
      const folders = items.filter(item => item.isDirectory())
      const folderInfos: StorageFolderInfo[] = []
      
      for (const folder of folders) {
        const folderPath = parentPath ? `${parentPath}/${folder.name}` : folder.name
        const folderInfo = await this.getFolderInfo(folderPath)
        folderInfos.push(folderInfo)
      }
      
      return folderInfos
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
      const targetPath = folderPath ? `${folderPath}/${filename}` : filename
      const fullPath = this.getFullPath(targetPath)
      
      // Ensure directory exists
      await this.ensureDirectoryExists(path.dirname(fullPath))
      
      // Write file
      await fs.writeFile(fullPath, file)
      
      // Generate URL
      const url = this.getFileUrl(targetPath)
      
      return {
        provider: this.providerId,
        fileId: targetPath,
        url,
        folderId: folderPath,
        path: targetPath,
        size: file.length,
        mimeType,
        metadata
      }
    } catch (error) {
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
      const fullPath = this.getFullPath(filePath)
      await fs.unlink(fullPath)
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
      const fullPath = this.getFullPath(filePath)
      const stats = await fs.stat(fullPath)
      const url = this.getFileUrl(filePath)
      
      return {
        provider: this.providerId,
        fileId: filePath,
        name: path.basename(filePath),
        path: filePath,
        size: stats.size,
        mimeType: this.getMimeType(filePath),
        url,
        folderId: path.dirname(filePath),
        metadata: {},
        createdAt: stats.birthtime,
        updatedAt: stats.mtime
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
      const fullPath = this.getFullPath(folderPath || '')
      const items = await fs.readdir(fullPath, { withFileTypes: true })
      
      const files = items.filter(item => item.isFile())
      const fileInfos: StorageFileInfo[] = []
      
      const limit = pageSize || files.length
      for (let i = 0; i < Math.min(files.length, limit); i++) {
        const file = files[i]
        const filePath = folderPath ? `${folderPath}/${file.name}` : file.name
        const fileInfo = await this.getFileInfo(filePath)
        fileInfos.push(fileInfo)
      }
      
      return fileInfos
    } catch (error) {
      throw new StorageOperationError(
        `Failed to list files in ${folderPath || 'root'}`,
        this.providerId,
        'listFiles',
        error instanceof Error ? error : undefined
      )
    }
  }

  async updateFileMetadata(filePath: string, metadata: Record<string, any>): Promise<void> {
    // For local storage, metadata is typically stored in a separate file
    // This is a simplified implementation
    try {
      const metadataPath = this.getFullPath(`${filePath}.meta`)
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
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
      const fullPath = this.getFullPath(filePath)
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }

  async folderExists(folderPath: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(folderPath)
      const stats = await fs.stat(fullPath)
      return stats.isDirectory()
    } catch {
      return false
    }
  }

  getFileUrl(filePath: string): string {
    const encodedPath = filePath.split('/').map(segment => encodeURIComponent(segment)).join('/')
    return `/api/storage/serve/local/${encodedPath}`
  }

  getFolderUrl(folderPath: string): string {
    const encodedPath = folderPath.split('/').map(segment => encodeURIComponent(segment)).join('/')
    return `/api/storage/serve/local/${encodedPath}`
  }

  async getFileBuffer(filePath: string): Promise<Buffer | null> {
    try {
      const fullPath = this.getFullPath(filePath)
      const buffer = await fs.readFile(fullPath)
      return buffer
    } catch (error) {
      console.error(`Failed to read file buffer for ${filePath}:`, error)
      return null
    }
  }

  private getFullPath(relativePath: string): string {
    if (path.isAbsolute(this.basePath)) {
      return path.join(this.basePath, relativePath)
    } else {
      return path.join(process.cwd(), this.basePath, relativePath)
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath)
    } catch {
      await fs.mkdir(dirPath, { recursive: true })
    }
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json'
    }
    return mimeTypes[ext] || 'application/octet-stream'
  }
}
