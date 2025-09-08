'use client'

import { useState, useEffect, useRef } from 'react'
import { SiteConfig } from '@/types/site-config'
import MultiLangInput from '@/components/MultiLangInput'
import MultiLangHTMLEditor from '@/components/MultiLangHTMLEditor'
import { MultiLangText, MultiLangHTML, MultiLangUtils } from '@/types/multi-lang'
import { useI18n } from '@/hooks/useI18n'

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLogoUploading(true)
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('logo', file)

      const response = await fetch('/api/admin/site-config/logo', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      
      if (data.success) {
        setConfig(data.data.config)
        setMessage(t('admin.logoUploadedSuccessfully'))
        
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        setMessage(t('admin.failedToUploadLogo'))
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      setMessage('Failed to upload logo')
    } finally {
      setLogoUploading(false)
    }
  }

  const handleLogoDelete = async () => {
    if (!config?.logo) return

    setLogoUploading(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/site-config/logo', {
        method: 'DELETE',
      })

      const data = await response.json()
      
      if (data.success) {
        setConfig(data.data.config)
        setMessage('Logo deleted successfully!')
      } else {
        setMessage('Failed to delete logo')
      }
    } catch (error) {
      console.error('Error deleting logo:', error)
      setMessage('Failed to delete logo')
    } finally {
      setLogoUploading(false)
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
            {/* Basic Settings */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.basicSettings')}</h2>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.siteTitle')}
                  </label>
                  <MultiLangInput
                    value={config.title}
                    onChange={(value) => setConfig({ ...config, title: value })}
                    placeholder="Enter site title in current language..."
                    required={true}
                    maxLength={100}
                    showLanguageTabs={true}
                    defaultLanguage={config.languages?.defaultLanguage || 'en'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.siteDescription')}
                  </label>
                  <MultiLangHTMLEditor
                    value={config.description}
                    onChange={(value) => setConfig({ ...config, description: value })}
                    placeholder="Enter site description in current language..."
                    height={150}
                    showLanguageTabs={true}
                    defaultLanguage={config.languages?.defaultLanguage || 'en'}
                  />
                </div>
              </div>
            </div>

            {/* Language Settings */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.languageSettings')}</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.activeLanguages')}
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Select which languages are available for content editing. Only selected languages will appear in multi-language fields.
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {availableLanguages.map((lang) => {
                      const isActive = config.languages?.activeLanguages?.includes(lang.code) || false
                      
                      return (
                        <label key={lang.code} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => {
                              const currentLanguages = config.languages?.activeLanguages || []
                              const newLanguages = e.target.checked
                                ? [...currentLanguages, lang.code]
                                : currentLanguages.filter((l: string) => l !== lang.code)
                              
                              setConfig({
                                ...config,
                                languages: {
                                  ...config.languages,
                                  activeLanguages: newLanguages,
                                  defaultLanguage: config.languages?.defaultLanguage || 'en'
                                }
                              })
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-lg">{lang.flag}</span>
                          <span className="text-sm text-gray-700">{lang.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="defaultLanguage" className="block text-sm font-medium text-gray-700 mb-1">
                    Default Language
                  </label>
                  <select
                    id="defaultLanguage"
                    value={config.languages?.defaultLanguage || 'en'}
                    onChange={(e) => {
                      setConfig({
                        ...config,
                        languages: {
                          ...config.languages,
                          defaultLanguage: e.target.value,
                          activeLanguages: config.languages?.activeLanguages || ['en']
                        }
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {config.languages?.activeLanguages?.map((langCode) => {
                      const lang = availableLanguages.find(l => l.code === langCode)
                      
                      return (
                        <option key={langCode} value={langCode}>
                          {lang?.name || langCode}
                        </option>
                      )
                    })}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    The default language will be used when content is not available in the user's preferred language.
                  </p>
                </div>
              </div>
            </div>

            {/* Logo Settings */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Logo Settings</h2>
              
              <div className="space-y-4">
                {/* Current Logo Display */}
                {config.logo && (
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-600">Current Logo:</div>
                    <img 
                      src={config.logo} 
                      alt="Site Logo" 
                      className="h-16 w-auto object-contain border border-gray-200 rounded"
                    />
                    <button
                      type="button"
                      onClick={handleLogoDelete}
                      disabled={logoUploading}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {logoUploading ? 'Deleting...' : 'Delete Logo'}
                    </button>
                  </div>
                )}

                {/* Logo Upload */}
                <div>
                  <label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-2">
                    Upload New Logo
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="logo"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      disabled={logoUploading}
                    />
                    {logoUploading && (
                      <div className="flex items-center text-sm text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Uploading...
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Supported formats: JPEG, PNG, GIF, WebP, SVG. Max size: 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* SEO Settings */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">SEO Settings</h2>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="metaTitle" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.metaTitle')}
                  </label>
                  <input
                    type="text"
                    id="metaTitle"
                    value={config.seo.metaTitle}
                    onChange={(e) => handleInputChange('seo.metaTitle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter meta title"
                  />
                </div>

                <div>
                  <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.metaDescription')}
                  </label>
                  <textarea
                    id="metaDescription"
                    value={config.seo.metaDescription}
                    onChange={(e) => handleInputChange('seo.metaDescription', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter meta description"
                  />
                </div>
              </div>
            </div>

            {/* Theme Settings */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Theme Settings</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Color
                  </label>
                  <input
                    type="color"
                    id="primaryColor"
                    value={config.theme.primaryColor}
                    onChange={(e) => handleInputChange('theme.primaryColor', e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700 mb-1">
                    Secondary Color
                  </label>
                  <input
                    type="color"
                    id="secondaryColor"
                    value={config.theme.secondaryColor}
                    onChange={(e) => handleInputChange('theme.secondaryColor', e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Contact & Social Media Settings */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact & Social Media</h2>
              
              <div className="space-y-6">
                {/* Contact Information */}
                <div>
                  <h3 className="text-md font-medium text-gray-800 mb-3">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        id="contactEmail"
                        value={config.contact?.email || ''}
                        onChange={(e) => handleInputChange('contact.email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="contact@example.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        id="contactPhone"
                        value={config.contact?.phone || ''}
                        onChange={(e) => handleInputChange('contact.phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label htmlFor="contactAddress" className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <textarea
                      id="contactAddress"
                      value={config.contact?.address || ''}
                      onChange={(e) => handleInputChange('contact.address', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="123 Main Street, City, State 12345"
                    />
                  </div>
                </div>

                {/* Social Media Links */}
                <div>
                  <h3 className="text-md font-medium text-gray-800 mb-3">Social Media Links</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Add your social media profile URLs. These will appear in the footer of your site.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="socialTwitter" className="block text-sm font-medium text-gray-700 mb-1">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                          </svg>
                          Twitter
                        </span>
                      </label>
                      <input
                        type="url"
                        id="socialTwitter"
                        value={config.contact?.socialMedia?.twitter || ''}
                        onChange={(e) => handleInputChange('contact.socialMedia.twitter', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://twitter.com/yourusername"
                      />
                    </div>

                    <div>
                      <label htmlFor="socialFacebook" className="block text-sm font-medium text-gray-700 mb-1">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          Facebook
                        </span>
                      </label>
                      <input
                        type="url"
                        id="socialFacebook"
                        value={config.contact?.socialMedia?.facebook || ''}
                        onChange={(e) => handleInputChange('contact.socialMedia.facebook', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://facebook.com/yourpage"
                      />
                    </div>

                    <div>
                      <label htmlFor="socialInstagram" className="block text-sm font-medium text-gray-700 mb-1">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z"/>
                          </svg>
                          Instagram
                        </span>
                      </label>
                      <input
                        type="url"
                        id="socialInstagram"
                        value={config.contact?.socialMedia?.instagram || ''}
                        onChange={(e) => handleInputChange('contact.socialMedia.instagram', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://instagram.com/yourusername"
                      />
                    </div>

                    <div>
                      <label htmlFor="socialLinkedin" className="block text-sm font-medium text-gray-700 mb-1">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          LinkedIn
                        </span>
                      </label>
                      <input
                        type="url"
                        id="socialLinkedin"
                        value={config.contact?.socialMedia?.linkedin || ''}
                        onChange={(e) => handleInputChange('contact.socialMedia.linkedin', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://linkedin.com/in/yourprofile"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
