'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useI18n } from '@/hooks/useI18n'
import { SearchFilters as SearchFiltersComponent } from './SearchFilters'
import { SearchResults } from './SearchResults'
import { SearchResult, DesktopSearchFilters } from '@/types/search'

export default function SearchPageContent() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''

  const [filters, setFilters] = useState<DesktopSearchFilters>({
    tags: [],
    albumId: null,
    dateFrom: '',
    dateTo: '',
    storageProvider: '',
    isPublic: '',
    mine: false
  })

  const [results, setResults] = useState<{
    photos: any[]
    albums: any[]
    people: any[]
    locations: any[]
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
  const [type, setType] = useState<'all' | 'photos' | 'albums' | 'people' | 'locations'>('all')
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'filename' | 'size'>('relevance')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Search function
  const performSearch = async () => {
    if (!query.trim()) {
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
        q: query,
        type: type,
        ...(filters.tags.length > 0 && { tags: filters.tags.join(',') }),
        ...(filters.albumId && { albumId: filters.albumId }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.storageProvider && { storageProvider: filters.storageProvider }),
        ...(filters.isPublic !== undefined && { isPublic: String(filters.isPublic) }),
        ...(filters.mine && { mine: 'true' }),
        sortBy,
        sortOrder
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

  // Perform search when query or filters change
  useEffect(() => {
    performSearch()
  }, [query, type, filters, sortBy, sortOrder])

  const handleFilterChange = (newFilters: Partial<DesktopSearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const handleTypeChange = (newType: 'all' | 'photos' | 'albums' | 'people' | 'locations') => {
    setType(newType)
  }

  const handleSortChange = (newSortBy: 'relevance' | 'date' | 'filename' | 'size', newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
  }

  const clearFilters = () => {
    setFilters({
      tags: [],
      albumId: null,
      dateFrom: '',
      dateTo: '',
      storageProvider: '',
      isPublic: '',
      mine: false
    })
  }

  const hasActiveFilters = Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : value !== '' && value !== false && value !== null
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('search.title', 'Search')}
          </h1>
          <p className="text-gray-600">
            {t('search.subtitle', 'Find what you\'re looking for')}
          </p>
        </div>

        {/* Search Query Display */}
        {query && (
          <div className="bg-white rounded-lg p-4 mb-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  {t('search.resultsFor', 'Results for')}: "{query}"
                </h2>
                <p className="text-gray-600 text-sm">
                  {loading ? t('search.searching', 'Searching...') : 
                   `${results.totalPhotos + results.totalAlbums + results.totalPeople + results.totalLocations} ${t('search.resultsFound', 'results found')}`}
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition-colors"
                >
                  {t('search.clearFilters', 'Clear Filters')}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-4 shadow sticky top-8">
              <SearchFiltersComponent
                filters={filters}
                onFilterChange={handleFilterChange}
                type={type}
                onTypeChange={handleTypeChange}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
              />
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">
                  {t('search.searching', 'Searching...')}
                </p>
              </div>
            )}

            {!loading && !error && (
                <SearchResults
                  results={results}
                  query={query}
                  loading={loading}
                  error={error}
                  onLoadMore={() => {}}
                />
            )}

            {!loading && !error && (results.totalPhotos + results.totalAlbums + results.totalPeople + results.totalLocations) === 0 && query && (
              <div className="text-center py-8">
                <div className="text-4xl text-gray-400 mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('search.noResults', 'No Results Found')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t('search.tryDifferentSearch', 'Try adjusting your search terms or filters')}
                </p>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  {t('search.clearAllFilters', 'Clear All Filters')}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
