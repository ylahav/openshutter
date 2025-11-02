'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { Button } from '@/components/ui/button'
import { PhotoCard } from '@/components/search/PhotoCard'
import { AlbumCard } from '@/components/search/AlbumCard'
import { PersonCard } from '@/components/search/PersonCard'
import { Photo, Album } from '@/types'
import { SearchResults as SearchResultsType } from '@/types/search'
import { Loader2, Search, Image, Folder, User } from '@/lib/icons'

// The SearchResults type from API has full objects, which should be compatible with Photo/Album
// But we'll accept any[] for flexibility since the API returns full database objects
interface SearchResultsProps {
  results: SearchResultsType
  loading: boolean
  error: string | null
  onLoadMore: () => void
  query: string
  type: 'all' | 'photos' | 'albums' | 'people' | 'locations'
}

export function SearchResults({
  results,
  loading,
  error,
  onLoadMore,
  query,
  type
}: SearchResultsProps) {
  const { t } = useI18n()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Calculate totals - use array lengths if totals are missing
  // But also check totalPhotos/totalAlbums as fallback in case arrays are delayed
  const photoCount = Array.isArray(results.photos) && results.photos.length > 0 
    ? results.photos.length 
    : (results.totalPhotos || 0)
  const albumCount = Array.isArray(results.albums) && results.albums.length > 0
    ? results.albums.length
    : (results.totalAlbums || 0)
  const peopleCount = Array.isArray(results.people) && results.people.length > 0
    ? results.people.length
    : (results.totalPeople || 0)
  const locationCount = Array.isArray(results.locations) && results.locations.length > 0
    ? results.locations.length
    : (results.totalLocations || 0)
  const totalResults = photoCount + albumCount + peopleCount + locationCount
  const hasResults = totalResults > 0 || (results.totalPhotos || 0) > 0 || (results.totalAlbums || 0) > 0
  
  console.log('SearchResults render:', {
    totalResults,
    hasResults,
    photosArrayLength: results.photos?.length || 0,
    photosTotal: results.totalPhotos || 0,
    photoCount,
    loading,
    error,
    query,
    type,
    allResultKeys: Object.keys(results || {}),
    resultsPhotosIsArray: Array.isArray(results.photos),
    resultsPhotosType: typeof results.photos,
    resultsPhotosValue: results.photos,
    willRenderPhotos: (type === 'photos' || type === 'all') && results.photos && results.photos.length > 0
  })
  
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
                {totalResults} {t('search.totalResults', 'results found')}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Image className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <Folder className="h-4 w-4" />
              </Button>
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
          {/* Photos */}
          {(type === 'photos' || type === 'all') && Array.isArray(results.photos) && results.photos.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Image className="h-5 w-5 mr-2" />
                {t('search.photos', 'Photos')} ({results.photos.length || results.totalPhotos || 0})
              </h3>
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'space-y-4'
              }>
                {results.photos.map((photo) => (
                  <PhotoCard
                    key={photo._id}
                    photo={photo}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Albums */}
          {(type === 'albums' || type === 'all') && Array.isArray(results.albums) && results.albums.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Folder className="h-5 w-5 mr-2" />
                {t('search.albums', 'Albums')} ({results.totalAlbums || results.albums.length})
              </h3>
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'space-y-4'
              }>
                {results.albums.map((album) => (
                  <AlbumCard
                    key={album._id}
                    album={album}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* People and Locations sections removed - only showing photos and albums */}
          
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
    </div>
  )
}
