'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { SearchFilters } from '@/components/search/SearchFilters'
import { SearchResults } from '@/components/search/SearchResults'
import { SearchBar } from '@/components/search/SearchBar'
import { Photo, Album } from '@/types'
import Header from '../components/Header'
import Footer from '../components/Footer'
import styles from '../styles.module.scss'

interface SearchResultsData {
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

function SearchPageContent() {
  const { t } = useI18n()
  const { isRTL } = useLanguage()
  const searchParams = useSearchParams()
  
  const [results, setResults] = useState<SearchResultsData>({
    photos: [],
    albums: [],
    people: [],
    totalPhotos: 0,
    totalAlbums: 0,
    totalPeople: 0,
    page: 1,
    limit: 20,
    hasMore: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Search state
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [type, setType] = useState<'all' | 'photos' | 'albums' | 'people'>((searchParams.get('type') as 'all' | 'photos' | 'albums' | 'people') || 'all')
  const [filters, setFilters] = useState({
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || [],
    albumId: searchParams.get('albumId') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    storageProvider: searchParams.get('storageProvider') || '',
    isPublic: searchParams.get('isPublic') || '',
    mine: searchParams.get('mine') === 'true'
  })
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'filename' | 'size'>((searchParams.get('sortBy') as 'relevance' | 'date' | 'filename' | 'size') || 'relevance')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc')
  
  // Perform search
  const performSearch = async (page = 1, resetResults = false) => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (query) params.append('q', query)
      if (type !== 'all') params.append('type', type)
      if (page > 1) params.append('page', page.toString())
      if (filters.tags.length > 0) params.append('tags', filters.tags.join(','))
      if (filters.albumId) params.append('albumId', filters.albumId)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.storageProvider) params.append('storageProvider', filters.storageProvider)
      if (filters.isPublic) params.append('isPublic', filters.isPublic)
      if (filters.mine) params.append('mine', 'true')
      if (sortBy !== 'relevance') params.append('sortBy', sortBy)
      if (sortOrder !== 'desc') params.append('sortOrder', sortOrder)
      
      const response = await fetch(`/api/search?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Search failed')
      }
      
      const data = await response.json()
      if (data.success) {
        if (resetResults || page === 1) {
          setResults(data.data)
        } else {
          setResults(prev => ({
            ...data.data,
            photos: [...prev.photos, ...data.data.photos],
            albums: [...prev.albums, ...data.data.albums],
            people: [...prev.people, ...data.data.people]
          }))
        }
      } else {
        throw new Error(data.error || 'Search failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  // Initial search on mount
  useEffect(() => {
    if (query || Object.values(filters).some(v => v && v !== '')) {
      performSearch(1, true)
    }
  }, [])
  
  // Handle search
  const handleSearch = (newQuery: string) => {
    setQuery(newQuery)
    performSearch(1, true)
  }
  
  // Handle filter changes
  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
    performSearch(1, true)
  }
  
  // Handle sort changes
  const handleSortChange = (newSortBy: 'relevance' | 'date' | 'filename' | 'size', newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
    performSearch(1, true)
  }
  
  // Load more results
  const loadMore = () => {
    if (!loading && results.hasMore) {
      performSearch(results.page + 1, false)
    }
  }
  
  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('search.title', 'Search')}
          </h1>
          <p className="text-gray-600">
            {t('search.subtitle', 'Find photos and albums quickly')}
          </p>
        </div>
        
        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar
            query={query}
            onSearch={handleSearch}
            loading={loading}
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Suspense fallback={<div className="animate-pulse bg-gray-200 h-64 rounded-lg" />}>
              <SearchFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                type={type}
                onTypeChange={setType}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
              />
            </Suspense>
          </div>
          
          {/* Results */}
          <div className="lg:col-span-3">
            <Suspense fallback={<div className="animate-pulse bg-gray-200 h-64 rounded-lg" />}>
              <SearchResults
                results={results}
                loading={loading}
                error={error}
                onLoadMore={loadMore}
                query={query}
                type={type}
              />
            </Suspense>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />
        </div>
        <Footer />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  )
}
