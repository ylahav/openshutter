'use client'

import { useState, useEffect } from 'react'
import { Page, PageCreate, PageUpdate } from '@/lib/models/Page'
import { MultiLangInput } from '@/components/MultiLangInput'
import MultiLangHTMLEditor from '@/components/MultiLangHTMLEditor'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'

export default function PagesManagement() {
  const { currentLanguage } = useLanguage()
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPage, setEditingPage] = useState<Page | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterPublished, setFilterPublished] = useState<string>('all')

  // Form state
  const [formData, setFormData] = useState<PageCreate>({
    title: { en: '' },
    subtitle: { en: '' },
    alias: '',
    leadingImage: '',
    introText: { en: '' },
    content: { en: '' },
    category: 'site',
    isPublished: false
  })

  useEffect(() => {
    fetchPages()
  }, [])

  const fetchPages = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterCategory !== 'all') params.append('category', filterCategory)
      if (filterPublished !== 'all') params.append('published', filterPublished)

      const response = await fetch(`/api/admin/pages?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setPages(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching pages:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPages()
  }, [filterCategory, filterPublished])

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setPages([data.data, ...pages])
          setIsCreateDialogOpen(false)
          resetForm()
        } else {
          alert(data.error || 'Failed to create page')
        }
      }
    } catch (error) {
      console.error('Error creating page:', error)
      alert('Failed to create page')
    }
  }

  const handleUpdate = async () => {
    if (!editingPage) return

    try {
      const response = await fetch(`/api/admin/pages/${editingPage._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setPages(pages.map(p => p._id === editingPage._id ? data.data : p))
          setIsEditDialogOpen(false)
          setEditingPage(null)
          resetForm()
        } else {
          alert(data.error || 'Failed to update page')
        }
      }
    } catch (error) {
      console.error('Error updating page:', error)
      alert('Failed to update page')
    }
  }

  const handleDelete = async () => {
    if (!pageToDelete) return

    try {
      const response = await fetch(`/api/admin/pages/${pageToDelete._id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setPages(pages.filter(p => p._id !== pageToDelete._id))
          setIsDeleteDialogOpen(false)
          setPageToDelete(null)
        } else {
          alert(data.error || 'Failed to delete page')
        }
      }
    } catch (error) {
      console.error('Error deleting page:', error)
      alert('Failed to delete page')
    }
  }

  const resetForm = () => {
    setFormData({
      title: { en: '' },
      subtitle: { en: '' },
      alias: '',
      leadingImage: '',
      introText: { en: '' },
      content: { en: '' },
      category: 'site',
      isPublished: false
    })
  }

  const openEditDialog = (page: Page) => {
    setEditingPage(page)
    setFormData({
      title: page.title,
      subtitle: page.subtitle || { en: '' },
      alias: page.alias,
      leadingImage: page.leadingImage || '',
      introText: page.introText || { en: '' },
      content: page.content || { en: '' },
      category: page.category,
      isPublished: page.isPublished
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (page: Page) => {
    setPageToDelete(page)
    setIsDeleteDialogOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return <div className="p-6">Loading pages...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pages Management</h1>
              <p className="mt-2 text-gray-600">
                Create and manage internal pages like About Us, Our Story, etc.
              </p>
            </div>
            <div className="flex space-x-3">
              <Button 
                onClick={() => { resetForm(); setIsCreateDialogOpen(true) }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Page
              </Button>
              <Button 
                onClick={() => window.history.back()}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Admin
              </Button>
            </div>
          </div>
        </div>

        {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-7xl w-[98vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
          </DialogHeader>
          <PageForm 
            formData={formData} 
            setFormData={setFormData} 
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
            submitText="Create Page"
          />
        </DialogContent>
        </Dialog>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Label htmlFor="category-filter">Category:</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="site">Site</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="published-filter">Status:</Label>
            <Select value={filterPublished} onValueChange={setFilterPublished}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Published</SelectItem>
                <SelectItem value="false">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Pages List */}
        <div className="grid gap-4">
          {pages.map((page) => (
            <Card key={page._id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {MultiLangUtils.getTextValue(page.title, currentLanguage)}
                    </CardTitle>
                    <div className="text-sm text-gray-500 mt-1">
                      /{page.alias}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={page.category === 'system' ? 'default' : 'secondary'}>
                        {page.category}
                      </Badge>
                      <Badge variant={page.isPublished ? 'default' : 'outline'}>
                        {page.isPublished ? (
                          <>
                            <Eye className="w-3 h-3 mr-1" />
                            Published
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 mr-1" />
                            Draft
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(page)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(page)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  <p>Created: {formatDate(page.createdAt)}</p>
                  <p>Updated: {formatDate(page.updatedAt)}</p>
                  {page.subtitle && (
                    <p className="mt-2">
                      {MultiLangUtils.getTextValue(page.subtitle, currentLanguage)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-7xl w-[98vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Page</DialogTitle>
            </DialogHeader>
            <PageForm 
              formData={formData} 
              setFormData={setFormData} 
              onSubmit={handleUpdate}
              onCancel={() => setIsEditDialogOpen(false)}
              submitText="Update Page"
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          title="Delete Page"
          message={`Are you sure you want to delete "${pageToDelete ? MultiLangUtils.getTextValue(pageToDelete.title, currentLanguage) : ''}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => {
            setIsDeleteDialogOpen(false)
            setPageToDelete(null)
          }}
        />
      </div>
    </div>
  )
}

interface PageFormProps {
  formData: PageCreate
  setFormData: (data: PageCreate) => void
  onSubmit: () => void
  onCancel: () => void
  submitText: string
}

function PageForm({ formData, setFormData, onSubmit, onCancel, submitText }: PageFormProps) {
  const { currentLanguage } = useLanguage()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 p-6">
      {/* Title and Alias */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <MultiLangInput
            value={formData.title}
            onChange={(value) => setFormData({ ...formData, title: value })}
            placeholder="Page title"
            className="text-gray-900"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="alias">Alias/Slug *</Label>
          <Input
            id="alias"
            value={formData.alias}
            onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
            placeholder="page-alias"
            className="text-gray-900"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subtitle">Subtitle</Label>
        <MultiLangInput
          value={formData.subtitle || { en: '' }}
          onChange={(value) => setFormData({ ...formData, subtitle: value })}
          placeholder="Page subtitle (optional)"
          className="text-gray-900"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select 
            value={formData.category} 
            onValueChange={(value: 'system' | 'site') => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger className="text-gray-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="site">Site</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="leadingImage">Leading Image</Label>
          <Input
            id="leadingImage"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                // For now, we'll use a placeholder URL. In a real app, you'd upload to a server
                const url = URL.createObjectURL(file)
                setFormData({ ...formData, leadingImage: url })
              }
            }}
            className="text-gray-900"
          />
          {formData.leadingImage && (
            <div className="mt-2">
              <img 
                src={formData.leadingImage} 
                alt="Preview" 
                className="w-32 h-20 object-cover rounded border"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border">
        <Switch
          id="isPublished"
          checked={formData.isPublished}
          onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
        />
        <Label htmlFor="isPublished" className="text-sm font-medium text-gray-700">
          Published
        </Label>
        <span className="text-xs text-gray-500">
          {formData.isPublished ? 'This page will be visible to visitors' : 'This page will be saved as draft'}
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="introText">Intro Text</Label>
        <MultiLangHTMLEditor
          value={formData.introText || { en: '' }}
          onChange={(value) => setFormData({ ...formData, introText: value })}
          placeholder="Introduction text (optional)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <MultiLangHTMLEditor
          value={formData.content || { en: '' }}
          onChange={(value) => setFormData({ ...formData, content: value })}
          placeholder="Main content"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="px-6"
        >
          Cancel
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 px-6">
          {submitText}
        </Button>
      </div>
    </form>
  )
}
