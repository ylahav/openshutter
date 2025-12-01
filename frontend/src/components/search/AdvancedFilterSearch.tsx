'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSession } from '@/hooks/useAuth'
import { MultiLangUtils } from '@/types/multi-lang'
import { SearchResults } from './SearchResults'
import { AlbumFilterSection } from './filter-sections/AlbumFilterSection'
import { TagFilterSection } from './filter-sections/TagFilterSection'
import { PeopleFilterSection } from './filter-sections/PeopleFilterSection'
import { LocationFilterSection } from './filter-sections/LocationFilterSection'
import { DateRangeFilterSection } from './filter-sections/DateRangeFilterSection'
import { ActiveFiltersDisplay } from './ActiveFiltersDisplay'
import { Button } from '@/components/ui/button'
import { X, ChevronDown, ChevronUp } from '@/lib/icons'

export interface AdvancedFilters {
  albumId: string | null
  tags: string[]
  people: string[]
  locationIds: string[]
  dateFrom: string
  dateTo: string
}

interface AdvancedFilterSearchProps {
  initialQuery?: string
  onSearch?: (query: string, filters: AdvancedFilters) => void
}

export function AdvancedFilterSearch({ initialQuery = '', onSearch }: AdvancedFilterSearchProps) {
  const { t } = useI18n()
  const { currentLanguage } = useLanguage()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated' && !!session
  
  // Initialize filters from URL parameters
  const getInitialFilters = (): AdvancedFilters => {
    return {
      albumId: searchParams.get('albumId') || null,
      tags: searchParams.get('tags') ? searchParams.get('tags')!.split(',').filter(Boolean) : [],
      people: searchParams.get('people') ? searchParams.get('people')!.split(',').filter(Boolean) : [],
      locationIds: searchParams.get('locationIds') ? searchParams.get('locationIds')!.split(',').filter(Boolean) : [],
      dateFrom: searchParams.get('dateFrom') || '',
      dateTo: searchParams.get('dateTo') || ''
    }
  }
  
  const [query] = useState(initialQuery || searchParams.get('q') || '')
  const [filters, setFilters] = useState<AdvancedFilters>(getInitialFilters())
  
  // Update filters when URL parameters change
  useEffect(() => {
    setFilters(getInitialFilters())
  }, [searchParams])
  
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
  
  const [currentPage, setCurrentPage] = useState(1)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Section collapse state
  const [sectionsExpanded, setSectionsExpanded] = useState({
    albums: true,
    tags: true,
    people: true,
    locations: true,
    dateRange: false // Temporarily disabled
  })
  
  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.albumId) count++
    if (filters.tags.length > 0) count += filters.tags.length
    if (filters.people.length > 0) count += filters.people.length
    if (filters.locationIds.length > 0) count += filters.locationIds.length
    // Date range temporarily disabled
    // if (filters.dateFrom || filters.dateTo) count++
    return count
  }, [filters])
  
  // Perform search
  const performSearch = async (page = 1, append = false) => {
    setLoading(true)
    setError(null)
    
    try {
      const searchParams = new URLSearchParams({
        q: query || '',
        type: 'photos', // Focus on photos for now
        page: page.toString(),
        limit: '20',
        ...(filters.albumId && { albumId: filters.albumId }),
        ...(filters.tags.length > 0 && { tags: filters.tags.join(',') }),
        ...(filters.people.length > 0 && { people: filters.people.join(',') }),
        ...(filters.locationIds.length > 0 && { locationIds: filters.locationIds.join(',') }),
        ...(filters.dateFrom && filters.dateFrom.trim() && { dateFrom: filters.dateFrom.trim() }),
        ...(filters.dateTo && filters.dateTo.trim() && { dateTo: filters.dateTo.trim() }),
        sortBy: 'date',
        sortOrder: 'desc'
      })
      
      console.log('AdvancedFilterSearch - Sending search request:', {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        url: `/api/search?${searchParams.toString()}`
      })
      
      const response = await fetch(`/api/search?${searchParams}`)
      const data = await response.json()
      
      if (data.success) {
        const newResults = data.data || data.results || {
          photos: [], albums: [], people: [], locations: [],
          totalPhotos: 0, totalAlbums: 0, totalPeople: 0, totalLocations: 0,
          page: 1, limit: 20, hasMore: false
        }
        
        if (append && results.photos) {
          // Append new photos to existing ones
          setResults({
            ...newResults,
            photos: [...results.photos, ...newResults.photos]
          })
        } else {
          // Replace results
          setResults(newResults)
        }
        
        setCurrentPage(page)
        
        if (onSearch) {
          onSearch(query, filters)
        }
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
  
  const handleLoadMore = () => {
    if (!loading && results.hasMore) {
      performSearch(currentPage + 1, true)
    }
  }
  
  // Auto-search when filters or query change (reset to page 1)
  useEffect(() => {
    setCurrentPage(1)
    const timeoutId = setTimeout(() => {
      performSearch(1, false)
    }, 300) // Debounce for 300ms
    
    return () => clearTimeout(timeoutId)
  }, [query, filters])
  
  const handleFilterChange = (newFilters: Partial<AdvancedFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }
  
  const clearAllFilters = () => {
    setFilters({
      albumId: null,
      tags: [],
      people: [],
      locationIds: [],
      dateFrom: '',
      dateTo: ''
    })
  }
  
  const toggleSection = (section: keyof typeof sectionsExpanded) => {
    setSectionsExpanded(prev => ({ ...prev, [section]: !prev[section] }))
  }
  
  const removeFilter = (type: keyof AdvancedFilters, value?: string) => {
    if (type === 'tags' && value) {
      setFilters(prev => ({
        ...prev,
        tags: prev.tags.filter(t => t !== value)
      }))
    } else if (type === 'people' && value) {
      setFilters(prev => ({
        ...prev,
        people: prev.people.filter(p => p !== value)
      }))
    } else if (type === 'locationIds' && value) {
      setFilters(prev => ({
        ...prev,
        locationIds: prev.locationIds.filter(l => l !== value)
      }))
    } else if (type === 'albumId') {
      setFilters(prev => ({
        ...prev,
        albumId: null
      }))
    } else if (type === 'dateFrom' || type === 'dateTo') {
      // Clear date filters
      setFilters(prev => ({
        ...prev,
        dateFrom: '',
        dateTo: ''
      }))
    } else {
      setFilters(prev => ({ ...prev, [type]: type === 'tags' || type === 'people' || type === 'locationIds' ? [] : null }))
    }
  }
  
  return (
    <div className="bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Search Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('search.title', 'Search Gallery')}
          </h1>
          <p className="text-gray-600">
            {t('search.subtitle', 'Discover and explore our curated collection')}
          </p>
        </div>
        
        {/* Two-column layout */}
        <div className="flex gap-6">
          {/* Left Sidebar - Fixed width 320px */}
          <div className="w-80 shrink-0">
            <div className="bg-white rounded-lg shadow-sm border sticky top-4">
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('search.filters', 'Filters')}
                </h2>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-8 text-xs text-gray-600 hover:text-gray-800"
                  >
                    <X className="h-3 w-3 mr-1" />
                    {t('search.clearAll', 'Clear all')}
                  </Button>
                )}
              </div>
              
              {activeFilterCount > 0 && (
                <div className="px-4 py-2 bg-blue-50 border-b">
                  <span className="text-xs text-blue-700 font-medium">
                    {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active
                  </span>
                </div>
              )}
              
              {/* Filter Sections */}
              <div className="p-4 space-y-1">
                {/* Albums Filter */}
                <AlbumFilterSection
                  selectedAlbumId={filters.albumId}
                  onSelect={(albumId) => handleFilterChange({ albumId })}
                  isExpanded={sectionsExpanded.albums}
                  onToggle={() => toggleSection('albums')}
                  includePrivate={isAuthenticated}
                />
                
                {/* Tags Filter */}
                <TagFilterSection
                  selectedTags={filters.tags}
                  onSelect={(tags) => handleFilterChange({ tags })}
                  isExpanded={sectionsExpanded.tags}
                  onToggle={() => toggleSection('tags')}
                  isAuthenticated={isAuthenticated}
                />
                
                {/* People Filter */}
                <PeopleFilterSection
                  selectedPeople={filters.people}
                  onSelect={(people) => handleFilterChange({ people })}
                  isExpanded={sectionsExpanded.people}
                  onToggle={() => toggleSection('people')}
                  isAuthenticated={isAuthenticated}
                />
                
                {/* Location Filter */}
                <LocationFilterSection
                  selectedLocationIds={filters.locationIds}
                  onSelect={(locationIds) => handleFilterChange({ locationIds })}
                  isExpanded={sectionsExpanded.locations}
                  onToggle={() => toggleSection('locations')}
                  isAuthenticated={isAuthenticated}
                />
                
                {/* Date Range Filter - Temporarily removed */}
                {/* <DateRangeFilterSection
                  dateFrom={filters.dateFrom}
                  dateTo={filters.dateTo}
                  onDateChange={(dateFrom, dateTo) => handleFilterChange({ dateFrom, dateTo })}
                  isExpanded={sectionsExpanded.dateRange}
                  onToggle={() => toggleSection('dateRange')}
                /> */}
              </div>
            </div>
          </div>
          
          {/* Right Main Area - Flexible width */}
          <div className="flex-1 min-w-0">
            {/* Active Filters Display */}
            {activeFilterCount > 0 && (
              <ActiveFiltersDisplay
                filters={filters}
                onRemove={removeFilter}
                onClearAll={clearAllFilters}
              />
            )}
            
            {/* Results Count */}
            {!loading && results.totalPhotos > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700">
                  {t('search.results', 'Results')} ({results.totalPhotos} {t('search.photos', 'photos')})
                </h3>
              </div>
            )}
            
            {/* Search Results */}
            <SearchResults
              results={results}
              query={query}
              loading={loading}
              error={error}
              onLoadMore={handleLoadMore}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
