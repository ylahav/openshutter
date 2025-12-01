import mongoose, { Types } from 'mongoose'
import { AlbumModel } from '../models/Album'
import { PhotoModel } from '../models/Photo'

export interface AlbumPhotoCountResult {
  directPhotoCount: number
  childAlbumCount: number
  totalPhotoCount: number
  childAlbums: Array<{
    _id: string
    name: any
    alias: string
    photoCount: number
  }>
}

export class AlbumPhotoCountService {
  /**
   * Calculate total photo count for an album including all child albums recursively
   */
  static async getTotalPhotoCount(albumId: string | Types.ObjectId): Promise<AlbumPhotoCountResult> {
    
    // Get direct photos count
    const directPhotoCount = await PhotoModel.countDocuments({
      albumId: albumId,
      isPublished: true
    })
    
    // Get child albums
    const childAlbums = await AlbumModel.find({
      parentAlbumId: albumId,
      isPublic: true
    }).select({
      _id: 1,
      name: 1,
      alias: 1,
      photoCount: 1
    })
    
    // Calculate total photo count from child albums recursively
    let totalChildPhotoCount = 0
    const childAlbumsWithCounts = []
    
    for (const childAlbum of childAlbums) {
      const childResult = await this.getTotalPhotoCount(childAlbum._id)
      totalChildPhotoCount += childResult.totalPhotoCount
      
      childAlbumsWithCounts.push({
        _id: childAlbum._id.toString(),
        name: childAlbum.name,
        alias: childAlbum.alias,
        photoCount: childResult.totalPhotoCount
      })
    }
    
    const totalPhotoCount = directPhotoCount + totalChildPhotoCount
    
    return {
      directPhotoCount,
      childAlbumCount: childAlbums.length,
      totalPhotoCount,
      childAlbums: childAlbumsWithCounts
    }
  }
  
  /**
   * Get photo count for multiple albums (useful for homepage statistics)
   */
  static async getAlbumsPhotoCounts(albumIds: (string | Types.ObjectId)[]): Promise<Map<string, number>> {
    const results = new Map<string, number>()
    
    await Promise.all(
      albumIds.map(async (albumId) => {
        const result = await this.getTotalPhotoCount(albumId)
        const id = typeof albumId === 'string' ? albumId : albumId.toString()
        results.set(id, result.totalPhotoCount)
      })
    )
    
    return results
  }
}
