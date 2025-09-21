'use client'

import { useActiveTemplate } from '@/hooks/useTemplate'
import { LanguageProvider } from '@/contexts/LanguageContext'

interface TemplateWrapperProps {
  pageName: 'home' | 'gallery' | 'album' | 'login'
  children?: React.ReactNode
  fallback?: React.ReactNode
}

export default function TemplateWrapper({ 
  pageName, 
  children, 
  fallback 
}: TemplateWrapperProps) {
  const { template, loading: templateLoading, error: templateError } = useActiveTemplate()

  // Show loading state
  if (templateLoading) {
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
  if (templateError) {
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
                <div className="mt-2 text-sm text-red-700">{templateError}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If no template is loaded, show fallback or children
  if (!template) {
    return fallback || children || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">No template loaded</h1>
          <p className="mt-2 text-gray-600">Please configure a template in the admin panel.</p>
        </div>
      </div>
    )
  }

  // Safe color/layout fallbacks
  const colors = {
    primary: template.colors?.primary || '#0ea5e9',
    secondary: template.colors?.secondary || '#64748b',
    accent: template.colors?.accent || '#22c55e',
    background: template.colors?.background || '#ffffff',
    text: template.colors?.text || '#0f172a',
    muted: template.colors?.muted || '#e5e7eb',
  }
  const layout = {
    maxWidth: template.layout?.maxWidth || '1200px',
    containerPadding: template.layout?.containerPadding || '1rem',
    gridGap: template.layout?.gridGap || '1rem',
  }

  // Apply template styles
  const templateStyles = {
    '--primary-color': colors.primary,
    '--secondary-color': colors.secondary,
    '--accent-color': colors.accent,
    '--background-color': colors.background,
    '--text-color': colors.text,
    '--muted-color': colors.muted,
    '--max-width': layout.maxWidth,
    '--container-padding': layout.containerPadding,
    '--grid-gap': layout.gridGap,
  } as React.CSSProperties

  return (
    <LanguageProvider>
      <div 
        className="min-h-screen"
        style={templateStyles}
      >
        {/* Apply template fonts */}
        <style jsx global>{`
          :root {
            --primary-color: ${colors.primary};
            --secondary-color: ${colors.secondary};
            --accent-color: ${colors.accent};
            --background-color: ${colors.background};
            --text-color: ${colors.text};
            --muted-color: ${colors.muted};
          }
          
          body {
            font-family: ${template.fonts?.body || 'Inter'}, sans-serif;
            background-color: ${colors.background};
            color: ${colors.text};
          }
          
          h1, h2, h3, h4, h5, h6 {
            font-family: ${template.fonts?.heading || 'Inter'}, sans-serif;
          }
        `}</style>
        
        {children}
      </div>
    </LanguageProvider>
  )
}
