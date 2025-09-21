'use client'

import { useState, useEffect } from 'react'
import { useActiveTemplate } from '@/hooks/useTemplate'
import { templateService } from '@/services/template'

interface DynamicTemplateLoaderProps {
  pageName: 'home' | 'gallery' | 'album' | 'login'
  fallback?: React.ReactNode
}

export default function DynamicTemplateLoader({ 
  pageName, 
  fallback 
}: DynamicTemplateLoaderProps) {
  const { template, loading: templateLoading, error: templateError } = useActiveTemplate()
  const [PageComponent, setPageComponent] = useState<React.ComponentType | null>(null)
  const [componentLoading, setComponentLoading] = useState(false)
  const [componentError, setComponentError] = useState<string | null>(null)

  useEffect(() => {
    const loadTemplatePage = async () => {
      if (!template) return

      try {
        setComponentLoading(true)
        setComponentError(null)

        // Get the page component from the active template
        const pageComponent = await templateService.getTemplatePage(template.templateName, pageName)
        
        if (pageComponent) {
          setPageComponent(() => pageComponent)
        } else {
          setComponentError(`Page component not found for template: ${template.templateName}`)
        }
      } catch (error) {
        console.error('Error loading template page:', error)
        setComponentError('Failed to load template page')
      } finally {
        setComponentLoading(false)
      }
    }

    loadTemplatePage()
  }, [template, pageName])

  // Show loading state
  if (templateLoading || componentLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading template...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (templateError || componentError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Template Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  {templateError || componentError}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If no template is loaded, show fallback
  if (!template || !PageComponent) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">No template loaded</h1>
          <p className="mt-2 text-gray-600">Please configure a template in the admin panel.</p>
        </div>
      </div>
    )
  }

  // Render the template's page component
  return <PageComponent />
}
