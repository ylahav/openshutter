import { Logger } from '@nestjs/common'
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
  private static readonly logger = new Logger(AlbumLeadingPhotoService.name)
  /**
   * Get the leading photo for an album using hierarchical selection:
   * 1. If album has coverPhotoId set, use that photo
   * 2. Find album's photo with isLeading === true
   * 3. If not found - pick a random photo from the album
   * 4. If album has no photos - pick randomly one of sub-albums' leading photos
   * 5. If not found - show site logo (handled by getAlbumCoverImageUrl)
   */
  static async getAlbumLeadingPhoto(albumId: string): Promise<AlbumLeadingPhotoResult> {
    try {
      const album = await AlbumModel.findById(albumId)
      if (!album) {
        return { photo: null, source: 'none', albumId }
      }

      // Step 1: Album has explicit cover/leading photo set
      if (album.coverPhotoId) {
        const coverPhoto = await PhotoModel.findOne({
          _id: album.coverPhotoId,
          isPublished: true,
        })
        if (coverPhoto) {
          return {
            photo: coverPhoto,
            source: 'album-leading',
            albumId,
          }
        }
      }

      // Step 2: Album's photo with isLeading === true
      const leadingPhoto = await PhotoModel.findOne({
        albumId: albumId,
        isLeading: true,
        isPublished: true,
      })
      if (leadingPhoto) {
        return {
          photo: leadingPhoto,
          source: 'is-leading',
          albumId,
        }
      }

      // Step 3: Random photo from this album
      const albumPhotos = await PhotoModel.find({
        $or: [{ albumId: album._id }, { albumId: albumId }],
        isPublished: true,
      })
        .limit(100)
        .lean()
        .exec()
      if (albumPhotos.length > 0) {
        const randomPhoto = albumPhotos[Math.floor(Math.random() * albumPhotos.length)]
        return {
          photo: randomPhoto as IPhoto,
          source: 'album-leading',
          albumId,
        }
      }

      // Step 4: Album has no photos - collect sub-albums' leading photos and pick one randomly
      const childAlbums = await AlbumModel.find({
        parentAlbumId: albumId,
        isPublic: true,
      })
        .lean()
        .exec()

      if (childAlbums.length > 0) {
        const childLeadingPhotos: { photo: IPhoto; childAlbumId: string }[] = []
        for (const childAlbum of childAlbums) {
          let childPhoto: IPhoto | null = null
          if (childAlbum.coverPhotoId) {
            childPhoto = await PhotoModel.findOne({
              _id: childAlbum.coverPhotoId,
              isPublished: true,
            })
              .lean()
              .exec() as IPhoto | null
          }
          if (!childPhoto) {
            childPhoto = await PhotoModel.findOne({
              albumId: childAlbum._id,
              isLeading: true,
              isPublished: true,
            })
              .lean()
              .exec() as IPhoto | null
          }
          if (!childPhoto) {
            const first = await PhotoModel.findOne({
              $or: [{ albumId: childAlbum._id }, { albumId: childAlbum._id.toString() }],
              isPublished: true,
            })
              .lean()
              .exec()
            if (first) childPhoto = first as IPhoto
          }
          if (childPhoto) {
            childLeadingPhotos.push({
              photo: childPhoto,
              childAlbumId: childAlbum._id.toString(),
            })
          }
        }
        if (childLeadingPhotos.length > 0) {
          const chosen = childLeadingPhotos[Math.floor(Math.random() * childLeadingPhotos.length)]
          return {
            photo: chosen.photo,
            source: 'child-leading',
            albumId: chosen.childAlbumId,
          }
        }
      }

      return { photo: null, source: 'none', albumId }
    } catch (error) {
      AlbumLeadingPhotoService.logger.error(`Error getting album leading photo: ${error instanceof Error ? error.message : String(error)}`)
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
      AlbumLeadingPhotoService.logger.error(`Error fetching site logo: ${error instanceof Error ? error.message : String(error)}`)
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
            AlbumLeadingPhotoService.logger.error(`Error fetching site logo: ${error instanceof Error ? error.message : String(error)}`)
            hasFetchedLogo = true
          }
        }
        
        results.set(albumId, siteLogo || '/api/placeholder/400/300')
      }
    }
    
    return results
  }
}
