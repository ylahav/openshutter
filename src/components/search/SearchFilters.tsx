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
import { CalendarIcon, X } from 'lucide-react'
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
  type: 'all' | 'photos' | 'albums' | 'people'
  onTypeChange: (type: 'all' | 'photos' | 'albums' | 'people') => void
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
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('search.filters', 'Filters')}
        </h3>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="text-gray-600 hover:text-gray-800"
          >
            <X className="h-4 w-4 mr-1" />
            {t('search.clearFilters', 'Clear')}
          </Button>
        )}
      </div>
      
      <div className="space-y-6">
        {/* Search Type */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            {t('search.searchType', 'Search Type')}
          </Label>
          <Select value={type} onValueChange={onTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('search.all', 'All')}</SelectItem>
              <SelectItem value="photos">{t('search.photos', 'Photos')}</SelectItem>
              <SelectItem value="albums">{t('search.albums', 'Albums')}</SelectItem>
              <SelectItem value="people">{t('search.people', 'People')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Tags */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            {t('search.tags', 'Tags')}
          </Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder={t('search.addTag', 'Add tag...')}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleTagAdd())}
              />
              <Button type="button" onClick={handleTagAdd} size="sm">
                {t('search.add', 'Add')}
              </Button>
            </div>
            {filters.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filters.tags.map((tag) => (
                  <span
                    key={String(tag)}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {typeof tag === 'string' ? tag : (MultiLangUtils.getTextValue(tag as any, currentLanguage) || '')}
                    <button
                      onClick={() => handleTagRemove(tag)}
                      className="ml-1 hover:text-blue-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Album Filter */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            {t('search.album', 'Album')}
          </Label>
          <Select value={filters.albumId || 'all'} onValueChange={(value) => onFilterChange({...filters, albumId: value === 'all' ? undefined : value})}>
            <SelectTrigger>
              <SelectValue placeholder={t('search.selectAlbum', 'Select album...')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('search.allAlbums', 'All Albums')}</SelectItem>
              {availableAlbums
                .filter(album => album && album._id && String(album._id).trim() !== '')
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
        
        {/* Date Range */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            {t('search.dateRange', 'Date Range')}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateFrom ? format(new Date(filters.dateFrom), 'MMM dd, yyyy') : t('search.from', 'From')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                    onSelect={(date) => handleDateChange('dateFrom', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateTo ? format(new Date(filters.dateTo), 'MMM dd, yyyy') : t('search.to', 'To')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
                    onSelect={(date) => handleDateChange('dateTo', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        
        {/* Storage Provider */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            {t('search.storageProvider', 'Storage Provider')}
          </Label>
          <Select value={filters.storageProvider || 'all'} onValueChange={(value) => onFilterChange({...filters, storageProvider: value === 'all' ? undefined : value})}>
            <SelectTrigger>
              <SelectValue placeholder={t('search.selectProvider', 'Select provider...')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('search.allProviders', 'All Providers')}</SelectItem>
              <SelectItem value="google-drive">Google Drive</SelectItem>
              <SelectItem value="aws-s3">AWS S3</SelectItem>
              <SelectItem value="local">Local Storage</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Visibility */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            {t('search.visibility', 'Visibility')}
          </Label>
          <Select value={filters.isPublic !== undefined ? String(filters.isPublic) : 'all'} onValueChange={(value) => onFilterChange({...filters, isPublic: value === 'all' ? undefined : value === 'true'})}>
            <SelectTrigger>
              <SelectValue placeholder={t('search.selectVisibility', 'Select visibility...')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('search.allVisibility', 'All')}</SelectItem>
              <SelectItem value="true">{t('search.public', 'Public')}</SelectItem>
              <SelectItem value="false">{t('search.private', 'Private')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* My Content */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="mine"
            checked={filters.mine}
            onCheckedChange={(checked) => onFilterChange({...filters, mine: !!checked})}
          />
          <Label htmlFor="mine" className="text-sm font-medium text-gray-700">
            {t('search.myContent', 'My content only')}
          </Label>
        </div>
        
        {/* Sort Options */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            {t('search.sortBy', 'Sort By')}
          </Label>
          <div className="space-y-2">
            <Select value={sortBy} onValueChange={(value) => onSortChange(value as 'relevance' | 'date' | 'filename' | 'size', sortOrder)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">{t('search.relevance', 'Relevance')}</SelectItem>
                <SelectItem value="date">{t('search.date', 'Date')}</SelectItem>
                <SelectItem value="filename">{t('search.filename', 'Filename')}</SelectItem>
                <SelectItem value="size">{t('search.size', 'Size')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(value) => onSortChange(sortBy, value as 'asc' | 'desc')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">{t('search.descending', 'Descending')}</SelectItem>
                <SelectItem value="asc">{t('search.ascending', 'Ascending')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}
