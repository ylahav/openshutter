'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import Link from 'next/link'
import { BlogCategory, ApiResponse, PaginatedResponse } from '@/types'
import { useRouter, useSearchParams } from 'next/navigation'
import AdminGuard from '@/components/AdminGuard'

function AdminBlogCategoriesContent() {
  const { t } = useI18n()
  const { isRTL, currentLanguage } = useLanguage()
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [isActiveFilter, setIsActiveFilter] = useState(searchParams.get('isActive') || '')
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'))
  const [totalPages, setTotalPages] = useState(1)

  const fetchCategories = useCallback(async () => {
    if (!session?.user) return

    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (isActiveFilter) params.set('isActive', isActiveFilter)
    params.set('page', page.toString())
    params.set('limit', '10')

    try {
      const response = await fetch(`/api/admin/blog-categories?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch categories')
      }

      const data = await response.json()
      if (data?.success) {
        const categoriesData: BlogCategory[] = Array.isArray(data.data)
          ? data.data
          : (data.data?.data || [])
        const pagination = data.pagination || data.data?.pagination
        setCategories(categoriesData || [])
        setTotalPages(pagination?.totalPages || 1)
      } else {
        setCategories([])
        setTotalPages(1)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [session, searchQuery, isActiveFilter, page])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    if (searchQuery) {
      current.set('q', searchQuery)
    } else {
      current.delete('q')
    }
    if (isActiveFilter) {
      current.set('isActive', isActiveFilter)
    } else {
      current.delete('isActive')
    }
    current.set('page', page.toString())
    router.push(`?${current.toString()}`)
  }, [searchQuery, isActiveFilter, page, router, searchParams])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setPage(1)
  }

  const handleActiveFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIsActiveFilter(e.target.value)
    setPage(1)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handleAction = async (categoryId: string, action: 'toggle-active' | 'delete') => {
    if (!session?.user) return

    if (action === 'delete') {
      if (!confirm(t('admin.confirmDeleteCategory'))) {
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      let response: Response | undefined
      if (action === 'delete') {
        response = await fetch(`/api/admin/blog-categories/${categoryId}`, { method: 'DELETE' })
      } else {
        // Toggle active status
        const category = (categories || []).find(c => c._id === categoryId)
        if (category) {
          response = await fetch(`/api/admin/blog-categories/${categoryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: !category.isActive })
          })
        }
      }

      if (!response || !response.ok) {
        const errorData = response ? await response.json() : { error: 'No response received' }
        throw new Error(errorData.error || `Failed to ${action} category`)
      }

      fetchCategories() // Re-fetch categories to update the list
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} category`)
    } finally {
      setLoading(false)
    }
  }

  const getArrowPath = () => isRTL ? "M10 19l-7-7m0 0l7-7m-7 7h18" : "M14 5l7 7-7 7M21 12H3"

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('admin.blogCategories')}</h1>
              <p className="text-gray-600 mt-2">{t('admin.manageBlogCategories')}</p>
            </div>
            <div className="flex space-x-3">
              <Link
                href="/admin"
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t('admin.backToDashboard')}
              </Link>
              <Link
                href="/admin/blog-categories/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('admin.createNewCategory')}
              </Link>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('admin.searchCategories')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.search')}
                </label>
                <input
                  type="text"
                  id="search"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('admin.searchPlaceholder')}
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </div>
              <div>
                <label htmlFor="isActive" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.status')}
                </label>
                <select
                  id="isActive"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={isActiveFilter}
                  onChange={handleActiveFilterChange}
                >
                  <option value="">{t('admin.allStatuses')}</option>
                  <option value="true">{t('admin.active')}</option>
                  <option value="false">{t('admin.inactive')}</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">{t('loading.loading')}</p>
            </div>
          ) : !categories || categories.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-lg shadow-md">
              <p className="text-gray-600 text-lg">{t('admin.noCategories')}</p>
              <p className="text-gray-500 mt-2">{t('admin.getStartedByCreatingCategory')}</p>
              <Link
                href="/admin/blog-categories/new"
                className="mt-6 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('admin.createNewCategory')}
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.title')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.alias')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.status')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.sortOrder')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.created')}
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">{t('admin.actions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(categories || []).map((category) => (
                    <tr key={category._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {category.leadingImage?.url && (
                            <div className="flex-shrink-0 h-10 w-10">
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={category.leadingImage.url}
                                alt={MultiLangUtils.getTextValue(category.leadingImage.alt, currentLanguage) || ''}
                              />
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {MultiLangUtils.getTextValue(category.title, currentLanguage)}
                            </div>
                            {category.description && (
                              <div className="text-sm text-gray-500">
                                {MultiLangUtils.getTextValue(category.description, currentLanguage)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{category.alias}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          category.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {category.isActive ? t('admin.active') : t('admin.inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {category.sortOrder}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(category.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/admin/blog-categories/${category._id}/edit`} className="text-indigo-600 hover:text-indigo-900 mr-4">
                          {t('admin.edit')}
                        </Link>
                        <button
                          onClick={() => handleAction(category._id!, 'toggle-active')}
                          className={`mr-4 ${category.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
                        >
                          {category.isActive ? t('admin.deactivate') : t('admin.activate')}
                        </button>
                        <button
                          onClick={() => handleAction(category._id!, 'delete')}
                          className="text-red-600 hover:text-red-900"
                        >
                          {t('admin.delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav
                  className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6"
                  aria-label="Pagination"
                >
                  <div className="flex-1 flex justify-between sm:justify-end">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('pagination.previous')}
                    </button>
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('pagination.next')}
                    </button>
                  </div>
                </nav>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  )
}

export default function AdminBlogCategoriesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AdminBlogCategoriesContent />
    </Suspense>
  )
}
