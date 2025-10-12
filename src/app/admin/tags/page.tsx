'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/hooks/useI18n'
import AdminTemplate from '@/components/admin/AdminTemplate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Edit, Trash2, Tag, Palette } from 'lucide-react'

interface Tag {
  _id: string
  name: string | {en?: string, he?: string}
  description?: string | {en?: string, he?: string}
  color: string
  category: string
  isActive: boolean
  usageCount: number
  createdAt: string
  updatedAt: string
}

const TAG_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'location', label: 'Location' },
  { value: 'event', label: 'Event' },
  { value: 'object', label: 'Object' },
  { value: 'mood', label: 'Mood' },
  { value: 'technical', label: 'Technical' },
  { value: 'custom', label: 'Custom' }
]

const COLOR_PRESETS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
]

// Helper function to safely extract display name from multi-language object
const getDisplayName = (name: string | {en?: string, he?: string}): string => {
  if (typeof name === 'string') {
    return name
  }
  if (typeof name === 'object' && name && 'en' in name) {
    return (name as {en?: string, he?: string}).en || (name as {en?: string, he?: string}).he || ''
  }
  return ''
}

// Helper function to safely extract display description
const getDisplayDescription = (description?: string | {en?: string, he?: string}): string => {
  if (!description) return ''
  if (typeof description === 'string') {
    return description
  }
  if (typeof description === 'object' && description && 'en' in description) {
    return (description as {en?: string, he?: string}).en || (description as {en?: string, he?: string}).he || ''
  }
  return ''
}

export default function TagsManagementPage() {
  const { t } = useI18n()
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    category: 'general'
  })
  
  useEffect(() => {
    fetchTags()
  }, [searchTerm, categoryFilter])
  
  const fetchTags = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      
      const response = await fetch(`/api/tags?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch tags')
      }
      
      const data = await response.json()
      if (data.success) {
        setTags(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch tags')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  const handleCreate = async () => {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create tag')
      }
      
      const data = await response.json()
      if (data.success) {
        setTags([...tags, data.data])
        resetForm()
        setIsCreateDialogOpen(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag')
    }
  }
  
  const handleEdit = async () => {
    if (!editingTag) return
    
    try {
      const response = await fetch(`/api/tags/${editingTag._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update tag')
      }
      
      const data = await response.json()
      if (data.success) {
        setTags(tags.map(t => t._id === editingTag._id ? data.data : t))
        resetForm()
        setIsEditDialogOpen(false)
        setEditingTag(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tag')
    }
  }
  
  const handleDelete = async () => {
    if (!tagToDelete) return
    
    try {
      const response = await fetch(`/api/tags/${tagToDelete._id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete tag')
      }
      
      const data = await response.json()
      if (data.success) {
        setTags(tags.filter(t => t._id !== tagToDelete._id))
        setIsDeleteDialogOpen(false)
        setTagToDelete(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag')
    }
  }
  
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      category: 'general'
    })
  }
  
  const openEditDialog = (tag: Tag) => {
    setEditingTag(tag)
    setFormData({
      name: getDisplayName(tag.name),
      description: getDisplayDescription(tag.description),
      color: tag.color,
      category: tag.category
    })
    setIsEditDialogOpen(true)
  }
  
  const openDeleteDialog = (tag: Tag) => {
    setTagToDelete(tag)
    setIsDeleteDialogOpen(true)
  }
  
  return (
    <AdminTemplate 
      title="Tags Management"
      description="Manage tags for categorizing and organizing your photos"
    >
      
      {/* Search and Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {TAG_CATEGORIES.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tag
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Tag Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Nature, Wedding, Portrait"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of this tag..."
                />
              </div>
              
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAG_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="color">Color</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    className="w-16 h-10 p-1"
                  />
                  <div className="flex space-x-1">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFormData({...formData, color})}
                        className={`w-6 h-6 rounded border-2 ${
                          formData.color === color ? 'border-gray-800' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>
                  Create Tag
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      {/* Tags List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading tags...</p>
        </div>
      ) : tags.length === 0 ? (
        <div className="text-center py-8">
          <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No tags found</h3>
          <p className="text-gray-600">Start by adding your first tag.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tags.map((tag) => (
            <div key={tag._id} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <h3 className="font-semibold text-gray-900 truncate">{getDisplayName(tag.name)}</h3>
                </div>
                
                <div className="flex space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(tag)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeleteDialog(tag)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {tag.description && (
                <p className="text-sm text-gray-600 mb-2">{getDisplayDescription(tag.description)}</p>
              )}
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="px-2 py-1 bg-gray-100 rounded-full">
                  {TAG_CATEGORIES.find(c => c.value === tag.category)?.label || tag.category}
                </span>
                <span className="flex items-center">
                  <Palette className="h-3 w-3 mr-1" />
                  {tag.usageCount} uses
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editName">Tag Name *</Label>
              <Input
                id="editName"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="editDescription">Description</Label>
              <Input
                id="editDescription"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="editCategory">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAG_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="editColor">Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="editColor"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  className="w-16 h-10 p-1"
                />
                <div className="flex space-x-1">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData({...formData, color})}
                      className={`w-6 h-6 rounded border-2 ${
                        formData.color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit}>
                Update Tag
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete the tag <strong>"{tagToDelete ? getDisplayName(tagToDelete.name) : ''}"</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
              >
                Delete Tag
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminTemplate>
  )
}
