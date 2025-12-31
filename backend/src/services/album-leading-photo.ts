import { AlbumModel } from '../models/Album'
import { PhotoModel, IPhoto } from '../models/Photo'
import mongoose from 'mongoose'
import { siteConfigService } from './site-config'

export interface AlbumLeadingPhotoResult {
  photo: IPhoto | null
  source: 'album-leading' | 'is-leading' | 'child-leading' | 'none'
  albumId: string
}

export class AlbumLeadingPhotoService {
  /**
   * Get the leading photo for an album using hierarchical selection:
   * 1. Find album's photo with isLeading === true and show it
   * 2. If not found - go to all sub-albums (if exist) and try for each of them to find a leading photo... the first who found - show it
   * 3. If not found - show site logo (handled by getAlbumCoverImageUrl)
   */
  static async getAlbumLeadingPhoto(albumId: string): Promise<AlbumLeadingPhotoResult> {
    try {
      
      // Get the album
      const album = await AlbumModel.findById(albumId)
      if (!album) {
        return { photo: null, source: 'none', albumId }
      }

      // Step 1: Find album's photo with isLeading === true
      const leadingPhoto = await PhotoModel.findOne({
        albumId: albumId,
        isLeading: true,
        isPublished: true
      })
      
      if (leadingPhoto) {
        return { 
          photo: leadingPhoto, 
          source: 'is-leading', 
          albumId 
        }
      }

      // Step 2: If not found, go to all sub-albums and try to find a leading photo
      const childAlbums = await AlbumModel.find({
          parentAlbumId: albumId,
          isPublic: true
        })

      if (childAlbums.length > 0) {
        // Look for leading photos in child albums
        for (const childAlbum of childAlbums) {
          // Find photos with isLeading === true in child album
          const childLeadingPhoto = await PhotoModel.findOne({
            albumId: childAlbum._id,
            isLeading: true,
            isPublished: true
          })
          
          if (childLeadingPhoto) {
            return { 
              photo: childLeadingPhoto, 
              source: 'child-leading', 
              albumId: childAlbum._id.toString() 
            }
          }
        }
      }

      // No leading photos found anywhere
      return { photo: null, source: 'none', albumId }
    } catch (error) {
      console.error('Error getting album leading photo:', error)
      return { photo: null, source: 'none', albumId }
    }
  }

  /**
   * Get leading photos for multiple albums efficiently
   */
  static async getMultipleAlbumLeadingPhotos(albumIds: string[]): Promise<Map<string, AlbumLeadingPhotoResult>> {
    const results = new Map<string, AlbumLeadingPhotoResult>()
    
    // Process albums in parallel
    const promises = albumIds.map(async (albumId) => {
      const result = await this.getAlbumLeadingPhoto(albumId)
      results.set(albumId, result)
    })

    await Promise.all(promises)
    return results
  }

  /**
   * Get the cover image URL for an album (for use in templates)
   * Returns the leading photo URL, or site logo if no leading photo found
   */
  static async getAlbumCoverImageUrl(albumId: string): Promise<string> {
    const result = await this.getAlbumLeadingPhoto(albumId)
    
    if (result.photo && result.photo.storage?.url) {
      return result.photo.storage.url
    }
    
    // Step 3: Fallback to site logo
    try {
      const siteConfig = await siteConfigService.getConfig()
      
      if (siteConfig && siteConfig.logo) {
        return siteConfig.logo
      }
    } catch (error) {
      console.error('Error fetching site logo:', error)
    }
    
    // Final fallback to placeholder
    return '/api/placeholder/400/300'
  }

  /**
   * Get cover image URLs for multiple albums efficiently
   */
  static async getMultipleAlbumCoverImageUrls(albumIds: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>()
    const leadingPhotos = await this.getMultipleAlbumLeadingPhotos(albumIds)
    
    // Get site logo once for all albums that need it
    let siteLogo: string | null = null
    let hasFetchedLogo = false
    
    for (const [albumId, result] of leadingPhotos) {
      if (result.photo && result.photo.storage?.url) {
        results.set(albumId, result.photo.storage.url)
      } else {
        // Fetch site logo only once
        if (!hasFetchedLogo) {
          try {
            const siteConfig = await siteConfigService.getConfig()
            siteLogo = siteConfig?.logo || null
            hasFetchedLogo = true
          } catch (error) {
            console.error('Error fetching site logo:', error)
            hasFetchedLogo = true
          }
        }
        
        results.set(albumId, siteLogo || '/api/placeholder/400/300')
      }
    }
    
    return results
  }
}
