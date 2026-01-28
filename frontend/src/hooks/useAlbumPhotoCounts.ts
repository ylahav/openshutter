import { useState, useEffect } from 'react'
import { Album } from '@/types'
import { logger } from '$lib/utils/logger'

interface AlbumPhotoCounts {
  [albumId: string]: number
}

export function useAlbumPhotoCounts(albums: Album[]) {
  const [photoCounts, setPhotoCounts] = useState<AlbumPhotoCounts>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (albums.length === 0) {
      setLoading(false)
      return
    }

    const fetchPhotoCounts = async () => {
      setLoading(true)
      try {
        const counts: AlbumPhotoCounts = {}
        
        // Fetch photo counts for all albums in parallel
        await Promise.all(
          albums.map(async (album) => {
            try {
              const response = await fetch(`/api/albums/${album._id}/photo-count`)
              if (response.ok) {
                const result = await response.json()
                if (result.success) {
                  counts[album._id!] = result.data.totalPhotoCount
                }
              }
            } catch (error) {
              logger.error(`Failed to fetch photo count for album ${album._id}:`, error)
              // Fallback to stored photoCount
              counts[album._id!] = album.photoCount || 0
            }
          })
        )
        
        setPhotoCounts(counts)
      } catch (error) {
        logger.error('Failed to fetch photo counts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPhotoCounts()
  }, [albums])

  const getTotalPhotoCount = (albumId: string): number => {
    return photoCounts[albumId] || 0
  }

  const getTotalPhotosCount = (): number => {
    return Object.values(photoCounts).reduce((total, count) => total + count, 0)
  }

  return {
    photoCounts,
    loading,
    getTotalPhotoCount,
    getTotalPhotosCount
  }
}
