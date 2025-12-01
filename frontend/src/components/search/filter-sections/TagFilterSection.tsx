'use client'

import { useState, useEffect, useMemo } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import { Input } from '@/components/ui/input'
import { ChevronDown, ChevronUp, Tag } from '@/lib/icons'

interface TagItem {
  _id: string
  name: string | { en?: string; he?: string }
}

interface TagFilterSectionProps {
  selectedTags: string[]
  onSelect: (tags: string[]) => void
  isExpanded: boolean
  onToggle: () => void
  isAuthenticated?: boolean
}

export function TagFilterSection({
  selectedTags,
  onSelect,
  isExpanded,
  onToggle,
  isAuthenticated = false
}: TagFilterSectionProps) {
  const { t } = useI18n()
  const { currentLanguage } = useLanguage()
  const [tags, setTags] = useState<TagItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Load tags
  useEffect(() => {
    const loadTags = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/tags?limit=1000')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setTags(data.data || [])
          }
        }
      } catch (error) {
        console.error('Failed to load tags:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadTags()
  }, [])
  
  // Filter tags based on search query
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags
    
    const searchLower = searchQuery.toLowerCase()
    return tags.filter(tag => {
      const name = typeof tag.name === 'string' 
        ? tag.name 
        : MultiLangUtils.getTextValue(tag.name, currentLanguage)
      return name.toLowerCase().includes(searchLower)
    })
  }, [tags, searchQuery, currentLanguage])
  
  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onSelect(selectedTags.filter(id => id !== tagId))
    } else {
      onSelect([...selectedTags, tagId])
    }
  }
  
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">
            {t('search.tags', 'Tags')}
          </span>
          {selectedTags.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {selectedTags.length}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Search Input */}
          <div className="relative">
            <Input
              type="text"
              placeholder={t('search.filterTags', 'Filter tags...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm pl-8"
            />
            <svg
              className="absolute left-2.5 top-2 h-3 w-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          
          {/* Tags List */}
          {loading ? (
            <div className="py-4 text-center text-sm text-gray-500">
              {t('search.loading', 'Loading...')}
            </div>
          ) : filteredTags.length > 0 ? (
            <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
              {filteredTags.map(tag => {
                const name = typeof tag.name === 'string' 
                  ? tag.name 
                  : MultiLangUtils.getTextValue(tag.name, currentLanguage)
                const isSelected = selectedTags.includes(tag._id)
                
                return (
                  <button
                    key={tag._id}
                    onClick={() => toggleTag(tag._id)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                      ${isSelected
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {name}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-gray-500">
              {t('search.noTagsFound', 'No tags found')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
