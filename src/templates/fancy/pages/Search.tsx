'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useI18n } from '@/hooks/useI18n'
import { SearchFilters } from '@/components/search/SearchFilters'
import { SearchResults } from '@/components/search/SearchResults'
import Header from '../components/Header'
import Footer from '../components/Footer'

interface SearchFilters {
  tags: string[]
  albumId: string | null
  dateFrom: string
  dateTo: string
  storageProvider: string
  isPublic: string
  mine: boolean
}

interface SearchResult {
  _id: string
  type: 'photo' | 'album' | 'person'
  title: string
  description?: string
  thumbnail?: string
  albumId?: string
  albumName?: string
  createdAt: string
  updatedAt: string
  isPublished?: boolean
  tags?: string[]
  people?: string[]
  location?: {
    name: string
    coordinates?: [number, number]
  }
}

export default function SearchPage() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''

  const [filters, setFilters] = useState<SearchFilters>({
    tags: [],
    albumId: null,
    dateFrom: '',
    dateTo: '',
    storageProvider: '',
    isPublic: '',
    mine: false
  })

  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<'all' | 'photos' | 'albums' | 'people'>('all')
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'filename' | 'size'>('relevance')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Search function
  const performSearch = async () => {
    if (!query.trim()) {
      setResults([])
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
        setResults(data.results || [])
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

  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const handleTypeChange = (newType: 'all' | 'photos' | 'albums' | 'people') => {
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-serif text-amber-900 mb-4">
            {t('search.title', 'Search Gallery')}
          </h1>
          <p className="text-lg text-amber-700 max-w-2xl mx-auto">
            {t('search.subtitle', 'Discover beautiful moments and memories in our curated collection')}
          </p>
        </div>

        {/* Search Query Display */}
        {query && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-lg border border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-amber-900 mb-2">
                  {t('search.resultsFor', 'Results for')}: "{query}"
                </h2>
                <p className="text-amber-700">
                  {loading ? t('search.searching', 'Searching...') : 
                   `${results.length} ${t('search.resultsFound', 'results found')}`}
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-colors duration-200 font-medium"
                >
                  {t('search.clearFilters', 'Clear Filters')}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-amber-200 sticky top-8">
              <SearchFilters
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
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {loading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
                <p className="mt-4 text-amber-700 font-medium">
                  {t('search.searching', 'Searching...')}
                </p>
              </div>
            )}

            {!loading && !error && (
              <SearchResults 
                results={{
                  photos: results.filter(r => r.type === 'photo') as any[],
                  albums: results.filter(r => r.type === 'album') as any[],
                  people: results.filter(r => r.type === 'person') as any[],
                  totalPhotos: results.filter(r => r.type === 'photo').length,
                  totalAlbums: results.filter(r => r.type === 'album').length,
                  totalPeople: results.filter(r => r.type === 'person').length,
                  page: 1,
                  limit: 20,
                  hasMore: false
                }}
                query={query}
                type={type}
                loading={loading}
                error={error}
                onLoadMore={() => {}}
              />
            )}

            {!loading && !error && results.length === 0 && query && (
              <div className="text-center py-12">
                <div className="text-6xl text-amber-300 mb-4">🔍</div>
                <h3 className="text-2xl font-serif text-amber-900 mb-2">
                  {t('search.noResults', 'No Results Found')}
                </h3>
                <p className="text-amber-700 mb-6">
                  {t('search.tryDifferentSearch', 'Try adjusting your search terms or filters')}
                </p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors duration-200 font-medium"
                >
                  {t('search.clearAllFilters', 'Clear All Filters')}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
