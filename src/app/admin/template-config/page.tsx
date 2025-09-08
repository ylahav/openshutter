'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminGuard from '@/components/AdminGuard'
import { useI18n } from '@/hooks/useI18n'
import { useTemplateConfig } from '@/hooks/useTemplateConfig'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { useActiveTemplate } from '@/hooks/useTemplate'
import { TemplateComponentVisibility } from '@/services/template-config'

export default function AdminTemplateConfigPage() {
  const { t } = useI18n()
  const { config, loading: configLoading } = useSiteConfig()
  const { template: activeTemplate, loading: templateLoading } = useActiveTemplate()
  const { visibility, loading: visibilityLoading, updateVisibility, resetToDefaults, error } = useTemplateConfig()
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [localVisibility, setLocalVisibility] = useState<TemplateComponentVisibility>({
    hero: true,
    languageSelector: true,
    authButtons: true,
    footerMenu: true,
    statistics: true,
    promotion: true
  })

  // Update local state when visibility changes
  useEffect(() => {
    if (visibility) {
      setLocalVisibility(visibility)
    }
  }, [visibility])

  const handleVisibilityChange = (component: keyof TemplateComponentVisibility, value: boolean) => {
    setLocalVisibility(prev => ({
      ...prev,
      [component]: value
    }))
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setMessage(null)

      // Update the site config with new visibility settings
      const response = await fetch('/api/admin/site-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template: {
            ...config?.template,
            activeTemplate: activeTemplate?.templateName || config?.template?.activeTemplate || 'default',
            componentVisibility: localVisibility
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save template configuration')
      }

      const result = await response.json()
      if (result.success) {
        setMessage('Template configuration saved successfully!')
        // Update the visibility in the hook
        await updateVisibility(localVisibility)
      } else {
        throw new Error(result.error || 'Failed to save template configuration')
      }
    } catch (error) {
      console.error('Error saving template configuration:', error)
      setMessage('Failed to save template configuration')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    try {
      setIsSaving(true)
      setMessage(null)

      const response = await fetch('/api/admin/site-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template: {
            ...config?.template,
            activeTemplate: activeTemplate?.templateName || config?.template?.activeTemplate || 'default',
            componentVisibility: undefined // Remove custom visibility settings
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to reset template configuration')
      }

      const result = await response.json()
      if (result.success) {
        setMessage('Template configuration reset to defaults!')
        await resetToDefaults()
      } else {
        throw new Error(result.error || 'Failed to reset template configuration')
      }
    } catch (error) {
      console.error('Error resetting template configuration:', error)
      setMessage('Failed to reset template configuration')
    } finally {
      setIsSaving(false)
    }
  }

  const componentLabels = {
    hero: 'Hero Section',
    languageSelector: 'Language Selector',
    authButtons: 'Login/Logout Buttons',
    footerMenu: 'Footer Menu',
    statistics: 'Statistics Section',
    promotion: 'Promotion Section'
  }

  const componentDescriptions = {
    hero: 'The main hero section displayed on the home page',
    languageSelector: 'Language selection dropdown in the header',
    authButtons: 'Login and logout buttons in the header',
    footerMenu: 'Footer menu and links at the bottom of pages',
    statistics: 'Statistics section showing album and photo counts below the albums grid',
    promotion: 'Promotion section with call-to-action buttons below the statistics'
  }

  if (configLoading || visibilityLoading || templateLoading) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminGuard>
    )
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Template Configuration</h1>
                  <p className="text-gray-600 mt-1">
                    Configure which components are visible in your template
                  </p>
                </div>
                <Link
                  href="/admin"
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Admin
                </Link>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {message && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-800">{message}</p>
                </div>
              )}

              {/* Current Template Info */}
              <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Current Template</h3>
                <p className="text-blue-800">
                  <span className="font-medium">Active Template:</span> {activeTemplate?.templateName || config?.template?.activeTemplate || 'default'}
                </p>
                <p className="text-blue-800 text-sm mt-1">
                  Configure which components should be visible in this template. Changes will apply immediately.
                </p>
              </div>

              {/* Component Visibility Settings */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Component Visibility</h3>
                
                {Object.entries(componentLabels).map(([component, label]) => (
                  <div key={component} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex-shrink-0">
                      <input
                        type="checkbox"
                        id={component}
                        checked={localVisibility[component as keyof TemplateComponentVisibility]}
                        onChange={(e) => handleVisibilityChange(
                          component as keyof TemplateComponentVisibility, 
                          e.target.checked
                        )}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor={component} className="text-sm font-medium text-gray-900 cursor-pointer">
                        {label}
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        {componentDescriptions[component as keyof typeof componentDescriptions]}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        localVisibility[component as keyof TemplateComponentVisibility]
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {localVisibility[component as keyof TemplateComponentVisibility] ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={handleReset}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset to Defaults
                </button>
                
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}
