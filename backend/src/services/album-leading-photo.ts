import { Logger } from '@nestjs/common'
import { AlbumModel } from '../models/Album'
import { PhotoModel, IPhoto } from '../models/Photo'
import { siteConfigService } from './site-config'
import { connectDB } from '../config/db'

export interface AlbumLeadingPhotoResult {
  photo: IPhoto | null
  source: 'album-leading' | 'is-leading' | 'child-leading' | 'none'
  albumId: string
}

export class AlbumLeadingPhotoService {
  private static readonly logger = new Logger(AlbumLeadingPhotoService.name)
  /**
   * Depth cap for descendant recursion in step 4. Album trees are typically shallow;
   * this guards against pathological data (or cycles) rather than being a real limit.
   */
  private static readonly MAX_DESCENDANT_DEPTH = 10

  /**
   * Get the leading photo for an album using hierarchical selection:
   * 1. If album has coverPhotoId set, use that photo
   * 2. Find album's photo with isLeading === true
   * 3. If not found - pick a random photo from the album
   * 4. If album has no photos - recurse into direct children; each child resolves its own
   *    leading photo via the same rules (including further descent). Pick one at random
   *    from the children that produced a photo.
   * 5. If not found - show site logo (handled by getAlbumCoverImageUrl)
   */
  static async getAlbumLeadingPhoto(albumId: string, depth = 0): Promise<AlbumLeadingPhotoResult> {
    try {
      await connectDB()
      const album = await AlbumModel.findById(albumId)
      if (!album) {
        return { photo: null, source: 'none', albumId }
      }

      // Step 1: Album has explicit cover/leading photo set
      if (album.coverPhotoId) {
        const coverPhoto = await PhotoModel.findOne({
          _id: album.coverPhotoId,
          isPublished: true,
          processingStatus: { $nin: ['pending', 'processing', 'failed'] },
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
        processingStatus: { $nin: ['pending', 'processing', 'failed'] },
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
        processingStatus: { $nin: ['pending', 'processing', 'failed'] },
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

      // Step 4: Album has no photos - recurse into children until a descendant yields a photo.
      if (depth < AlbumLeadingPhotoService.MAX_DESCENDANT_DEPTH) {
        const childAlbums = await AlbumModel.find({
          parentAlbumId: albumId,
          isPublic: true,
        })
          .select({ _id: 1 })
          .lean()
          .exec()

        if (childAlbums.length > 0) {
          const childResults = await Promise.all(
            childAlbums.map((child) =>
              AlbumLeadingPhotoService.getAlbumLeadingPhoto(String(child._id), depth + 1),
            ),
          )
          const withPhotos = childResults.filter((r) => r.photo != null)
          if (withPhotos.length > 0) {
            const chosen = withPhotos[Math.floor(Math.random() * withPhotos.length)]
            return {
              photo: chosen.photo,
              source: 'child-leading',
              albumId: chosen.albumId,
            }
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
    await connectDB()
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
    
    // No leading photo and no site logo — frontend AlbumCard renders its "No cover" fallback on empty URL.
    return ''
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
        
        results.set(albumId, siteLogo || '')
      }
    }
    
    return results
  }
}
