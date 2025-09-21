'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import DynamicTemplateLoader from '@/components/DynamicTemplateLoader'
import PhotoViewer from '@/components/PhotoViewer'

interface Photo {
  _id: string
  title: string | { en: string }
  description?: string | { en: string }
  filename: string
  storage: {
    url: string
    thumbnailPath: string
    path: string
    provider: string
  }
  tags?: string[]
  people?: string[]
  location?: {
    name: string
    coordinates?: { latitude: number; longitude: number }
    address?: string
  }
  metadata?: {
    width: number
    height: number
    size: number
    mimeType: string
  }
  dimensions?: {
    width: number
    height: number
  }
  size?: number
  mimeType?: string
  isLeading: boolean
  isPublished: boolean
  createdAt: string
  uploadedAt?: string
  exif?: {
    dateTimeOriginal?: string
    make?: string
    model?: string
    exposureTime?: string
    fNumber?: string
    iso?: number
    focalLength?: string
    flash?: string
    whiteBalance?: string
    meteringMode?: string
    exposureProgram?: string
    exposureMode?: string
    sceneCaptureType?: string
    colorSpace?: string
    lensModel?: string
    lensInfo?: string
    serialNumber?: string
    software?: string
    xResolution?: number
    yResolution?: number
    resolutionUnit?: string
    subsecTimeOriginal?: string
    subsecTimeDigitized?: string
  }
}

interface Album {
  _id: string
  name: string
  alias: string
  description: string
  coverImage?: string
  isPublic: boolean
  isFeatured: boolean
  showExifData: boolean
  photoCount: number
  parentPath?: string
  firstPhotoDate?: string
  lastPhotoDate?: string
  createdAt: string
  updatedAt: string
  level: number
  parentAlbumId?: string
}

export default function AlbumPage({ params }: { params: Promise<{ alias: string }> }) {
  const resolvedParams = use(params)
  const [album, setAlbum] = useState<Album | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [childAlbums, setChildAlbums] = useState<Album[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{name: string, alias: string}>>([])
  const [loading, setLoading] = useState(true)
  const [photosLoading, setPhotosLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [totalPhotoCount, setTotalPhotoCount] = useState(0)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 16,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  })
  const { currentLanguage } = useLanguage()

  const buildBreadcrumbs = async (album: Album) => {
    if (!album.parentPath) {
      setBreadcrumbs([])
      return
    }

    try {
      // Split the parent path and get each album
      const pathSegments = album.parentPath.split('/').filter(Boolean)
      const breadcrumbPromises = pathSegments.map(async (alias: string) => {
        const response = await fetch(`/api/albums/by-alias/${alias}`)
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            return {
              name: MultiLangUtils.getTextValue(result.data.name as any, currentLanguage),
              alias: result.data.alias
            }
          }
        }
        return { name: alias, alias }
      })

      const breadcrumbData = await Promise.all(breadcrumbPromises)
      setBreadcrumbs(breadcrumbData)
    } catch (error) {
      console.error('Failed to build breadcrumbs:', error)
      setBreadcrumbs([])
    }
  }

  const fetchPhotos = async (page: number = 1, append: boolean = false) => {
    try {
      setPhotosLoading(true)
      const response = await fetch(`/api/albums/by-alias/${resolvedParams.alias}/photos?page=${page}&limit=16`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          if (append) {
            setPhotos(prev => [...prev, ...result.data])
          } else {
            setPhotos(result.data)
          }
          setPagination(result.pagination)
        }
      }
    } catch (error) {
      console.error('Failed to fetch photos:', error)
    } finally {
      setPhotosLoading(false)
    }
  }

  const loadMorePhotos = () => {
    if (pagination.hasNextPage && !photosLoading) {
      fetchPhotos(pagination.page + 1, true)
    }
  }

  const loadPage = (page: number) => {
    if (page !== pagination.page && !photosLoading) {
      fetchPhotos(page, false)
      // Scroll to top of photos section
      const photosSection = document.getElementById('photos-section')
      if (photosSection) {
        photosSection.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/albums/by-alias/${resolvedParams.alias}`)
        if (!response.ok) {
          throw new Error('Failed to fetch album')
        }
        
        const result = await response.json()
        if (result.success) {
          setAlbum(result.data)
          await buildBreadcrumbs(result.data)
        } else {
          if (response.status === 403) {
            setError('Access denied - You do not have permission to view this album')
          } else {
            setError(result.error || 'Failed to fetch album')
          }
        }
      } catch (error) {
        console.error('Failed to fetch album:', error)
        setError('Failed to fetch album')
      } finally {
        setLoading(false)
      }
    }


    const fetchChildAlbums = async () => {
      try {
        // First get the album to get its ID, then fetch child albums
        const albumResponse = await fetch(`/api/albums/by-alias/${resolvedParams.alias}`)
        if (albumResponse.ok) {
          const albumResult = await albumResponse.json()
          if (albumResult.success) {
            const albumId = albumResult.data._id
            console.log('Fetching child albums for album ID:', albumId)
            const response = await fetch(`/api/albums?parentId=${albumId}`)
            if (response.ok) {
              const result = await response.json()
              console.log('Child albums API response:', result)
              if (result.success) {
                // API already handles access control, so we can use all returned albums
                console.log('Child albums:', result.data)
                setChildAlbums(result.data)
              }
            } else {
              console.error('Failed to fetch child albums, response not ok:', response.status)
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch child albums:', error)
      }
    }

    const fetchTotalPhotoCount = async () => {
      try {
        const response = await fetch(`/api/albums/by-alias/${resolvedParams.alias}/photo-count`)
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setTotalPhotoCount(result.data.totalPhotoCount)
          }
        }
      } catch (error) {
        console.error('Failed to fetch total photo count:', error)
      }
    }

    fetchAlbum()
    fetchPhotos(1, false)
    fetchChildAlbums()
    fetchTotalPhotoCount()
  }, [resolvedParams.alias])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading album...</p>
        </div>
      </div>
    )
  }

  if (error || !album) {
    const isAccessDenied = error?.includes('Access denied')
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className={`p-6 ${isAccessDenied ? 'bg-yellow-900/20 border border-yellow-500/30' : 'bg-red-900/20 border border-red-500/30'} rounded-lg`}>
            <h1 className={`text-2xl font-bold ${isAccessDenied ? 'text-yellow-400' : 'text-red-400'} mb-4`}>
              {isAccessDenied ? 'Access Denied' : 'Album Not Found'}
            </h1>
            <p className="text-gray-300 mb-4">
              {isAccessDenied 
                ? 'You do not have permission to view this album. Please contact an administrator if you believe this is an error.'
                : error || 'The album you are looking for does not exist.'
              }
            </p>
            <Link href="/albums" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              Browse Albums
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Access control is handled by the API, so we don't need client-side checks

  return <DynamicTemplateLoader pageName="album" />
}
