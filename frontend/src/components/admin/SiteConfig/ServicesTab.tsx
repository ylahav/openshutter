'use client'

import { SiteConfig } from '@/types/site-config'
import MultiLangInput from '@/components/MultiLangInput'
import MultiLangHTMLEditor from '@/components/MultiLangHTMLEditor'

interface ServicesTabProps {
  config: SiteConfig
  setConfig: (config: SiteConfig) => void
}

export default function ServicesTab({ config, setConfig }: ServicesTabProps) {
  return (
    <div className="space-y-6">
      {/* Services Section */}
      <div>
        <h3 className="text-md font-medium text-gray-800 mb-3">Services</h3>
        <div className="space-y-4">
          {config.homePage?.services?.map((service, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
              <button
                type="button"
                onClick={() => {
                  const newServices = (config.homePage?.services || []).filter((_, i) => i !== index)
                  setConfig({
                    ...config,
                    homePage: {
                      ...config.homePage,
                      services: newServices
                    }
                  })
                }}
                className="absolute top-3 right-3 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Remove
              </button>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Number
                  </label>
                  <input
                    type="text"
                    value={service.number}
                    onChange={(e) => {
                      const newServices = [...(config.homePage?.services || [])]
                      newServices[index] = { ...service, number: e.target.value }
                      setConfig({
                        ...config,
                        homePage: {
                          ...config.homePage,
                          services: newServices
                        }
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="01"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Title
                  </label>
                  <MultiLangInput
                    value={service.title}
                    onChange={(value) => {
                      const newServices = [...(config.homePage?.services || [])]
                      newServices[index] = { ...service, title: value }
                      setConfig({
                        ...config,
                        homePage: {
                          ...config.homePage,
                          services: newServices
                        }
                      })
                    }}
                    placeholder="Enter service title..."
                    showLanguageTabs={true}
                    defaultLanguage={config.languages?.defaultLanguage || 'en'}
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Description
                </label>
                <MultiLangHTMLEditor
                  value={service.description as any}
                  onChange={(value) => {
                    const newServices = [...(config.homePage?.services || [])]
                    newServices[index] = { ...service, description: value }
                    setConfig({
                      ...config,
                      homePage: {
                        ...config.homePage,
                        services: newServices
                      }
                    })
                  }}
                  placeholder="Enter service description..."
                  height={180}
                  showLanguageTabs={true}
                  defaultLanguage={config.languages?.defaultLanguage || 'en'}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const newServices = [
                ...(config.homePage?.services || []),
                {
                  number: `${(config.homePage?.services?.length || 0) + 1}`.padStart(2, '0'),
                  title: { en: '', he: '' },
                  description: { en: '', he: '' }
                }
              ]
              setConfig({
                ...config,
                homePage: {
                  ...config.homePage,
                  services: newServices
                }
              })
            }}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Add New Service
          </button>
        </div>
      </div>
    </div>
  )
}
