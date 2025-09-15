'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils, MultiLangText, MultiLangHTML } from '@/types/multi-lang'
import Link from 'next/link'
import { BlogArticle } from '@/types'
import BlogHTMLEditor from '@/components/BlogHTMLEditor'
import BlogImageUpload from '@/components/BlogImageUpload'

interface BlogFormData {
  title: MultiLangText
  category: string
  tags: string[]
  content: MultiLangHTML
  excerpt: MultiLangText
  isPublished: boolean
  isFeatured: boolean
  leadingImage?: {
    url: string
    alt: MultiLangText
    storageProvider: string
    storagePath: string
  }
  seoTitle: MultiLangText
  seoDescription: MultiLangText
}

export default function CreateBlogArticlePage() {
  const { t } = useI18n()
  const { isRTL, currentLanguage } = useLanguage()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])

  const [formData, setFormData] = useState<BlogFormData>({
    title: { [currentLanguage]: '' },
    category: '',
    tags: [],
    content: { [currentLanguage]: '' },
    excerpt: { [currentLanguage]: '' },
    isPublished: false,
    isFeatured: false,
    seoTitle: { [currentLanguage]: '' },
    seoDescription: { [currentLanguage]: '' }
  })

  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/owner/blog')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const uniqueCategories = [...new Set(data.data.map((article: BlogArticle) => article.category))] as string[]
          setCategories(uniqueCategories)
        }
      }
    } catch (err) {
      console.error('Failed to load categories:', err)
    }
  }

  const handleInputChange = (field: keyof BlogFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleMultiLangInputChange = (field: keyof BlogFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: MultiLangUtils.setValue(prev[field] as MultiLangText, currentLanguage, value)
    }))
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Validate required fields
      if (!MultiLangUtils.getTextValue(formData.title, currentLanguage).trim()) {
        throw new Error(t('owner.titleRequired'))
      }
      if (!formData.category.trim()) {
        throw new Error(t('owner.categoryRequired'))
      }
      if (!MultiLangUtils.getTextValue(formData.content, currentLanguage).trim()) {
        throw new Error(t('owner.contentRequired'))
      }

      const response = await fetch('/api/owner/blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create article')
      }

      const data = await response.json()
      setSuccess(t('owner.articleCreatedSuccessfully'))
      
      // Reset form
      setFormData({
        title: { [currentLanguage]: '' },
        category: '',
        tags: [],
        content: { [currentLanguage]: '' },
        excerpt: { [currentLanguage]: '' },
        isPublished: false,
        isFeatured: false,
        seoTitle: { [currentLanguage]: '' },
        seoDescription: { [currentLanguage]: '' }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create article')
    } finally {
      setSaving(false)
    }
  }

  const getArrowPath = () => isRTL ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('owner.createNewArticle')}</h1>
            <p className="text-gray-600 mt-2">{t('owner.createArticleDescription')}</p>
          </div>
          <Link
            href="/owner/blog"
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('owner.backToBlog')}
          </Link>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
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
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('owner.basicInformation')}</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('owner.title')} *
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={MultiLangUtils.getTextValue(formData.title, currentLanguage)}
                    onChange={(e) => handleMultiLangInputChange('title', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('owner.enterArticleTitle')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('owner.category')} *
                    </label>
                    <input
                      type="text"
                      id="category"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      required
                      list="categories"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t('owner.enterCategory')}
                    />
                    <datalist id="categories">
                      {categories.map(category => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('owner.tags')}
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        id="tags"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder={t('owner.addTag')}
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        {t('owner.add')}
                      </button>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none focus:bg-blue-500 focus:text-white"
                            >
                              <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                                <path d="M6.564.75L5.25 2.064 3.936.75 3.25 1.436 4.564 2.75 3.25 4.064 3.936 4.75 5.25 3.436 6.564 4.75 7.25 4.064 5.936 2.75 7.25 1.436z" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Leading Image */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('owner.leadingImage')}</h3>
              <BlogImageUpload
                value={formData.leadingImage}
                onChange={(value) => handleInputChange('leadingImage', value)}
                storageProvider="local"
                className="w-full"
              />
            </div>

            {/* Content */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('owner.content')}</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('owner.excerpt')}
                  </label>
                  <textarea
                    id="excerpt"
                    rows={3}
                    value={MultiLangUtils.getTextValue(formData.excerpt, currentLanguage)}
                    onChange={(e) => handleMultiLangInputChange('excerpt', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('owner.enterExcerpt')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('owner.content')} *
                  </label>
                  <BlogHTMLEditor
                    value={formData.content}
                    onChange={(value) => handleInputChange('content', value)}
                    placeholder={t('owner.enterContent')}
                    className="w-full"
                  />
                  <p className="mt-1 text-sm text-gray-500">{t('owner.contentHelp')}</p>
                </div>
              </div>
            </div>

            {/* SEO */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('owner.seo')}</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="seoTitle" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('owner.seoTitle')}
                  </label>
                  <input
                    type="text"
                    id="seoTitle"
                    value={MultiLangUtils.getTextValue(formData.seoTitle, currentLanguage)}
                    onChange={(e) => handleMultiLangInputChange('seoTitle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('owner.enterSeoTitle')}
                  />
                </div>

                <div>
                  <label htmlFor="seoDescription" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('owner.seoDescription')}
                  </label>
                  <textarea
                    id="seoDescription"
                    rows={3}
                    value={MultiLangUtils.getTextValue(formData.seoDescription, currentLanguage)}
                    onChange={(e) => handleMultiLangInputChange('seoDescription', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('owner.enterSeoDescription')}
                  />
                </div>
              </div>
            </div>

            {/* Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('owner.settings')}</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublished"
                    checked={formData.isPublished}
                    onChange={(e) => handleInputChange('isPublished', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPublished" className="ml-2 block text-sm text-gray-900">
                    {t('owner.publishArticle')}
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={formData.isFeatured}
                    onChange={(e) => handleInputChange('isFeatured', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isFeatured" className="ml-2 block text-sm text-gray-900">
                    {t('owner.featureArticle')}
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('owner.creating')}
                  </>
                ) : (
                  t('owner.createArticle')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
