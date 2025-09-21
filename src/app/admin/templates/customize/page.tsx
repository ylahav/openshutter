'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { TemplateCustomization } from '@/hooks/useTemplateCustomization'
import AdminGuard from '@/components/AdminGuard'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

type TemplateSummary = {
  templateName: string
  displayName: string
  version: string
  description?: string
}

export default function TemplateCustomizationPage() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [activeTemplate, setActiveTemplate] = useState<string>('')
  const [selected, setSelected] = useState<string>('')
  const [raw, setRaw] = useState<string>('')
  const [originalRaw, setOriginalRaw] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Load templates and active template
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const [tplRes, cfgRes] = await Promise.all([
          fetch('/api/admin/templates', { cache: 'no-store' }),
          fetch('/api/admin/site-config', { cache: 'no-store' }),
        ])
        const tplJson = await tplRes.json()
        const cfgJson = await cfgRes.json()
        if (tplJson?.success && Array.isArray(tplJson.data)) {
          setTemplates(tplJson.data)
        }
        const current = cfgJson?.data?.template?.activeTemplate || 'default'
        setActiveTemplate(current)
        setSelected(current)
      } catch (e) {
        setError('Failed to load templates')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Load JSON of selected template
  useEffect(() => {
    const fetchConfig = async () => {
      if (!selected) return
      try {
        setError(null)
        setRaw('')
        const res = await fetch(`/api/admin/templates/${selected}/config`, { cache: 'no-store' })
        const json = await res.json()
        if (json?.success && json.data) {
          const pretty = JSON.stringify(json.data, null, 2)
          setRaw(pretty)
          setOriginalRaw(pretty)
        } else {
          setError(json?.error || 'Failed to load template config')
        }
      } catch (e) {
        setError('Failed to load template config')
      }
    }
    fetchConfig()
  }, [selected])

  const currentTemplate = useMemo(() => templates.find(t => t.templateName === selected), [templates, selected])

  const save = async () => {
    try {
      setSaving(true)
      setError(null)
      setMessage(null)
      let parsed: any
      try {
        parsed = JSON.parse(raw)
      } catch {
        setError('Invalid JSON')
        return
      }
      if (parsed.templateName !== selected) {
        setError('templateName must match the selected template')
        return
      }
      const res = await fetch(`/api/admin/templates/${selected}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })
      const j = await res.json()
      if (!j?.success) {
        setError(j?.error || 'Failed to save')
        return
      }
      setMessage('Saved successfully')
      // Keep original in sync after successful save
      setOriginalRaw(JSON.stringify(parsed, null, 2))
      // Refresh list cache
      await fetch('/api/admin/templates', { cache: 'no-store' })
    } catch (e) {
      setError('Failed to save')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6">
        <div className="max-w-6xl mx-auto">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Template Customization</h1>
          <Link href="/admin/templates" className="btn-secondary">Back to Templates</Link>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm">Select template:</label>
          <select
            className="border rounded px-2 py-1 bg-background text-foreground"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {templates.map(t => (
              <option key={t.templateName} value={t.templateName}>
                {t.displayName} ({t.templateName})
              </option>
            ))}
          </select>
          {selected === activeTemplate && (
            <span className="text-xs px-2 py-1 rounded bg-green-600 text-white">Active</span>
          )}
        </div>

        {currentTemplate && (
          <div className="text-sm opacity-80">
            <div><strong>Name:</strong> {currentTemplate.displayName}</div>
            <div><strong>Version:</strong> {currentTemplate.version}</div>
            {currentTemplate.description && <div><strong>Description:</strong> {currentTemplate.description}</div>}
          </div>
        )}

        {error && (
          <div className="p-3 rounded bg-red-100 text-red-800 border border-red-200">{error}</div>
        )}
        {message && (
          <div className="p-3 rounded bg-green-100 text-green-800 border border-green-200">{message}</div>
        )}

        {/* Side-by-side editor and help */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Editor */}
          <div className="space-y-2">
            <label className="text-sm font-medium">template.config.json</label>
            <textarea
              className="w-full h-[500px] border rounded p-3 font-mono text-sm bg-background text-foreground"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setRaw(originalRaw)
                  window.location.href = '/admin/templates'
                }}
                disabled={saving || raw === originalRaw}
                className="px-4 py-2 rounded bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Help */}
          <div>
            {/* spacer to align with editor label */}
            <div className="text-sm font-medium invisible mb-2">template.config.json</div>
            <div className="rounded border p-4 bg-muted/40">
              <h2 className="font-semibold mb-2">template.config.json quick help</h2>
              <ul className="text-sm leading-6 list-disc pl-5">
              <li><strong>templateName</strong>: folder/name id of the template.</li>
              <li><strong>displayName</strong>, <strong>version</strong>, <strong>author</strong>, <strong>description</strong>, <strong>category</strong>: metadata for Admin.</li>
              <li><strong>features</strong>: {`{ responsive, darkMode, animations, seoOptimized }`} – flags only.</li>
              <li><strong>colors</strong>: brand palette {`{ primary, secondary, accent, background, text, muted }`}.</li>
              <li><strong>fonts</strong>: {`{ heading, body }`} – used by TemplateWrapper.</li>
              <li><strong>layout</strong>: sizing {`{ maxWidth, containerPadding, gridGap }`}.</li>
              <li><strong>components</strong>: file paths for template parts (e.g. navigation → components/Header.tsx).</li>
              <li><strong>visibility</strong>: global toggles (e.g. hero, languageSelector, authButtons, footerMenu).</li>
              <li><strong>pages</strong>: entry components for routes {`{ home, gallery, album }`}.</li>
              <li><strong>assets</strong>: {`{ thumbnail }`} for Admin preview.</li>
              <li><strong>componentsConfig.header</strong>: behavior flags and menu:
                <ul className="list-disc pl-5 mt-1">
                  <li><strong>showLogo</strong>, <strong>showSiteTitle</strong></li>
                  <li><strong>menu</strong>: array of {`{ labelKey?, label?, href }`} (prefer labelKey for i18n)</li>
                  <li><strong>enableThemeToggle</strong>, <strong>enableLanguageSelector</strong></li>
                  <li><strong>showGreeting</strong>, <strong>showAuthButtons</strong></li>
                </ul>
              </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
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

function TemplateCustomizePage() {
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
