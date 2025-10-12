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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />
      
      <main className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Search Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            {t('search.title', 'Search Gallery')}
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            {t('search.subtitle', 'Discover and explore our curated collection of beautiful moments')}
          </p>
        </div>

        {/* Search Query Display */}
        {query && (
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 mb-10 shadow-xl border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  {t('search.resultsFor', 'Results for')}: <span className="text-blue-600">"{query}"</span>
                </h2>
                <p className="text-slate-600">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      {t('search.searching', 'Searching...')}
                    </span>
                  ) : (
                    `${results.length} ${t('search.resultsFound', 'results found')}`
                  )}
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-2xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {t('search.clearFilters', 'Clear Filters')}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="xl:col-span-1">
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-6 shadow-xl border border-white/20 sticky top-8">
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
          <div className="xl:col-span-3">
            {error && (
              <div className="bg-red-50/80 backdrop-blur-lg border border-red-200/50 rounded-2xl p-6 mb-8">
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            )}

            {loading && (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                <p className="mt-6 text-slate-600 font-medium text-lg">
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
              <div className="text-center py-16">
                <div className="text-8xl text-slate-300 mb-6">🔍</div>
                <h3 className="text-3xl font-bold text-slate-800 mb-4">
                  {t('search.noResults', 'No Results Found')}
                </h3>
                <p className="text-slate-600 mb-8 text-lg max-w-md mx-auto">
                  {t('search.tryDifferentSearch', 'Try adjusting your search terms or filters to find what you\'re looking for')}
                </p>
                <button
                  onClick={clearFilters}
                  className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-2xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
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
