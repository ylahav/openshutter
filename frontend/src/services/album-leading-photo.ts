import { connectToDatabase } from '@/lib/mongodb'
import { Album, Photo } from '@/types'
import { ObjectId } from 'mongodb'

export interface AlbumLeadingPhotoResult {
  photo: Photo | null
  source: 'album-leading' | 'random' | 'child-leading' | 'none'
  albumId: string
}

export class AlbumLeadingPhotoService {
  /**
   * Get the leading photo for an album using hierarchical selection:
   * 1. If album has a 'album leading photo' set, use it
   * 2. If not - use a random one from the album
   * 3. If album has no photos (only child albums) - choose the first found leading photo from child albums
   */
  static async getAlbumLeadingPhoto(albumId: string): Promise<AlbumLeadingPhotoResult> {
    try {
      const { db } = await connectToDatabase()
      
      // Get the album
      const album = await db.collection('albums').findOne({ _id: new ObjectId(albumId) })
      if (!album) {
        return { photo: null, source: 'none', albumId }
      }

      // Step 1: Check if album has a specific leading photo set
      if (album.coverPhotoId) {
        const leadingPhoto = await db.collection('photos').findOne({
          _id: new ObjectId(album.coverPhotoId),
          isPublished: true
        })
        
        if (leadingPhoto) {
          return { 
            photo: leadingPhoto as unknown as Photo, 
            source: 'album-leading', 
            albumId 
          }
        }
      }

      // Step 2: Get a random photo from the album (handle both string and ObjectId albumId formats)
      const albumPhotos = await db.collection('photos')
        .find({
          $or: [
            { albumId: new ObjectId(albumId) },
            { albumId: albumId }
          ],
          isPublished: true
        })
        .toArray()

      if (albumPhotos.length > 0) {
        // Get a random photo from the album
        const randomIndex = Math.floor(Math.random() * albumPhotos.length)
        const randomPhoto = albumPhotos[randomIndex]
        
        return { 
          photo: randomPhoto as unknown as Photo, 
          source: 'random', 
          albumId 
        }
      }

      // Step 3: Album has no photos, look for leading photos in child albums
      const childAlbums = await db.collection('albums')
        .find({
          parentAlbumId: new ObjectId(albumId),
          isPublic: true
        })
        .toArray()

      if (childAlbums.length > 0) {
        // Look for leading photos in child albums
        for (const childAlbum of childAlbums) {
          // First check if child album has a specific leading photo
          if (childAlbum.coverPhotoId) {
            const childLeadingPhoto = await db.collection('photos').findOne({
              _id: new ObjectId(childAlbum.coverPhotoId),
              isPublished: true
            })
            
            if (childLeadingPhoto) {
              return { 
                photo: childLeadingPhoto as unknown as Photo, 
                source: 'child-leading', 
                albumId: childAlbum._id.toString() 
              }
            }
          }

          // If no specific leading photo, get any photo from child album (handle both string and ObjectId albumId formats)
          const childPhotos = await db.collection('photos')
            .find({
              $or: [
                { albumId: new ObjectId(childAlbum._id) },
                { albumId: childAlbum._id.toString() }
              ],
              isPublished: true
            })
            .limit(1)
            .toArray()

          if (childPhotos.length > 0) {
            return { 
              photo: childPhotos[0] as unknown as Photo, 
              source: 'child-leading', 
              albumId: childAlbum._id.toString() 
            }
          }
        }
      }

      // No photos found anywhere
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
   */
  static async getAlbumCoverImageUrl(albumId: string): Promise<string> {
    const result = await this.getAlbumLeadingPhoto(albumId)
    
    if (result.photo && result.photo.storage?.url) {
      return result.photo.storage.url
    }
    
    // Fallback to site logo
    try {
      const { db } = await connectToDatabase()
      const siteConfig = await db.collection('site-configs').findOne({})
      
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
            const { db } = await connectToDatabase()
            const siteConfig = await db.collection('site-configs').findOne({})
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
