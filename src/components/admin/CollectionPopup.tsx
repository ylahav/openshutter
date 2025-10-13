'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface CollectionItem {
  _id: string
  name?: string
  fullName?: { en?: string; he?: string }
  firstName?: { en?: string; he?: string }
  lastName?: { en?: string; he?: string }
  description?: string | { en?: string; he?: string }
  address?: string
  color?: string
  category?: string
  [key: string]: any // Allow additional properties
}

interface CollectionPopupProps {
  isOpen: boolean
  onClose: () => void
  title: string
  collectionType: 'tags' | 'people' | 'locations'
  selectedItems: string[]
  onSelectionChange: (items: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
}

export default function CollectionPopup({
  isOpen,
  onClose,
  title,
  collectionType,
  selectedItems,
  onSelectionChange,
  placeholder = "Search and select items...",
  searchPlaceholder = "Search..."
}: CollectionPopupProps) {
  const { currentLanguage } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [items, setItems] = useState<CollectionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  // Fetch items from API
  const fetchItems = async (query: string = '') => {
    try {
      setLoading(true)
      setError(null)
      
      const endpoint = `/api/${collectionType}${query ? `?search=${encodeURIComponent(query)}` : ''}`
      const response = await fetch(endpoint)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${collectionType}`)
      }
      
      const result = await response.json()
      if (result.success) {
        setItems(result.data || [])
      } else {
        throw new Error(result.error || `Failed to fetch ${collectionType}`)
      }
    } catch (err) {
      console.error(`Error fetching ${collectionType}:`, err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Create new item
  const createItem = async () => {
    if (!newItemName.trim()) return

    try {
      setIsCreating(true)
      setError(null)

      let requestBody: any = {}

      if (collectionType === 'tags') {
        requestBody = {
          name: newItemName.trim(),
          color: '#3B82F6'
        }
      } else if (collectionType === 'people') {
        requestBody = {
          firstName: { en: newItemName.trim(), he: '' },
          lastName: { en: '', he: '' },
          fullName: { en: newItemName.trim(), he: '' }
        }
      } else if (collectionType === 'locations') {
        requestBody = {
          name: newItemName.trim()
        }
      } else {
        requestBody = {
          name: newItemName.trim()
        }
      }

      const response = await fetch(`/api/${collectionType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Failed to create ${collectionType.slice(0, -1)}`)
      }

      const result = await response.json()
      if (result.success) {
        // Refresh the list
        await fetchItems(searchQuery)
        setNewItemName('')
      } else {
        throw new Error(result.error || `Failed to create ${collectionType.slice(0, -1)}`)
      }
    } catch (err) {
      console.error(`Error creating ${collectionType.slice(0, -1)}:`, err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsCreating(false)
    }
  }

  // Handle item selection
  const toggleItem = (item: any) => {
    // Get the appropriate identifier based on collection type
    let identifier = ''
    
    if (collectionType === 'people') {
      const fullName = typeof item.fullName === 'string' 
        ? item.fullName 
        : MultiLangUtils.getTextValue(item.fullName || {}, currentLanguage)
      const firstName = typeof item.firstName === 'string' 
        ? item.firstName 
        : MultiLangUtils.getTextValue(item.firstName || {}, currentLanguage)
      identifier = String(fullName || firstName || '')
    } else if (collectionType === 'tags') {
      identifier = String(item.name || '')
    } else if (collectionType === 'locations') {
      identifier = String(item.name || '')
    } else {
      identifier = String(item.name || '')
    }
    
    if (Array.isArray(selectedItems) && selectedItems.includes(identifier)) {
      onSelectionChange(selectedItems.filter(id => id !== identifier))
    } else {
      onSelectionChange([...(Array.isArray(selectedItems) ? selectedItems : []), identifier])
    }
  }

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    fetchItems(query)
  }

  // Close popup on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  // Load items when popup opens
  useEffect(() => {
    if (isOpen) {
      fetchItems()
    }
  }, [isOpen])

  if (!isOpen) return null

  const filteredItems = items.filter(item => {
    // Handle different data structures for different collection types
    let name = ''
    let description = ''
    
    if (collectionType === 'people') {
      name = String(
        typeof item.fullName === 'string' 
          ? item.fullName 
          : MultiLangUtils.getTextValue(item.fullName || {}, currentLanguage) ||
            (typeof item.firstName === 'string' ? item.firstName : MultiLangUtils.getTextValue(item.firstName || {}, currentLanguage)) ||
            ''
      )
      description = String(
        typeof item.description === 'string' 
          ? item.description 
          : MultiLangUtils.getTextValue(item.description || {}, currentLanguage) || ''
      )
    } else if (collectionType === 'tags') {
      name = String(item.name || '')
      description = String(item.description || '')
    } else if (collectionType === 'locations') {
      name = String(item.name || '')
      description = String(item.description || item.address || '')
    } else {
      name = String(item.name || '')
      description = String(item.description || '')
    }
    
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (description && description.toLowerCase().includes(searchQuery.toLowerCase()))
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        ref={popupRef}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Search and Create */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Create new item */}
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder={`Create new ${collectionType.slice(0, -1)}...`}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createItem()}
              disabled={isCreating}
            />
            <Button
              onClick={createItem}
              disabled={!newItemName.trim() || isCreating}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-400">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <ScrollArea className="h-full">
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {searchQuery ? 'No items found matching your search.' : `No ${collectionType} available.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map((item) => {
                    // Get display name and description based on collection type
                    let displayName = ''
                    let displayDescription = ''
                    
                    if (collectionType === 'people') {
                      displayName = String(item.fullName?.en || item.fullName || item.firstName?.en || item.firstName || '')
                      displayDescription = String(
                        (typeof item.description === 'object' && item.description?.en) || 
                        item.description || 
                        ''
                      )
                    } else if (collectionType === 'tags') {
                      displayName = String(item.name || '')
                      displayDescription = String(item.description || '')
                    } else if (collectionType === 'locations') {
                      displayName = String(item.name || '')
                      displayDescription = String(item.description || item.address || '')
                    } else {
                      displayName = String(item.name || '')
                      displayDescription = String(item.description || '')
                    }
                    
                    return (
                      <div
                        key={item._id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          Array.isArray(selectedItems) && selectedItems.includes(displayName)
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                        onClick={() => toggleItem(item)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{displayName}</span>
                            {item.color && (
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                            )}
                          </div>
                          {displayDescription && (
                            <p className="text-sm text-gray-600 mt-1">{displayDescription}</p>
                          )}
                          {item.category && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {item.category}
                            </Badge>
                          )}
                        </div>
                        {Array.isArray(selectedItems) && selectedItems.includes(displayName) && (
                          <div className="text-blue-600">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {Array.isArray(selectedItems) ? selectedItems.length : 0} item{(Array.isArray(selectedItems) ? selectedItems.length : 0) !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
