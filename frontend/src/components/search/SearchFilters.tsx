'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, X } from '@/lib/icons'
import { format } from 'date-fns'

interface SearchFiltersProps {
  filters: {
    tags: string[]
    albumId: string | null
    dateFrom: string
    dateTo: string
    storageProvider: string
    isPublic: string
    mine: boolean
  }
  onFilterChange: (filters: any) => void
  type: 'all' | 'photos' | 'albums' | 'people' | 'locations'
  onTypeChange: (type: 'all' | 'photos' | 'albums' | 'people' | 'locations') => void
  sortBy: 'relevance' | 'date' | 'filename' | 'size'
  sortOrder: 'asc' | 'desc'
  onSortChange: (sortBy: 'relevance' | 'date' | 'filename' | 'size', sortOrder: 'asc' | 'desc') => void
}

export function SearchFilters({
  filters,
  onFilterChange,
  type,
  onTypeChange,
  sortBy,
  sortOrder,
  onSortChange
}: SearchFiltersProps) {
  const { t } = useI18n()
  const { currentLanguage } = useLanguage()
  const [availableTags, setAvailableTags] = useState<Array<string | {en?: string, he?: string}>>([])
  const [availableAlbums, setAvailableAlbums] = useState<Array<{_id: string, name: string | {en?: string, he?: string}}>>([])
  const [tagInput, setTagInput] = useState('')
  const [dateFromOpen, setDateFromOpen] = useState(false)
  const [dateToOpen, setDateToOpen] = useState(false)
  
  // Load available tags and albums
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        // Load tags
        const tagsResponse = await fetch('/api/tags')
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json()
          if (tagsData.success) {
            setAvailableTags(tagsData.data)
          }
        }
        
        // Load albums
        const albumsResponse = await fetch('/api/albums')
        if (albumsResponse.ok) {
          const albumsData = await albumsResponse.json()
          if (albumsData.success) {
            setAvailableAlbums(albumsData.data)
          }
        }
      } catch (error) {
        console.error('Failed to load filter data:', error)
      }
    }
    
    loadFilterData()
  }, [])
  
  const handleTagAdd = () => {
    if (tagInput.trim() && !filters.tags.includes(tagInput.trim())) {
      onFilterChange({
        ...filters,
        tags: [...filters.tags, tagInput.trim()]
      })
      setTagInput('')
    }
  }
  
  const handleTagRemove = (tagToRemove: string) => {
    onFilterChange({
      ...filters,
      tags: filters.tags.filter(tag => tag !== tagToRemove)
    })
  }
  
  const handleDateChange = (field: 'dateFrom' | 'dateTo', date: Date | undefined) => {
    onFilterChange({
      ...filters,
      [field]: date ? format(date, 'yyyy-MM-dd') : ''
    })
  }
  
  const clearFilters = () => {
    onFilterChange({
      tags: [],
      albumId: '',
      dateFrom: '',
      dateTo: '',
      storageProvider: '',
      isPublic: '',
      mine: false
    })
  }
  
  const hasActiveFilters = Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : value !== '' && value !== false
  )
  
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">
          {t('search.filters', 'Filters')}
        </h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 text-xs text-gray-600 hover:text-gray-800"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>
      
      <div className="space-y-4">
        {/* Search Type - Simplified */}
        <div>
          <Label className="text-xs font-medium text-gray-700 mb-1.5 block">
            {t('search.searchType', 'Type')}
          </Label>
          <Select value={type} onValueChange={onTypeChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white text-foreground border shadow-md">
              <SelectItem value="all">{t('search.all', 'All')}</SelectItem>
              <SelectItem value="photos">{t('search.photos', 'Photos')}</SelectItem>
              <SelectItem value="albums">{t('search.albums', 'Albums')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Album Filter - Simplified */}
        <div>
          <Label className="text-xs font-medium text-gray-700 mb-1.5 block">
            {t('search.album', 'Album')}
          </Label>
          <Select value={filters.albumId || 'all'} onValueChange={(value) => onFilterChange({...filters, albumId: value === 'all' ? undefined : value})}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={t('search.allAlbums', 'All Albums')} />
            </SelectTrigger>
            <SelectContent className="bg-white text-foreground border shadow-md">
              <SelectItem value="all">{t('search.allAlbums', 'All Albums')}</SelectItem>
              {availableAlbums
                .filter(album => album && album._id && String(album._id).trim() !== '')
                .slice(0, 20) // Limit to 20 albums for simplicity
                .map((album) => {
                  const albumId = String(album._id).trim()
                  if (!albumId) return null
                  return (
                    <SelectItem key={album._id} value={albumId}>
                      {typeof album.name === 'string' 
                        ? (album.name || 'Unnamed Album') 
                        : (MultiLangUtils.getTextValue(album.name as any, currentLanguage) || 'Unnamed Album')}
                    </SelectItem>
                  )
                })
                .filter(Boolean)}
            </SelectContent>
          </Select>
        </div>
        
        {/* Sort - Simplified */}
        <div>
          <Label className="text-xs font-medium text-gray-700 mb-1.5 block">
            {t('search.sortBy', 'Sort By')}
          </Label>
          <div className="space-y-2">
            <Select value={sortBy} onValueChange={(value) => onSortChange(value as any, sortOrder)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white text-foreground border shadow-md">
                <SelectItem value="relevance">{t('search.relevance', 'Relevance')}</SelectItem>
                <SelectItem value="date">{t('search.date', 'Date')}</SelectItem>
                <SelectItem value="filename">{t('search.filename', 'Filename')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(value) => onSortChange(sortBy, value as 'asc' | 'desc')}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white text-foreground border shadow-md">
                <SelectItem value="desc">{t('search.descending', 'Newest First')}</SelectItem>
                <SelectItem value="asc">{t('search.ascending', 'Oldest First')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
      </div>
    </div>
  )
}
