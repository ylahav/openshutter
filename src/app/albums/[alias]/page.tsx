'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import Header from '@/templates/dark/components/Header'
import Footer from '@/templates/dark/components/Footer'
import AlbumCard from '@/templates/dark/components/AlbumCard'
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
          setError(result.error || 'Failed to fetch album')
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
            const response = await fetch(`/api/albums?parentId=${albumId}&isPublic=true`)
            if (response.ok) {
              const result = await response.json()
              if (result.success) {
                setChildAlbums(result.data.filter((album: Album) => album.isPublic))
              }
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
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-lg">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Album Not Found</h1>
            <p className="text-gray-300 mb-4">{error || 'The album you are looking for does not exist or is not public.'}</p>
            <Link href="/albums" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              Browse All Albums
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!album.isPublic) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="p-6 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <h1 className="text-2xl font-bold text-yellow-400 mb-4">Private Album</h1>
            <p className="text-gray-300 mb-4">This album is private and not available for public viewing.</p>
            <Link href="/albums" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              Browse Public Albums
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      {/* Breadcrumb Navigation */}
      {breadcrumbs.length > 0 && (
        <div className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                <li>
                  <Link href="/" className="text-gray-400 hover:text-gray-300">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                    <span className="sr-only">Home</span>
                  </Link>
                </li>
                {breadcrumbs.map((breadcrumb, index) => (
                  <li key={breadcrumb.alias}>
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <Link 
                        href={`/albums/${breadcrumb.alias}`}
                        className="ml-2 text-sm font-medium text-gray-400 hover:text-gray-300"
                      >
                        {breadcrumb.name}
                      </Link>
                    </div>
                  </li>
                ))}
                <li>
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-2 text-sm font-medium text-gray-900" aria-current="page">
                      {album ? MultiLangUtils.getTextValue(album.name as any, currentLanguage) : '...'}
                    </span>
                  </div>
                </li>
              </ol>
            </nav>
          </div>
        </div>
      )}
      
      {/* Album Header */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                {MultiLangUtils.getTextValue(album.name as any, currentLanguage)}
              </span>
            </h1>
            {album.description && (
              <div className="text-xl text-gray-300 mb-6 max-w-3xl mx-auto" dangerouslySetInnerHTML={{ __html: MultiLangUtils.getHTMLValue(album.description as any, currentLanguage) }} />
            )}
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-400">
              <span>{totalPhotoCount || pagination.total || photos.length} photos</span>
              {album.isFeatured && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-black">
                    ⭐ Featured
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Photos Grid */}
      <div id="photos-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        {photos.length === 0 && childAlbums.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No photos available</h3>
            <p className="mt-1 text-sm text-gray-500">This album doesn't have any published photos yet.</p>
          </div>
        ) : photos.length > 0 ? (
          <>
            {/* Photos Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {photos.map((photo) => (
              <div 
                key={photo._id} 
                className="group cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden">
                  <img
                    src={photo.storage.thumbnailPath || photo.storage.url}
                    alt={typeof photo.title === 'string' ? photo.title : photo.title.en}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      const fallback = e.currentTarget.nextElementSibling
                      if (fallback) {
                        fallback.classList.remove('hidden')
                        fallback.classList.add('flex')
                      }
                    }}
                  />
                  <div className="absolute inset-0 items-center justify-center bg-gray-100 hidden">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                
                {/* Photo Info */}
                <div className="mt-2">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {typeof photo.title === 'string' ? photo.title : photo.title.en}
                  </h3>
                  {(photo.metadata || photo.dimensions) && (
                    <p className="text-xs text-gray-500">
                      {(photo.metadata?.width || photo.dimensions?.width) || 0} × {(photo.metadata?.height || photo.dimensions?.height) || 0}
                    </p>
                  )}
                  {/* EXIF Date */}
                  {photo.exif?.dateTimeOriginal && (
                    <p className="text-xs text-gray-400 mt-1">
                      📅 {new Date(photo.exif.dateTimeOriginal).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Leading Badge */}
                {photo.isLeading && (
                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Leading
                    </span>
                  </div>
                )}
              </div>
            ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex flex-col items-center space-y-4">
                {/* Page Info */}
                <div className="text-sm text-gray-500">
                  Showing {photos.length} of {pagination.total} photos
                  {pagination.totalPages > 1 && (
                    <span> • Page {pagination.page} of {pagination.totalPages}</span>
                  )}
                </div>

                {/* Page Navigation */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => loadPage(pagination.page - 1)}
                    disabled={!pagination.hasPrevPage || photosLoading}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i
                      } else {
                        pageNum = pagination.page - 2 + i
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => loadPage(pageNum)}
                          disabled={photosLoading}
                          className={`px-3 py-2 text-sm font-medium rounded-md ${
                            pageNum === pagination.page
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  
                  <button
                    onClick={() => loadPage(pagination.page + 1)}
                    disabled={!pagination.hasNextPage || photosLoading}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>

                {/* Load More Button (for infinite scroll alternative) */}
                {pagination.hasNextPage && (
                  <button
                    onClick={loadMorePhotos}
                    disabled={photosLoading}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {photosLoading ? 'Loading...' : 'Load More Photos'}
                  </button>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Child Albums Section */}
      {childAlbums.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="border-t border-gray-800 pt-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Sub Albums
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {childAlbums.map((childAlbum) => (
                <AlbumCard key={childAlbum._id} album={childAlbum} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer */}
      <PhotoViewer
        photos={photos}
        currentIndex={selectedPhoto ? photos.findIndex(p => p._id === selectedPhoto._id) : 0}
        isOpen={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        onNavigate={(index) => setSelectedPhoto(photos[index])}
        showExifData={album?.showExifData}
      />

      <Footer />
    </div>
  )
}
