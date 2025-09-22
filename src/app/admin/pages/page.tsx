'use client'

import { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Page, PageCreate } from '@/lib/models/Page'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

// Dynamic imports for heavy components
const PageList = dynamic(() => import('@/components/admin/Pages/PageList'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />
})

const PageFilters = dynamic(() => import('@/components/admin/Pages/PageFilters'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-16 rounded-lg" />
})

const PageDialogs = dynamic(() => import('@/components/admin/Pages/PageDialogs'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded-lg" />
})

export default function PagesManagement() {
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

        {/* Filters */}
        <Suspense fallback={<div className="animate-pulse bg-gray-200 h-16 rounded-lg mb-6" />}>
          <PageFilters
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            filterPublished={filterPublished}
            setFilterPublished={setFilterPublished}
          />
        </Suspense>

        {/* Pages List */}
        <Suspense fallback={<div className="animate-pulse bg-gray-200 h-64 rounded-lg" />}>
          <PageList
            pages={pages}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
          />
        </Suspense>

        {/* Dialogs */}
        <Suspense fallback={<div className="animate-pulse bg-gray-200 h-32 rounded-lg" />}>
          <PageDialogs
            isCreateDialogOpen={isCreateDialogOpen}
            setIsCreateDialogOpen={setIsCreateDialogOpen}
            isEditDialogOpen={isEditDialogOpen}
            setIsEditDialogOpen={setIsEditDialogOpen}
            editingPage={editingPage}
            isDeleteDialogOpen={isDeleteDialogOpen}
            setIsDeleteDialogOpen={setIsDeleteDialogOpen}
            pageToDelete={pageToDelete}
            setPageToDelete={setPageToDelete}
            formData={formData}
            setFormData={setFormData}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </Suspense>
      </div>
    </div>
  )
}
