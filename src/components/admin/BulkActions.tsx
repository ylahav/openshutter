'use client'

import { useState } from 'react'
import { Plus, X, Save, Trash2, Eye, EyeOff, Star, StarOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import CollectionPopup from '@/components/admin/CollectionPopup'

interface BulkActionsProps {
  selectedItems: string[]
  onBulkUpdate: (updates: {
    tags?: string[]
    people?: string[]
    location?: {
      name: string
      coordinates?: { latitude: number; longitude: number }
      address?: string
    }
    isPublished?: boolean
    isLeading?: boolean
  }) => Promise<void>
  onClearSelection: () => void
  itemType: 'photos' | 'albums'
}

export default function BulkActions({
  selectedItems,
  onBulkUpdate,
  onClearSelection,
  itemType
}: BulkActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Metadata states
  const [tags, setTags] = useState<string[]>([])
  const [people, setPeople] = useState<string[]>([])
  const [location, setLocation] = useState<{
    name: string
    coordinates?: { latitude: number; longitude: number }
    address?: string
  } | undefined>(undefined)
  const [isPublished, setIsPublished] = useState<boolean | undefined>(undefined)
  const [isLeading, setIsLeading] = useState<boolean | undefined>(undefined)
  
  // Popup states
  const [tagsPopupOpen, setTagsPopupOpen] = useState(false)
  const [peoplePopupOpen, setPeoplePopupOpen] = useState(false)
  const [locationsPopupOpen, setLocationsPopupOpen] = useState(false)

  const handleBulkUpdate = async () => {
    if (selectedItems.length === 0) return

    try {
      setLoading(true)
      setError(null)

      const updates: any = {}
      
      if (tags.length > 0) updates.tags = tags
      if (people.length > 0) updates.people = people
      if (location) updates.location = location
      if (isPublished !== undefined) updates.isPublished = isPublished
      if (isLeading !== undefined) updates.isLeading = isLeading

      await onBulkUpdate(updates)
      
      // Reset form
      setTags([])
      setPeople([])
      setLocation(undefined)
      setIsPublished(undefined)
      setIsLeading(undefined)
      setIsOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const removePerson = (personToRemove: string) => {
    setPeople(people.filter(person => person !== personToRemove))
  }

  if (selectedItems.length === 0) return null

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {selectedItems.length} {itemType} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={() => setIsOpen(!isOpen)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Bulk Actions
            </Button>
          </div>

          {isOpen && (
            <div className="space-y-4 border-t border-gray-200 pt-4">
              {/* Tags */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Tags</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTagsPopupOpen(true)}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-blue-100 text-blue-800 text-xs"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-2 w-2" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* People */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">People</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPeoplePopupOpen(true)}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {people.map((person, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-green-100 text-green-800 text-xs"
                    >
                      👤 {person}
                      <button
                        type="button"
                        onClick={() => removePerson(person)}
                        className="ml-1 text-green-600 hover:text-green-800"
                      >
                        <X className="h-2 w-2" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Location</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLocationsPopupOpen(true)}
                    className="text-purple-600 border-purple-200 hover:bg-purple-50"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                {location && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                    📍 {location.name}
                    <button
                      type="button"
                      onClick={() => setLocation(undefined)}
                      className="ml-1 text-purple-600 hover:text-purple-800"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </Badge>
                )}
              </div>

              {/* Status toggles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Published</label>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant={isPublished === true ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsPublished(isPublished === true ? undefined : true)}
                      className="text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Yes
                    </Button>
                    <Button
                      type="button"
                      variant={isPublished === false ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsPublished(isPublished === false ? undefined : false)}
                      className="text-xs"
                    >
                      <EyeOff className="h-3 w-3 mr-1" />
                      No
                    </Button>
                  </div>
                </div>

                {itemType === 'photos' && (
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Leading</label>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant={isLeading === true ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsLeading(isLeading === true ? undefined : true)}
                        className="text-xs"
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Yes
                      </Button>
                      <Button
                        type="button"
                        variant={isLeading === false ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsLeading(isLeading === false ? undefined : false)}
                        className="text-xs"
                      >
                        <StarOff className="h-3 w-3 mr-1" />
                        No
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Error message */}
              {error && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2 border-t border-gray-200">
                <Button
                  onClick={handleBulkUpdate}
                  disabled={loading}
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-3 w-3 mr-1" />
                  {loading ? 'Applying...' : 'Apply Changes'}
                </Button>
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Collection Popups */}
      <CollectionPopup
        isOpen={tagsPopupOpen}
        onClose={() => setTagsPopupOpen(false)}
        title="Select Tags"
        collectionType="tags"
        selectedItems={tags}
        onSelectionChange={setTags}
        searchPlaceholder="Search tags..."
      />

      <CollectionPopup
        isOpen={peoplePopupOpen}
        onClose={() => setPeoplePopupOpen(false)}
        title="Select People"
        collectionType="people"
        selectedItems={people}
        onSelectionChange={setPeople}
        searchPlaceholder="Search people..."
      />

      <CollectionPopup
        isOpen={locationsPopupOpen}
        onClose={() => setLocationsPopupOpen(false)}
        title="Select Location"
        collectionType="locations"
        selectedItems={location?.name ? [location.name] : []}
        onSelectionChange={(items) => {
          if (items.length > 0) {
            setLocation({ name: items[0] })
          } else {
            setLocation(undefined)
          }
        }}
        searchPlaceholder="Search locations..."
      />
    </>
  )
}
