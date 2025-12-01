'use client'

import { SiteConfig } from '@/types/site-config'
import MultiLangInput from '@/components/MultiLangInput'
import MultiLangHTMLEditor from '@/components/MultiLangHTMLEditor'
import { useI18n } from '@/hooks/useI18n'

interface BasicSettingsTabProps {
  config: SiteConfig
  setConfig: (config: SiteConfig) => void
}

export default function BasicSettingsTab({ config, setConfig }: BasicSettingsTabProps) {
  const { t } = useI18n()

  return (
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
  )
}
