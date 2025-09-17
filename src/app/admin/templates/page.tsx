'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminGuard from '@/components/AdminGuard'
import { TemplateConfig } from '@/types/template'
import { useI18n } from '@/hooks/useI18n'

export default function AdminTemplatesPage() {
  const { t } = useI18n()
  const [templates, setTemplates] = useState<TemplateConfig[]>([])
  const [activeTemplate, setActiveTemplate] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/admin/templates')
        if (!response.ok) {
          throw new Error('Failed to fetch templates')
        }
        
        const result = await response.json()
        if (result.success) {
          setTemplates(result.data)
        } else {
          setError(result.error || 'Failed to fetch templates')
        }
      } catch (error) {
        console.error('Failed to fetch templates:', error)
        setError('Failed to fetch templates')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  useEffect(() => {
    const fetchSiteConfig = async () => {
      try {
        const response = await fetch('/api/admin/site-config')
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setActiveTemplate(result.data.template?.activeTemplate || 'default')
          }
        }
      } catch (error) {
        console.error('Failed to fetch site config:', error)
      }
    }

    fetchSiteConfig()
  }, [])

  const handleTemplateChange = async (templateName: string) => {
    try {
      setMessage(null)
      const response = await fetch('/api/admin/templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateName }),
      })

      if (!response.ok) {
        throw new Error('Failed to update template')
      }

      const result = await response.json()
      if (result.success) {
        setActiveTemplate(templateName)
        setMessage('Template updated successfully!')
        setTimeout(() => {
          setMessage(null)
        }, 3000)
      } else {
        setError(result.error || 'Failed to update template')
      }
    } catch (error) {
      console.error('Failed to update template:', error)
      setError('Failed to update template')
    }
  }

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">{t('admin.loadingTemplates')}</p>
            </div>
          </div>
        </div>
      </AdminGuard>
    )
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('admin.templateManagement')}</h1>
              <p className="mt-2 text-gray-600">
                {t('admin.templateManagementDescription')}
              </p>
            </div>
            <Link href="/admin" className="btn-secondary">
              {t('admin.backToAdmin')}
            </Link>
          </div>

          {/* Message Display */}
          {message && (
            <div className="mb-6 p-6 rounded-lg border-2 bg-green-50 text-green-800 border-green-300 shadow-lg">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-green-800">{t('admin.success')}</h3>
                  <p className="text-sm text-green-700">{message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-6 rounded-lg border-2 bg-red-50 text-red-800 border-red-300 shadow-lg">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-red-800">{t('admin.error')}</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template.templateName} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Template Preview */}
                <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200">
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `linear-gradient(45deg, ${template.colors.primary}20, ${template.colors.secondary}20)`
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-2 rounded-lg shadow-md" style={{ backgroundColor: template.colors.primary }}></div>
                      <div className="w-12 h-12 mx-auto mb-2 rounded-lg shadow-md" style={{ backgroundColor: template.colors.secondary }}></div>
                      <div className="w-8 h-8 mx-auto rounded-lg shadow-md" style={{ backgroundColor: template.colors.accent }}></div>
                    </div>
                  </div>
                  
                  {/* Active Badge */}
                  {activeTemplate === template.templateName && (
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {t('admin.active')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Template Info */}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {template.displayName}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-4">
                    {template.description}
                  </p>

                  {/* Template Features */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.features.responsive && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {t('admin.responsive')}
                      </span>
                    )}
                    {template.features.darkMode && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {t('admin.darkMode')}
                      </span>
                    )}
                    {template.features.animations && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {t('admin.animations')}
                      </span>
                    )}
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {template.category}
                    </span>
                  </div>

                  {/* Template Colors */}
                  <div className="flex gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300" style={{ backgroundColor: template.colors.primary }}></div>
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300" style={{ backgroundColor: template.colors.secondary }}></div>
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300" style={{ backgroundColor: template.colors.accent }}></div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    {activeTemplate === template.templateName ? (
                      <>
                        <button
                          disabled
                          className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-md cursor-not-allowed"
                        >
                          {t('admin.active')}
                        </button>
                        <Link
                          href="/admin/templates/customize"
                          className="flex-1 px-4 py-2 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-center"
                        >
                          {t('admin.customize')}
                        </Link>
                      </>
                    ) : (
                      <button
                        onClick={() => handleTemplateChange(template.templateName)}
                        className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {t('admin.activate')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {templates.length === 0 && !error && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t('admin.noTemplates')}</h3>
              <p className="mt-1 text-sm text-gray-500">{t('admin.noTemplatesAvailable')}</p>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  )
}
