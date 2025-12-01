'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { SiteConfig } from '@/types/site-config'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MultiLangUtils } from '@/types/multi-lang'
import { useI18n } from '@/hooks/useI18n'

// Dynamic imports for heavy components
const BasicSettingsTab = dynamic(() => import('@/components/admin/SiteConfig/BasicSettingsTab'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />
})

const LanguageSettingsTab = dynamic(() => import('@/components/admin/SiteConfig/LanguageSettingsTab'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />
})

const BrandingTab = dynamic(() => import('@/components/admin/SiteConfig/BrandingTab'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />
})

const SEOTab = dynamic(() => import('@/components/admin/SiteConfig/SEOTab'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />
})

const ContactTab = dynamic(() => import('@/components/admin/SiteConfig/ContactTab'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />
})

const ServicesTab = dynamic(() => import('@/components/admin/SiteConfig/ServicesTab'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />
})

export default function SiteConfigPage() {
  const { t } = useI18n()
  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [availableLanguages, setAvailableLanguages] = useState<Array<{code: string, name: string, flag: string}>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadConfig()
    loadAvailableLanguages()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/site-config')
      const data = await response.json()
      
      if (data.success) {
        // Ensure socialMedia object is properly initialized
        const configData = data.data
        if (configData.contact && (!configData.contact.socialMedia || typeof configData.contact.socialMedia !== 'object')) {
          configData.contact.socialMedia = {
            facebook: '',
            instagram: '',
            twitter: '',
            linkedin: ''
          }
        }
        setConfig(configData)
      } else {
        setMessage(t('admin.failedToLoad'))
      }
    } catch (error) {
      console.error('Error loading site config:', error)
      setMessage(t('admin.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableLanguages = async () => {
    try {
      const response = await fetch('/api/admin/languages')
      const data = await response.json()
      
      if (data.success) {
        setAvailableLanguages(data.data)
      } else {
        // Fallback to default languages if API fails
        setAvailableLanguages([
          { code: 'en', name: 'English', flag: '🇺🇸' },
          { code: 'he', name: 'Hebrew', flag: '🇮🇱' }
        ])
      }
    } catch (error) {
      console.error('Error loading available languages:', error)
      // Fallback to default languages
      setAvailableLanguages([
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'he', name: 'Hebrew', flag: '🇮🇱' }
      ])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return

    setSaving(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/site-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: MultiLangUtils.clean(config.title),
          description: MultiLangUtils.clean(config.description),
          languages: config.languages,
          seo: config.seo,
          theme: config.theme,
          contact: config.contact,
          homePage: config.homePage,
          features: config.features,
          template: config.template
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setMessage(t('admin.configurationSaved'))
        setConfig(data.data)
        
        // Show success message for 2 seconds, then redirect to admin dashboard
        setTimeout(() => {
          window.location.href = '/admin'
        }, 2000)
      } else {
        setMessage(t('admin.failedToSave'))
      }
    } catch (error) {
      setMessage(t('admin.failedToSave'))
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    if (!config) return

    if (field.includes('.')) {
      const parts = field.split('.')
      
      if (parts.length === 2) {
        // Handle cases like 'seo.metaTitle' or 'contact.email'
        const [section, key] = parts
        const sectionValue = config[section as keyof SiteConfig]
        if (typeof sectionValue === 'object' && sectionValue !== null) {
          setConfig({
            ...config,
            [section]: {
              ...sectionValue,
              [key]: value
            }
          })
        }
      } else if (parts.length === 3) {
        // Handle cases like 'contact.socialMedia.twitter'
        const [section, subsection, key] = parts
        const sectionValue = config[section as keyof SiteConfig]
        if (typeof sectionValue === 'object' && sectionValue !== null) {
          const subsectionValue = (sectionValue as any)[subsection]
          // Initialize subsection if it doesn't exist or is not an object
          const initializedSubsection = typeof subsectionValue === 'object' && subsectionValue !== null 
            ? subsectionValue 
            : {}
          
          setConfig({
            ...config,
            [section]: {
              ...sectionValue,
              [subsection]: {
                ...initializedSubsection,
                [key]: value
              }
            }
          })
        }
      }
    } else {
      setConfig({
        ...config,
        [field]: value
      })
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('admin.loadingConfiguration')}</p>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{t('admin.failedToLoad')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{t('admin.siteConfiguration')}</h1>
            <a
              href="/admin"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {t('admin.backToAdmin')}
            </a>
          </div>

          {message && (
            <div className={`mb-6 p-6 rounded-lg border-2 ${
              message.includes('successfully') 
                ? 'bg-green-50 text-green-800 border-green-300 shadow-lg' 
                : 'bg-red-50 text-red-800 border-red-300 shadow-lg'
            }`}>
              <div className="flex items-center">
                {message.includes('successfully') ? (
                  <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <div>
                  <h3 className={`text-lg font-semibold ${
                    message.includes('successfully') ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {message.includes('successfully') ? 'Success!' : 'Error'}
                  </h3>
                  <p className={`text-sm ${
                    message.includes('successfully') ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {message.includes('successfully') 
                      ? 'Your site configuration has been saved successfully. Redirecting to admin dashboard...'
                      : message
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="mb-4 bg-gray-100 text-gray-600 w-full grid grid-cols-6">
                <TabsTrigger className="text-gray-600 data-[state=active]:text-gray-900 w-full" value="basic">{t('admin.basicSettings')}</TabsTrigger>
                <TabsTrigger className="text-gray-600 data-[state=active]:text-gray-900 w-full" value="languages">{t('admin.languageSettings')}</TabsTrigger>
                <TabsTrigger className="text-gray-600 data-[state=active]:text-gray-900 w-full" value="branding">Branding</TabsTrigger>
                <TabsTrigger className="text-gray-600 data-[state=active]:text-gray-900 w-full" value="seo">SEO</TabsTrigger>
                <TabsTrigger className="text-gray-600 data-[state=active]:text-gray-900 w-full" value="contact">Contact</TabsTrigger>
                <TabsTrigger className="text-gray-600 data-[state=active]:text-gray-900 w-full" value="home">Services</TabsTrigger>
              </TabsList>

              <TabsContent value="basic">
                <Suspense fallback={<div className="animate-pulse bg-gray-200 h-64 rounded-lg" />}>
                  <BasicSettingsTab config={config} setConfig={setConfig} />
                </Suspense>
              </TabsContent>

              <TabsContent value="languages">
                <Suspense fallback={<div className="animate-pulse bg-gray-200 h-64 rounded-lg" />}>
                  <LanguageSettingsTab 
                    config={config} 
                    setConfig={setConfig} 
                    availableLanguages={availableLanguages}
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="branding">
                <Suspense fallback={<div className="animate-pulse bg-gray-200 h-64 rounded-lg" />}>
                  <BrandingTab 
                    config={config} 
                    setConfig={setConfig} 
                    logoUploading={logoUploading}
                    setLogoUploading={setLogoUploading}
                    setMessage={setMessage}
                    fileInputRef={fileInputRef}
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="seo">
                <Suspense fallback={<div className="animate-pulse bg-gray-200 h-64 rounded-lg" />}>
                  <SEOTab config={config} handleInputChange={handleInputChange} />
                </Suspense>
              </TabsContent>

              <TabsContent value="contact">
                <Suspense fallback={<div className="animate-pulse bg-gray-200 h-64 rounded-lg" />}>
                  <ContactTab 
                    config={config} 
                    setConfig={setConfig} 
                    handleInputChange={handleInputChange}
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="home">
                <Suspense fallback={<div className="animate-pulse bg-gray-200 h-64 rounded-lg" />}>
                  <ServicesTab config={config} setConfig={setConfig} />
                </Suspense>
              </TabsContent>

            </Tabs>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? t('admin.saving') : t('admin.saveConfiguration')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
