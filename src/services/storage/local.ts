import * as fs from 'fs/promises'
import * as path from 'path'
import { IStorageService, StorageProviderId, StorageUploadResult, StorageFolderResult, StorageFileInfo, StorageFolderInfo } from './types'

export interface LocalStorageConfig {
  path: string
  maxSize: number
  baseUrl?: string
}

export class LocalStorage implements IStorageService {
  private providerId: StorageProviderId = 'local'
  private config: LocalStorageConfig
  private basePath: string

  constructor(config: LocalStorageConfig) {
    this.config = config
    // Handle both absolute and relative paths
    if (path.isAbsolute(config.path)) {
      this.basePath = config.path
    } else {
      // If relative path, resolve from project root
      this.basePath = path.resolve(process.cwd(), config.path)
    }
    
  }

  getProviderId(): StorageProviderId {
    return this.providerId
  }

  getConfig(): Record<string, any> {
    return this.config
  }

  async uploadFile(
    file: Buffer,
    filename: string,
    mimeType: string,
    folderPath?: string,
    metadata?: Record<string, any>
  ): Promise<StorageUploadResult> {
    try {
      // Determine target directory based on folderPath
      let targetDirectory = this.basePath
      let urlPath = filename
      
      if (folderPath) {
        targetDirectory = path.join(this.basePath, folderPath)
        urlPath = `${folderPath}/${filename}`
      }
      
      // Ensure target directory exists
      await this.ensureDirectoryExists(targetDirectory)

      // Create full file path
      const filePath = path.join(targetDirectory, filename)
      
      // Check if file already exists
      if (await this.fileExists(urlPath)) {
        const timestamp = Date.now()
        const nameWithoutExt = path.parse(filename).name
        const ext = path.parse(filename).ext
        const newFilename = `${nameWithoutExt}-${timestamp}${ext}`
        filename = newFilename
        urlPath = folderPath ? `${folderPath}/${newFilename}` : newFilename
      }

      // Write file to target directory
      await fs.writeFile(path.join(targetDirectory, filename), file)

      // Generate file ID (use relative path as ID for local storage)
      const fileId = urlPath

      // Generate URL - encode each path segment separately to preserve folder structure
      const url = this.config.baseUrl 
        ? `${this.config.baseUrl}/${urlPath}`
        : `/api/storage/local/${urlPath.split('/').map(segment => encodeURIComponent(segment)).join('/')}`

      return {
        provider: this.providerId,
        fileId,
        url,
        folderId: targetDirectory,
        path: urlPath,
        size: file.length,
        mimeType,
        metadata: metadata || {}
      }
    } catch (error) {
      console.error('Local storage upload failed:', error)
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      if (await this.fileExists(filePath)) {
        const fullPath = path.join(this.basePath, filePath)
        await fs.unlink(fullPath)
      }
    } catch (error) {
      console.error('Local storage delete failed:', error)
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getFileInfo(filePath: string): Promise<StorageFileInfo> {
    try {
      if (!(await this.fileExists(filePath))) {
        throw new Error('File not found')
      }
      const fullPath = path.join(this.basePath, filePath)

      const stats = await fs.stat(fullPath)
      return {
        provider: this.providerId,
        fileId: filePath,
        name: path.basename(filePath),
        path: filePath,
        size: stats.size,
        mimeType: 'application/octet-stream', // Default MIME type
        url: this.getFileUrl(filePath),
        folderId: path.dirname(filePath),
        metadata: {},
        createdAt: stats.birthtime,
        updatedAt: stats.mtime
      }
    } catch (error) {
      console.error('Local storage get file info failed:', error)
      throw new Error(`Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async listFiles(folderPath?: string, pageSize?: number): Promise<StorageFileInfo[]> {
    try {
      const targetPath = folderPath ? path.join(this.basePath, folderPath) : this.basePath
      const files = await fs.readdir(targetPath)
      
      const fileList = await Promise.all(
        files.map(async (filename) => {
          const filePath = path.join(targetPath, filename)
          const stats = await fs.stat(filePath)
          
          // Skip directories
          if (stats.isDirectory()) {
            return null
          }
          
          const relativePath = folderPath ? `${folderPath}/${filename}` : filename
          return {
            provider: this.providerId,
            fileId: relativePath,
            name: filename,
            path: relativePath,
            size: stats.size,
            mimeType: 'application/octet-stream', // Default MIME type
            url: this.getFileUrl(relativePath),
            folderId: folderPath || '',
            metadata: {},
            createdAt: stats.birthtime,
            updatedAt: stats.mtime
          }
        })
      )

      return fileList.filter(file => file !== null) as StorageFileInfo[]
    } catch (error) {
      console.error('Local storage list files failed:', error)
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async createFolder(name: string, parentPath?: string): Promise<StorageFolderResult> {
    try {
      const fullParentPath = parentPath ? path.join(this.basePath, parentPath) : this.basePath
      const folderPath = path.join(fullParentPath, name)
      
      if (!(await this.directoryExists(folderPath))) {
        await fs.mkdir(folderPath, { recursive: true })
      }

      const relativePath = parentPath ? `${parentPath}/${name}` : name
      return {
        provider: this.providerId,
        folderId: relativePath,
        name,
        path: relativePath,
        parentId: parentPath,
        metadata: {}
      }
    } catch (error) {
      console.error('Local storage create folder failed:', error)
      throw new Error(`Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async updateFileMetadata(filePath: string, metadata: Record<string, any>): Promise<void> {
    // Local storage doesn't support metadata updates
    // This is a no-op for local storage
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.ensureDirectoryExists(this.basePath)
      return true
    } catch (error) {
      console.error('Local storage validation failed:', error)
      return false
    }
  }

  // Additional required methods
  async deleteFolder(folderPath: string): Promise<void> {
    try {
      const fullPath = path.join(this.basePath, folderPath)
      if (await this.directoryExists(fullPath)) {
        await fs.rmdir(fullPath, { recursive: true })
      }
    } catch (error) {
      console.error('Local storage delete folder failed:', error)
      throw new Error(`Failed to delete folder: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getFolderInfo(folderPath: string): Promise<StorageFolderInfo> {
    try {
      const fullPath = path.join(this.basePath, folderPath)
      if (!(await this.directoryExists(fullPath))) {
        throw new Error('Folder not found')
      }

      const stats = await fs.stat(fullPath)
      const files = await fs.readdir(fullPath)
      
      return {
        provider: this.providerId,
        folderId: folderPath,
        name: path.basename(folderPath),
        path: folderPath,
        parentId: path.dirname(folderPath) !== '.' ? path.dirname(folderPath) : undefined,
        fileCount: files.length,
        metadata: {},
        createdAt: stats.birthtime,
        updatedAt: stats.mtime
      }
    } catch (error) {
      console.error('Local storage get folder info failed:', error)
      throw new Error(`Failed to get folder info: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async listFolders(parentPath?: string): Promise<StorageFolderInfo[]> {
    try {
      const targetPath = parentPath ? path.join(this.basePath, parentPath) : this.basePath
      const items = await fs.readdir(targetPath)
      
      const folders = await Promise.all(
        items.map(async (item) => {
          const itemPath = path.join(targetPath, item)
          const stats = await fs.stat(itemPath)
          
          // Only return directories
          if (!stats.isDirectory()) {
            return null
          }
          
          const relativePath = parentPath ? `${parentPath}/${item}` : item
          const subFiles = await fs.readdir(itemPath)
          
          return {
            provider: this.providerId,
            folderId: relativePath,
            name: item,
            path: relativePath,
            parentId: parentPath,
            fileCount: subFiles.length,
            metadata: {},
            createdAt: stats.birthtime,
            updatedAt: stats.mtime
          }
        })
      )

      return folders.filter(folder => folder !== null) as StorageFolderInfo[]
    } catch (error) {
      console.error('Local storage list folders failed:', error)
      throw new Error(`Failed to list folders: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }


  async folderExists(folderPath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.basePath, folderPath)
      const stats = await fs.stat(fullPath)
      return stats.isDirectory()
    } catch {
      return false
    }
  }

  getFileUrl(filePath: string): string {
    const encodedPath = filePath.split('/').map(segment => encodeURIComponent(segment)).join('/')
    return this.config.baseUrl 
      ? `${this.config.baseUrl}/${encodedPath}`
      : `/api/storage/local/${encodedPath}`
  }

  getFolderUrl(folderPath: string): string {
    const encodedPath = folderPath.split('/').map(segment => encodeURIComponent(segment)).join('/')
    return this.config.baseUrl 
      ? `${this.config.baseUrl}/${encodedPath}`
      : `/api/storage/local/${encodedPath}`
  }

  async getFileBuffer(filePath: string): Promise<Buffer | null> {
    try {
      const fullPath = path.join(this.basePath, filePath)
      return await fs.readFile(fullPath)
    } catch (error) {
      console.error('Local storage get file buffer failed:', error)
      return null
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath)
    } catch {
      await fs.mkdir(dirPath, { recursive: true })
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.basePath, filePath)
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }

  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath)
      return stats.isDirectory()
    } catch {
      return false
    }
  }
}
