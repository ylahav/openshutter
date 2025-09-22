'use client'

import { SiteConfig } from '@/types/site-config'
import MultiLangInput from '@/components/MultiLangInput'

interface ContactTabProps {
  config: SiteConfig
  setConfig: (config: SiteConfig) => void
  handleInputChange: (field: string, value: string) => void
}

export default function ContactTab({ config, setConfig, handleInputChange }: ContactTabProps) {
  return (
    <div className="space-y-6">
      {/* Contact Section Title (for homepage) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Contact Section Title
        </label>
        <MultiLangInput
          value={config.homePage?.contactTitle || { en: '', he: '' }}
          onChange={(value) => setConfig({
            ...config,
            homePage: {
              ...config.homePage,
              contactTitle: value
            }
          })}
          placeholder="Enter contact section title..."
          showLanguageTabs={true}
          defaultLanguage={config.languages?.defaultLanguage || 'en'}
        />
      </div>

      {/* Contact Information */}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Address
        </label>
        <MultiLangInput
          value={config.contact?.address || { en: '', he: '' }}
          onChange={(value) => setConfig({
            ...config,
            contact: {
              ...config.contact,
              address: value
            }
          })}
          placeholder="Enter address in current language..."
          showLanguageTabs={true}
          defaultLanguage={config.languages?.defaultLanguage || 'en'}
          multiline={true}
          rows={3}
        />
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
