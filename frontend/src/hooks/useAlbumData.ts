import { useState, useEffect } from 'react'
import { TemplateAlbum, TemplatePhoto } from '@/types'

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
        const result = await response.json()
        if (result.success) {
          setSubAlbumCoverPhotos(prev => ({
            ...prev,
            [albumId]: result.data
          }))
        }
      }
    } catch (error) {
      console.error(`Failed to fetch cover photo for sub-album ${albumId}:`, error)
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
        
        const albumResult = await albumResponse.json()
        if (!albumResult.success) {
          throw new Error(albumResult.error || 'Failed to fetch album')
        }
        
        setAlbum(albumResult.data)

        // Fetch photos for this album
        const photosResponse = await fetch(`/api/albums/${albumResult.data._id}/photos?t=${Date.now()}`, { cache: 'no-store' })
        if (photosResponse.ok) {
          const photosResult = await photosResponse.json()
          if (photosResult.success) {
            const photosData = photosResult.data.photos || photosResult.data
            setPhotos(Array.isArray(photosData) ? photosData : [])
          }
        }

        // Fetch sub-albums
        const subAlbumsResponse = await fetch(`/api/albums?parentId=${albumResult.data._id}&t=${Date.now()}`, { cache: 'no-store' })
        if (subAlbumsResponse.ok) {
          const subAlbumsResult = await subAlbumsResponse.json()
          if (subAlbumsResult.success) {
            setSubAlbums(subAlbumsResult.data)
            
            // Fetch cover photos for sub-albums that have them
            subAlbumsResult.data.forEach((subAlbum: TemplateAlbum) => {
              if (subAlbum.coverPhotoId) {
                fetchSubAlbumCoverPhoto(subAlbum._id, subAlbum.coverPhotoId)
              }
            })
          }
        }
      } catch (err) {
        console.error('Failed to fetch album data:', err)
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
