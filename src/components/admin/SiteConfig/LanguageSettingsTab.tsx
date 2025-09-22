'use client'

import { SiteConfig } from '@/types/site-config'
import { useI18n } from '@/hooks/useI18n'

interface LanguageSettingsTabProps {
  config: SiteConfig
  setConfig: (config: SiteConfig) => void
  availableLanguages: Array<{code: string, name: string, flag: string}>
}

export default function LanguageSettingsTab({ config, setConfig, availableLanguages }: LanguageSettingsTabProps) {
  const { t } = useI18n()

  return (
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
  )
}
