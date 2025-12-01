'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useI18n } from '@/hooks/useI18n'
import MobileLayout from './MobileLayout'
import MobileSearch from './MobileSearch'
import MobilePhotoGallery from './MobilePhotoGallery'
import { MobileSearchFilters, SearchResult } from '@/types/search'

export default function MobileSearchPageContent() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''

  const [results, setResults] = useState<{
    photos: SearchResult[]
    albums: SearchResult[]
    people: SearchResult[]
    locations: SearchResult[]
    totalPhotos: number
    totalAlbums: number
    totalPeople: number
    totalLocations: number
    page: number
    limit: number
    hasMore: boolean
  }>({
    photos: [],
    albums: [],
    people: [],
    locations: [],
    totalPhotos: 0,
    totalAlbums: 0,
    totalPeople: 0,
    totalLocations: 0,
    page: 1,
    limit: 20,
    hasMore: false
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'photos' | 'albums' | 'people' | 'locations'>('photos')

  // Search function
  const performSearch = async (searchQuery: string, filters: MobileSearchFilters) => {
    if (!searchQuery.trim()) {
      setResults({
        photos: [],
        albums: [],
        people: [],
        locations: [],
        totalPhotos: 0,
        totalAlbums: 0,
        totalPeople: 0,
        totalLocations: 0,
        page: 1,
        limit: 20,
        hasMore: false
      })
      return
    }

    setLoading(true)
    setError(null)

    try {
      const searchParams = new URLSearchParams({
        q: searchQuery,
        type: filters.type,
        ...(filters.tags.length > 0 && { tags: filters.tags.join(',') }),
        ...(filters.dateRange.from && { dateFrom: filters.dateRange.from }),
        ...(filters.dateRange.to && { dateTo: filters.dateRange.to }),
        ...(filters.location && { location: filters.location }),
        sortBy: 'relevance',
        sortOrder: 'desc'
      })

      const response = await fetch(`/api/search?${searchParams}`)
      const data = await response.json()

      if (data.success) {
        setResults(data.data || {
          photos: [],
          albums: [],
          people: [],
          locations: [],
          totalPhotos: 0,
          totalAlbums: 0,
          totalPeople: 0,
          totalLocations: 0,
          page: 1,
          limit: 20,
          hasMore: false
        })
      } else {
        setError(data.error || 'Search failed')
      }
    } catch (err) {
      setError('Search failed')
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Perform initial search if query exists
  useEffect(() => {
    if (query) {
      performSearch(query, { type: 'all', tags: [], dateRange: { from: '', to: '' }, location: '' })
    }
  }, [query])

  const handleSearch = (searchQuery: string, filters: MobileSearchFilters) => {
    performSearch(searchQuery, filters)
  }

  const getTotalResults = () => {
    return results.totalPhotos + results.totalAlbums + results.totalPeople + results.totalLocations
  }

  const getActiveResults = () => {
    switch (activeTab) {
      case 'photos':
        return results.photos
      case 'albums':
        return results.albums
      case 'people':
        return results.people
      case 'locations':
        return results.locations
      default:
        return []
    }
  }

  const getActiveCount = () => {
    switch (activeTab) {
      case 'photos':
        return results.totalPhotos
      case 'albums':
        return results.totalAlbums
      case 'people':
        return results.totalPeople
      case 'locations':
        return results.totalLocations
      default:
        return 0
    }
  }

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Search Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <h1 className="text-xl font-bold text-gray-900 mb-4">
            {t('mobile.search.title', 'Search')}
          </h1>
          
          <MobileSearch
            onSearch={handleSearch}
            placeholder={t('mobile.search.placeholder', 'Search photos, albums, people...')}
          />
        </div>

        {/* Search Results */}
        {query && (
          <div className="p-4">
            {/* Results Summary */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                {t('mobile.search.resultsFor', 'Results for')}: "{query}"
              </h2>
              <p className="text-gray-600 text-sm">
                {loading ? t('mobile.search.searching', 'Searching...') : 
                 `${getTotalResults()} ${t('mobile.search.resultsFound', 'results found')}`}
              </p>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">
                  {t('mobile.search.searching', 'Searching...')}
                </p>
              </div>
            )}

            {/* Results Tabs */}
            {!loading && !error && getTotalResults() > 0 && (
              <div className="mb-4">
                <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                  {[
                    { key: 'photos', label: t('mobile.search.photos', 'Photos'), count: results.totalPhotos },
                    { key: 'albums', label: t('mobile.search.albums', 'Albums'), count: results.totalAlbums },
                    { key: 'people', label: t('mobile.search.people', 'People'), count: results.totalPeople },
                    { key: 'locations', label: t('mobile.search.locations', 'Locations'), count: results.totalLocations }
                  ].map(({ key, label, count }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key as any)}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === key
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {label} ({count})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results Content */}
            {!loading && !error && getTotalResults() > 0 && (
              <div>
                {activeTab === 'photos' && results.photos.length > 0 && (
                  <MobilePhotoGallery
                    photos={results.photos.map(photo => ({
                      _id: photo._id,
                      title: photo.title,
                      description: photo.description,
                      storage: {
                        url: photo.thumbnail || '',
                        thumbnailPath: photo.thumbnail || ''
                      },
                      dimensions: { width: 0, height: 0 },
                      uploadedAt: photo.createdAt,
                      tags: photo.tags,
                      people: photo.people,
                      location: photo.location?.name
                    }))}
                  />
                )}

                {activeTab === 'albums' && results.albums.length > 0 && (
                  <div className="grid grid-cols-1 gap-4">
                    {results.albums.map((album) => (
                      <div key={album._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">{album.title}</h3>
                        {album.description && (
                          <p className="text-gray-600 text-sm mb-2">{album.description}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {new Date(album.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'people' && results.people.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {results.people.map((person) => (
                      <div key={person._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
                        <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-3"></div>
                        <h3 className="font-semibold text-gray-900 text-sm">{person.title}</h3>
                        {person.description && (
                          <p className="text-gray-600 text-xs mt-1">{person.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'locations' && results.locations.length > 0 && (
                  <div className="grid grid-cols-1 gap-4">
                    {results.locations.map((location) => (
                      <div key={location._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">{location.title}</h3>
                        {location.description && (
                          <p className="text-gray-600 text-sm mb-2">{location.description}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {new Date(location.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* No Results */}
            {!loading && !error && getTotalResults() === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl text-gray-400 mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('mobile.search.noResults', 'No Results Found')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t('mobile.search.tryDifferentSearch', 'Try adjusting your search terms or filters')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* No Search Query */}
        {!query && (
          <div className="p-4">
            <div className="text-center py-8">
              <div className="text-4xl text-gray-400 mb-4">📱</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('mobile.search.startSearching', 'Start Searching')}
              </h3>
              <p className="text-gray-600">
                {t('mobile.search.startSearchingDescription', 'Enter a search term or use filters to find photos and albums')}
              </p>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  )
}
