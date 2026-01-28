import { useState, useEffect } from 'react'
import { TemplateAlbum, TemplatePhoto } from '@/types'
import { logger } from '$lib/utils/logger'

export interface UseAlbumDataResult {
  album: TemplateAlbum | null
  photos: TemplatePhoto[]
  subAlbums: TemplateAlbum[]
  loading: boolean
  error: string | null
  subAlbumCoverPhotos: Record<string, TemplatePhoto>
}

/**
 * Shared hook for fetching album data (album, photos, sub-albums, cover photos)
 * Used across all template album pages to reduce code duplication
 */
export function useAlbumData(alias: string | undefined): UseAlbumDataResult {
  const [album, setAlbum] = useState<TemplateAlbum | null>(null)
  const [photos, setPhotos] = useState<TemplatePhoto[]>([])
  const [subAlbums, setSubAlbums] = useState<TemplateAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subAlbumCoverPhotos, setSubAlbumCoverPhotos] = useState<Record<string, TemplatePhoto>>({})

  // Fetch cover photo for a sub-album
  const fetchSubAlbumCoverPhoto = async (albumId: string, coverPhotoId: string) => {
    try {
      const response = await fetch(`/api/photos/${coverPhotoId}?t=${Date.now()}`, { cache: 'no-store' })
      if (response.ok) {
        const photo = await response.json()
        setSubAlbumCoverPhotos(prev => ({
          ...prev,
          [albumId]: photo
        }))
      }
    } catch (error) {
      logger.error(`Failed to fetch cover photo for sub-album ${albumId}:`, error)
    }
  }

  useEffect(() => {
    const fetchAlbumData = async () => {
      if (!alias) return
      
      try {
        setLoading(true)
        setError(null)

        // Fetch album by alias
        const albumResponse = await fetch(`/api/albums/by-alias/${alias}?t=${Date.now()}`, { cache: 'no-store' })
        if (!albumResponse.ok) {
          throw new Error('Album not found')
        }
        
        const album = await albumResponse.json()
        setAlbum(album)

        // Fetch photos for this album
        const photosResponse = await fetch(`/api/albums/${album._id}/photos?t=${Date.now()}`, { cache: 'no-store' })
        if (photosResponse.ok) {
          const photosResult = await photosResponse.json()
          // Backend returns { photos: [...], pagination: {...} }
          const photosData = photosResult.photos || []
          setPhotos(Array.isArray(photosData) ? photosData : [])
        }

        // Fetch sub-albums
        const subAlbumsResponse = await fetch(`/api/albums?parentId=${album._id}&t=${Date.now()}`, { cache: 'no-store' })
        if (subAlbumsResponse.ok) {
          const subAlbums = await subAlbumsResponse.json()
          // Backend returns array directly
          setSubAlbums(Array.isArray(subAlbums) ? subAlbums : [])
          
          // Fetch cover photos for sub-albums that have them
          subAlbums.forEach((subAlbum: TemplateAlbum) => {
            if (subAlbum.coverPhotoId) {
              fetchSubAlbumCoverPhoto(subAlbum._id, subAlbum.coverPhotoId)
            }
          })
        }
      } catch (err) {
        logger.error('Failed to fetch album data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch album')
      } finally {
        setLoading(false)
      }
    }

    fetchAlbumData()
  }, [alias])

  return {
    album,
    photos,
    subAlbums,
    loading,
    error,
    subAlbumCoverPhotos
  }
}
