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
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('search.title', 'Search')}
          </h1>
          <p className="text-muted-foreground">
            {t('search.subtitle', 'Find what you\'re looking for')}
          </p>
        </div>

        {/* Search Query Display */}
        {query && (
          <div className="bg-card rounded-lg p-4 mb-6 border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">
                  {t('search.resultsFor', 'Results for')}: "{query}"
                </h2>
                <p className="text-muted-foreground text-sm">
                  {loading ? t('search.searching', 'Searching...') : 
                   `${results.length} ${t('search.resultsFound', 'results found')}`}
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded transition-colors"
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
            <div className="bg-card rounded-lg p-4 border sticky top-8">
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
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                <p className="text-destructive">{error}</p>
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-muted-foreground">
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
              <div className="text-center py-8">
                <div className="text-4xl text-muted-foreground mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t('search.noResults', 'No Results Found')}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {t('search.tryDifferentSearch', 'Try adjusting your search terms or filters')}
                </p>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors"
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
