'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useI18n } from '@/hooks/useI18n'
import { SearchFilters as SearchFiltersComponent } from '@/components/search/SearchFilters'
import { SearchResults } from '@/components/search/SearchResults'
import { DesktopSearchFilters } from '@/types/search'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function SearchPage() {
  const { t } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [inputValue, setInputValue] = useState(query)

  const [filters, setFilters] = useState<DesktopSearchFilters>({
    tags: [],
    albumId: null,
    dateFrom: '',
    dateTo: '',
    storageProvider: '',
    isPublic: '',
    mine: false
  })

  const [results, setResults] = useState({
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
  } as any)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<'all' | 'photos' | 'albums' | 'people' | 'locations'>('all')
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'filename' | 'size'>('relevance')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => { setInputValue(query) }, [query])

  const submitSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    if (inputValue && inputValue.trim()) params.set('q', inputValue.trim())
    else params.delete('q')
    router.push(`${pathname}?${params.toString()}`)
  }

  // Search function
  const performSearch = async () => {
    if (!query.trim()) {
      setResults({
        photos: [], albums: [], people: [], locations: [],
        totalPhotos: 0, totalAlbums: 0, totalPeople: 0, totalLocations: 0,
        page: 1, limit: 20, hasMore: false
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
        console.log('Modern Search - API Response:', {
          hasData: !!data.data,
          hasResults: !!data.results,
          dataKeys: data.data ? Object.keys(data.data) : [],
          resultsKeys: data.results ? Object.keys(data.results) : [],
          totalPhotos: data.data?.totalPhotos || data.results?.totalPhotos || 0,
          photosArrayLength: data.data?.photos?.length || data.results?.photos?.length || 0
        })
        setResults(data.data || data.results || {
          photos: [], albums: [], people: [], locations: [],
          totalPhotos: 0, totalAlbums: 0, totalPeople: 0, totalLocations: 0,
          page: 1, limit: 20, hasMore: false
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
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />
      
      <main className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Search Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-linear-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            {t('search.title', 'Search Gallery')}
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            {t('search.subtitle', 'Discover and explore our curated collection of beautiful moments')}
          </p>
          <form onSubmit={submitSearch} className="mt-6 max-w-2xl mx-auto flex gap-3">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t('search.placeholder', 'Search by people, albums, locations, tags...')}
              className="bg-white/90"
            />
            <Button type="submit" className="px-6">
              {t('search.search', 'Search')}
            </Button>
          </form>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="xl:col-span-1">
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-6 shadow-xl border border-white/20 sticky top-8">
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
                results={results as any}
                query={query}
                type={type}
                loading={loading}
                error={error}
                onLoadMore={() => {}}
              />
            )}

            {!loading && !error && ((results.totalPhotos||0)+(results.totalAlbums||0)+(results.totalPeople||0)===0) && query && (
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
                  className="px-8 py-4 bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-2xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
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
