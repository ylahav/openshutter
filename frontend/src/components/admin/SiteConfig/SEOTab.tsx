'use client'

import { SiteConfig } from '@/types/site-config'
import { useI18n } from '@/hooks/useI18n'

interface SEOTabProps {
  config: SiteConfig
  handleInputChange: (field: string, value: string) => void
}

export default function SEOTab({ config, handleInputChange }: SEOTabProps) {
  const { t } = useI18n()

  return (
    <div className="grid grid-cols-1 gap-4">
      <div>
        <label htmlFor="metaTitle" className="block text-sm font-medium text-gray-700 mb-1">{t('admin.metaTitle')}</label>
        <input
          type="text"
          id="metaTitle"
          value={config.seo.metaTitle}
          onChange={(e) => handleInputChange('seo.metaTitle', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter meta title"
        />
      </div>
      <div>
        <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700 mb-1">{t('admin.metaDescription')}</label>
        <textarea
          id="metaDescription"
          value={config.seo.metaDescription}
          onChange={(e) => handleInputChange('seo.metaDescription', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter meta description"
        />
      </div>
    </div>
  )
}
