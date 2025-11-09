'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { Button } from '@/components/ui/button'
import { PhotoCard } from '@/components/search/PhotoCard'
import PhotoLightbox from '@/components/PhotoLightbox'
import { Photo } from '@/types'
import { SearchResults as SearchResultsType } from '@/types/search'
import { Loader2, Search } from '@/lib/icons'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'

// The SearchResults type from API has full objects, which should be compatible with Photo/Album
// But we'll accept any[] for flexibility since the API returns full database objects
interface SearchResultsProps {
  results: SearchResultsType
  loading: boolean
  error: string | null
  onLoadMore: () => void
  query: string
}

export function SearchResults({
  results,
  loading,
  error,
  onLoadMore,
  query
}: SearchResultsProps) {
  const { t } = useI18n()
  const { currentLanguage } = useLanguage()
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  
  // Calculate photo count
  const photoCount = Array.isArray(results.photos) && results.photos.length > 0 
    ? results.photos.length 
    : (results.totalPhotos || 0)
  const hasResults = photoCount > 0 || (results.totalPhotos || 0) > 0
  
  // Prepare photos for lightbox - ensure URLs are properly formatted
  const lightboxPhotos = Array.isArray(results.photos) ? results.photos.map((photo: any) => {
    // Get full image URL (not thumbnail)
    let imageUrl = ''
    if (photo.storage?.url) {
      if (photo.storage.url.startsWith('/api/storage/serve/') || photo.storage.url.startsWith('http')) {
        imageUrl = photo.storage.url
      } else {
        const provider = photo.storage.provider || 'local'
        imageUrl = `/api/storage/serve/${provider}/${encodeURIComponent(photo.storage.url)}`
      }
    } else if (photo.storage?.thumbnailPath) {
      // Fallback to thumbnail if full URL not available
      if (photo.storage.thumbnailPath.startsWith('/api/storage/serve/') || photo.storage.thumbnailPath.startsWith('http')) {
        imageUrl = photo.storage.thumbnailPath
      } else {
        const provider = photo.storage.provider || 'local'
        imageUrl = `/api/storage/serve/${provider}/${encodeURIComponent(photo.storage.thumbnailPath)}`
      }
    }
    
    // Get thumbnail URL
    let thumbnailUrl = ''
    if (photo.storage?.thumbnailPath) {
      if (photo.storage.thumbnailPath.startsWith('/api/storage/serve/') || photo.storage.thumbnailPath.startsWith('http')) {
        thumbnailUrl = photo.storage.thumbnailPath
      } else {
        const provider = photo.storage.provider || 'local'
        thumbnailUrl = `/api/storage/serve/${provider}/${encodeURIComponent(photo.storage.thumbnailPath)}`
      }
    } else if (photo.storage?.url) {
      thumbnailUrl = imageUrl
    }
    
    return {
      _id: photo._id,
      url: imageUrl,
      thumbnailUrl: thumbnailUrl,
      title: typeof photo.title === 'string' 
        ? photo.title 
        : MultiLangUtils.getTextValue(photo.title || {}, currentLanguage) || '',
      takenAt: photo.exif?.dateTime || photo.uploadedAt,
      exif: photo.exif,
      metadata: photo.dimensions ? {
        width: photo.dimensions.width,
        height: photo.dimensions.height,
        fileSize: photo.size,
        format: photo.mimeType
      } : undefined
    }
  }) : []
  
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="text-red-500 mb-4">
          <Search className="h-12 w-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">{t('search.error', 'Search Error')}</h3>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
        </div>
        <Button onClick={() => window.location.reload()}>
          {t('search.retry', 'Try Again')}
        </Button>
      </div>
    )
  }
  
  if (!query && !hasResults) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t('search.startSearching', 'Start Searching')}
        </h3>
        <p className="text-gray-600">
          {t('search.startSearchingDescription', 'Enter a search term or use filters to find photos and albums')}
        </p>
      </div>
    )
  }
  
  // Always render the results section - let it handle empty state internally
  return (
    <div className="space-y-6">
      {/* Results Header */}
      {hasResults && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('search.results', 'Search Results')}
              </h2>
              <span className="text-sm text-gray-600">
                {photoCount} {photoCount === 1 ? t('search.photo', 'photo') : t('search.photos', 'photos')}
              </span>
            </div>
          </div>
          
          {query && (
            <div className="mt-2">
              <span className="text-sm text-gray-600">
                {t('search.searchingFor', 'Searching for')}: <strong>"{query}"</strong>
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-600" />
          <p className="text-gray-600">{t('search.searching', 'Searching...')}</p>
        </div>
      )}
      
      {/* Results */}
      {!loading && (
        <div className="space-y-6">
          {/* Photos Grid */}
          {Array.isArray(results.photos) && results.photos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {results.photos.map((photo, index) => (
                <div
                  key={photo._id}
                  onClick={() => {
                    setLightboxIndex(index)
                    setLightboxOpen(true)
                  }}
                  className="cursor-pointer"
                >
                  <PhotoCard
                    photo={photo}
                    viewMode="grid"
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Load More Button */}
          {results.hasMore && (
            <div className="text-center">
              <Button
                onClick={onLoadMore}
                disabled={loading}
                className="px-8"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('search.loading', 'Loading...')}
                  </>
                ) : (
                  t('search.loadMore', 'Load More')
                )}
              </Button>
            </div>
          )}
          
          {/* No Results Message */}
          {query && !hasResults && (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('search.noResults', 'No Results Found')}
              </h3>
              <p className="text-gray-600">
                {t('search.noResultsDescription', 'Try adjusting your search terms or filters')}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Photo Lightbox */}
      {lightboxPhotos.length > 0 && (
        <PhotoLightbox
          photos={lightboxPhotos}
          startIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}
