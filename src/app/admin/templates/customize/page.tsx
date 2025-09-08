'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminGuard from '@/components/AdminGuard'
import Header from '@/templates/default/components/Header'
import Footer from '@/templates/default/components/Footer'

interface TemplateCustomization {
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  typography: {
    fontFamily: string
    headingSize: string
    bodySize: string
  }
  layout: {
    headerStyle: string
    cardStyle: string
    spacing: string
  }
  effects: {
    animations: boolean
    shadows: boolean
    gradients: boolean
    glassMorphism: boolean
  }
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter (Modern)' },
  { value: 'Roboto', label: 'Roboto (Clean)' },
  { value: 'Poppins', label: 'Poppins (Friendly)' },
  { value: 'Open Sans', label: 'Open Sans (Readable)' },
  { value: 'Lato', label: 'Lato (Elegant)' },
  { value: 'Montserrat', label: 'Montserrat (Bold)' }
]

const COLOR_PRESETS = [
  {
    name: 'Ocean Blue',
    colors: {
      primary: '#0ea5e9',
      secondary: '#64748b',
      accent: '#06b6d4',
      background: '#ffffff',
      text: '#1e293b'
    }
  },
  {
    name: 'Forest Green',
    colors: {
      primary: '#059669',
      secondary: '#6b7280',
      accent: '#10b981',
      background: '#ffffff',
      text: '#1f2937'
    }
  },
  {
    name: 'Sunset Orange',
    colors: {
      primary: '#ea580c',
      secondary: '#78716c',
      accent: '#f97316',
      background: '#ffffff',
      text: '#292524'
    }
  },
  {
    name: 'Royal Purple',
    colors: {
      primary: '#7c3aed',
      secondary: '#6b7280',
      accent: '#8b5cf6',
      background: '#ffffff',
      text: '#1f2937'
    }
  },
  {
    name: 'Rose Pink',
    colors: {
      primary: '#e11d48',
      secondary: '#6b7280',
      accent: '#f43f5e',
      background: '#ffffff',
      text: '#1f2937'
    }
  }
]

export default function TemplateCustomizePage() {
  const [customization, setCustomization] = useState<TemplateCustomization>({
    colors: {
      primary: '#0ea5e9',
      secondary: '#64748b',
      accent: '#06b6d4',
      background: '#ffffff',
      text: '#1e293b'
    },
    typography: {
      fontFamily: 'Inter',
      headingSize: 'large',
      bodySize: 'medium'
    },
    layout: {
      headerStyle: 'modern',
      cardStyle: 'rounded',
      spacing: 'comfortable'
    },
    effects: {
      animations: true,
      shadows: true,
      gradients: true,
      glassMorphism: true
    }
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCustomization()
  }, [])

  const loadCustomization = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/template-customization')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setCustomization(result.data)
        }
      }
    } catch (error) {
      console.error('Failed to load customization:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveCustomization = async () => {
    try {
      setSaving(true)
      setError(null)
      
      const response = await fetch('/api/admin/template-customization', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customization),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setMessage('Template customization saved successfully!')
          setTimeout(() => setMessage(null), 3000)
        } else {
          setError(result.error || 'Failed to save customization')
        }
      } else {
        setError('Failed to save customization')
      }
    } catch (error) {
      console.error('Failed to save customization:', error)
      setError('Failed to save customization')
    } finally {
      setSaving(false)
    }
  }

  const applyColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setCustomization(prev => ({
      ...prev,
      colors: preset.colors
    }))
  }

  const updateColor = (colorKey: keyof TemplateCustomization['colors'], value: string) => {
    setCustomization(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [colorKey]: value
      }
    }))
  }

  const updateTypography = (key: keyof TemplateCustomization['typography'], value: string) => {
    setCustomization(prev => ({
      ...prev,
      typography: {
        ...prev.typography,
        [key]: value
      }
    }))
  }

  const updateLayout = (key: keyof TemplateCustomization['layout'], value: string) => {
    setCustomization(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        [key]: value
      }
    }))
  }

  const updateEffect = (key: keyof TemplateCustomization['effects'], value: boolean) => {
    setCustomization(prev => ({
      ...prev,
      effects: {
        ...prev.effects,
        [key]: value
      }
    }))
  }

  if (loading) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading customization...</p>
            </div>
          </div>
          <Footer />
        </div>
      </AdminGuard>
    )
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Template Customization</h1>
              <p className="mt-2 text-gray-600">
                Customize the visual appearance of your gallery template
              </p>
            </div>
            <div className="flex space-x-3">
              <Link href="/admin/templates" className="btn-secondary">
                Back to Templates
              </Link>
              <button
                onClick={saveCustomization}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div className="mb-6 p-6 rounded-lg border-2 bg-green-50 text-green-800 border-green-300 shadow-lg">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-green-800">Success!</h3>
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
                  <h3 className="text-lg font-semibold text-red-800">Error</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Customization Form */}
            <div className="lg:col-span-2 space-y-8">
              {/* Color Customization */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Colors</h2>
                
                {/* Color Presets */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Color Presets</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => applyColorPreset(preset)}
                        className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                      >
                        <div className="flex gap-1 mb-2">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.colors.primary }}></div>
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.colors.secondary }}></div>
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.colors.accent }}></div>
                        </div>
                        <p className="text-xs text-gray-600">{preset.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Individual Color Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={customization.colors.primary}
                        onChange={(e) => updateColor('primary', e.target.value)}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customization.colors.primary}
                        onChange={(e) => updateColor('primary', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={customization.colors.secondary}
                        onChange={(e) => updateColor('secondary', e.target.value)}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customization.colors.secondary}
                        onChange={(e) => updateColor('secondary', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={customization.colors.accent}
                        onChange={(e) => updateColor('accent', e.target.value)}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customization.colors.accent}
                        onChange={(e) => updateColor('accent', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={customization.colors.background}
                        onChange={(e) => updateColor('background', e.target.value)}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customization.colors.background}
                        onChange={(e) => updateColor('background', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Typography */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Typography</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                    <select
                      value={customization.typography.fontFamily}
                      onChange={(e) => updateTypography('fontFamily', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {FONT_OPTIONS.map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Heading Size</label>
                    <select
                      value={customization.typography.headingSize}
                      onChange={(e) => updateTypography('headingSize', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                      <option value="extra-large">Extra Large</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Layout Options */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Layout</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Header Style</label>
                    <select
                      value={customization.layout.headerStyle}
                      onChange={(e) => updateLayout('headerStyle', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="minimal">Minimal</option>
                      <option value="modern">Modern</option>
                      <option value="classic">Classic</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Card Style</label>
                    <select
                      value={customization.layout.cardStyle}
                      onChange={(e) => updateLayout('cardStyle', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="rounded">Rounded</option>
                      <option value="sharp">Sharp</option>
                      <option value="pill">Pill</option>
                      <option value="minimal">Minimal</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Visual Effects */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Visual Effects</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="animations"
                      checked={customization.effects.animations}
                      onChange={(e) => updateEffect('animations', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="animations" className="ml-2 block text-sm text-gray-700">
                      Enable animations and transitions
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="shadows"
                      checked={customization.effects.shadows}
                      onChange={(e) => updateEffect('shadows', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="shadows" className="ml-2 block text-sm text-gray-700">
                      Enable shadows and depth
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="gradients"
                      checked={customization.effects.gradients}
                      onChange={(e) => updateEffect('gradients', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="gradients" className="ml-2 block text-sm text-gray-700">
                      Enable gradient backgrounds
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="glassMorphism"
                      checked={customization.effects.glassMorphism}
                      onChange={(e) => updateEffect('glassMorphism', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="glassMorphism" className="ml-2 block text-sm text-gray-700">
                      Enable glass morphism effects
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Live Preview</h2>
                
                <div className="space-y-4">
                  {/* Preview Card */}
                  <div 
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: customization.colors.background,
                      color: customization.colors.text,
                      fontFamily: customization.typography.fontFamily,
                      borderRadius: customization.layout.cardStyle === 'rounded' ? '0.5rem' : 
                                   customization.layout.cardStyle === 'sharp' ? '0' :
                                   customization.layout.cardStyle === 'pill' ? '9999px' : '0.25rem',
                      boxShadow: customization.effects.shadows ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                    }}
                  >
                    <div 
                      className="w-full h-20 rounded mb-3"
                      style={{
                        background: customization.effects.gradients 
                          ? `linear-gradient(135deg, ${customization.colors.primary}, ${customization.colors.accent})`
                          : customization.colors.primary
                      }}
                    ></div>
                    <h3 
                      className="font-semibold mb-2"
                      style={{
                        fontSize: customization.typography.headingSize === 'small' ? '1rem' :
                                 customization.typography.headingSize === 'medium' ? '1.25rem' :
                                 customization.typography.headingSize === 'large' ? '1.5rem' : '1.75rem'
                      }}
                    >
                      Sample Album
                    </h3>
                    <p className="text-sm opacity-75">This is how your albums will look with the current settings.</p>
                  </div>

                  {/* Color Palette */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Color Palette</h3>
                    <div className="flex gap-2">
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-gray-300" 
                        style={{ backgroundColor: customization.colors.primary }}
                        title="Primary"
                      ></div>
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-gray-300" 
                        style={{ backgroundColor: customization.colors.secondary }}
                        title="Secondary"
                      ></div>
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-gray-300" 
                        style={{ backgroundColor: customization.colors.accent }}
                        title="Accent"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </AdminGuard>
  )
}
