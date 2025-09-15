'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils, MultiLangText } from '@/types/multi-lang'
import Link from 'next/link'
import { BlogCategory } from '@/types'
import BlogImageUpload from '@/components/BlogImageUpload'
import { useRouter } from 'next/navigation'
import AdminGuard from '@/components/AdminGuard'

interface BlogCategoryFormData {
  title: MultiLangText
  description: MultiLangText
  leadingImage?: BlogCategory['leadingImage']
  isActive: boolean
  sortOrder: number
}

export default function CreateEditBlogCategoryPage() {
  const { t } = useI18n()
  const { currentLanguage } = useLanguage()
  const { data: session } = useSession()
  const router = useRouter()

  const [formData, setFormData] = useState<BlogCategoryFormData>({
    title: { en: '', he: '' },
    description: { en: '', he: '' },
    isActive: true,
    sortOrder: 0
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleMultiLangInputChange = (field: keyof BlogCategoryFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: MultiLangUtils.setValue(prev[field] as MultiLangText, currentLanguage, value)
    }))
  }

  const handleInputChange = (field: keyof BlogCategoryFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    if (!MultiLangUtils.getTextValue(formData.title, currentLanguage)) {
      setError(t('admin.titleRequired'))
      setSaving(false)
      return
    }

    try {
      const response = await fetch('/api/admin/blog-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create category')
      }

      const data = await response.json()
      setSuccess(t('admin.categoryCreatedSuccessfully'))
      router.push('/admin/blog-categories')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('admin.createNewCategory')}
              </h1>
              <p className="text-gray-600 mt-2">
                {t('admin.createCategoryDescription')}
              </p>
            </div>
            <Link
              href="/admin/blog-categories"
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t('admin.backToCategories')}
            </Link>
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

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('admin.basicInformation')}</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.title')} *
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={MultiLangUtils.getTextValue(formData.title, currentLanguage)}
                    onChange={(e) => handleMultiLangInputChange('title', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('admin.enterCategoryTitle')}
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.description')}
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={MultiLangUtils.getTextValue(formData.description, currentLanguage)}
                    onChange={(e) => handleMultiLangInputChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('admin.enterCategoryDescription')}
                  />
                </div>
              </div>
            </div>

            {/* Leading Image */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('admin.leadingImage')}</h3>
              <BlogImageUpload
                value={formData.leadingImage}
                onChange={(value) => handleInputChange('leadingImage', value)}
                storageProvider="local"
                className="w-full"
              />
            </div>

            {/* Settings */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('admin.settings')}</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    id="isActive"
                    name="isActive"
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    {t('admin.active')}
                  </label>
                </div>
                <div>
                  <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.sortOrder')}
                  </label>
                  <input
                    type="number"
                    id="sortOrder"
                    value={formData.sortOrder}
                    onChange={(e) => handleInputChange('sortOrder', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                  <p className="mt-1 text-sm text-gray-500">{t('admin.sortOrderHelp')}</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('admin.saving')}
                  </>
                ) : (
                  t('admin.createCategory')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminGuard>
  )
}

