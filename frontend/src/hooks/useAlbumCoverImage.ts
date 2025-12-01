import { useState, useEffect } from 'react'

interface AlbumCoverImageResult {
  url: string
  source: 'album-leading' | 'random' | 'child-leading' | 'site-logo' | 'placeholder' | 'none'
  albumId: string
  photoId: string | null
  loading: boolean
  error: string | null
}

export function useAlbumCoverImage(albumId: string): AlbumCoverImageResult {
  const [result, setResult] = useState<AlbumCoverImageResult>({
    url: '/api/placeholder/400/300',
    source: 'none',
    albumId,
    photoId: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    const fetchCoverImage = async () => {
      if (!albumId) {
        setResult(prev => ({ ...prev, loading: false }))
        return
      }

      try {
        setResult(prev => ({ ...prev, loading: true, error: null }))
        
        const response = await fetch(`/api/albums/${albumId}/cover-image`)
        const data = await response.json()
        
        if (data.success) {
          setResult({
            url: data.data.url,
            source: data.data.source,
            albumId: data.data.albumId,
            photoId: data.data.photoId,
            loading: false,
            error: null
          })
        } else {
          setResult(prev => ({
            ...prev,
            loading: false,
            error: data.error || 'Failed to load cover image'
          }))
        }
      } catch (error) {
        setResult(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load cover image'
        }))
      }
    }

    fetchCoverImage()
  }, [albumId])

  return result
}

export function useMultipleAlbumCoverImages(albumIds: string[]): {
  coverImages: Record<string, string>
  loading: boolean
  error: string | null
} {
  const [result, setResult] = useState<{
    coverImages: Record<string, string>
    loading: boolean
    error: string | null
  }>({
    coverImages: {},
    loading: true,
    error: null
  })

  useEffect(() => {
    const fetchCoverImages = async () => {
      if (!albumIds || albumIds.length === 0) {
        setResult({ coverImages: {}, loading: false, error: null })
        return
      }

      try {
        setResult(prev => ({ ...prev, loading: true, error: null }))
        
        const response = await fetch('/api/albums/cover-images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ albumIds })
        })
        
        const data = await response.json()
        
        if (data.success) {
          setResult({
            coverImages: data.data,
            loading: false,
            error: null
          })
        } else {
          setResult(prev => ({
            ...prev,
            loading: false,
            error: data.error || 'Failed to load cover images'
          }))
        }
      } catch (error) {
        setResult(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load cover images'
        }))
      }
    }

    fetchCoverImages()
  }, [albumIds.join(',')]) // Re-run when albumIds change

  return result
}
