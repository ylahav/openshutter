'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { Button } from '@/components/ui/button'
import { PhotoCard } from '@/components/search/PhotoCard'
import { AlbumCard } from '@/components/search/AlbumCard'
import { PersonCard } from '@/components/search/PersonCard'
import { Photo, Album } from '@/types'
import { Loader2, Search, Image, Folder, User } from 'lucide-react'

interface SearchResultsProps {
  results: {
    photos: Photo[]
    albums: Album[]
    people: any[]
    totalPhotos: number
    totalAlbums: number
    totalPeople: number
    page: number
    limit: number
    hasMore: boolean
  }
  loading: boolean
  error: string | null
  onLoadMore: () => void
  query: string
  type: string
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
  
  const totalResults = results.totalPhotos + results.totalAlbums + results.totalPeople
  const hasResults = totalResults > 0
  
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
  
  if (query && !loading && !hasResults) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t('search.noResults', 'No Results Found')}
        </h3>
        <p className="text-gray-600">
          {t('search.noResultsDescription', 'Try adjusting your search terms or filters')}
        </p>
      </div>
    )
  }
  
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
      {hasResults && !loading && (
        <div className="space-y-6">
          {/* Photos */}
          {(type === 'photos' || type === 'all') && results.photos.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Image className="h-5 w-5 mr-2" />
                {t('search.photos', 'Photos')} ({results.totalPhotos})
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
          {(type === 'albums' || type === 'all') && results.albums.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Folder className="h-5 w-5 mr-2" />
                {t('search.albums', 'Albums')} ({results.totalAlbums})
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
          
          {/* People */}
          {(type === 'people' || type === 'all') && results.people.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                {t('search.people', 'People')} ({results.totalPeople})
              </h3>
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'space-y-4'
              }>
                {results.people.map((person) => (
                  <PersonCard
                    key={person._id}
                    person={person}
                    viewMode={viewMode}
                  />
                ))}
              </div>
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
        </div>
      )}
    </div>
  )
}
