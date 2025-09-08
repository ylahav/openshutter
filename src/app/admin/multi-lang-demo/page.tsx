'use client'

import { useState } from 'react'
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext'
import MultiLangInput from '@/components/MultiLangInput'
import MultiLangHTMLEditor from '@/components/MultiLangHTMLEditor'
import LanguageSelector from '@/components/LanguageSelector'
import { MultiLangText, MultiLangHTML, MultiLangUtils } from '@/types/multi-lang'
import AdminGuard from '@/components/AdminGuard'

function MultiLangDemoContent() {
  const { currentLanguage, setCurrentLanguage } = useLanguage()
  
  const [title, setTitle] = useState<MultiLangText>({
    en: 'Welcome to OpenShutter',
    he: 'ברוכים הבאים ל-OpenShutter',
    ar: 'مرحباً بكم في OpenShutter'
  })
  
  const [description, setDescription] = useState<MultiLangHTML>({
    en: '<p>This is a <strong>beautiful photo gallery</strong> with multi-language support.</p>',
    he: '<p>זוהי <strong>גלריית תמונות יפה</strong> עם תמיכה בשפות מרובות.</p>',
    ar: '<p>هذه <strong>معرض صور جميل</strong> مع دعم متعدد اللغات.</p>'
  })

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Multi-Language Demo</h1>
              <p className="text-gray-600 mt-2">Test the new multi-language components and RTL support</p>
            </div>
            
            {/* Language Selector */}
            <LanguageSelector
              currentLanguage={currentLanguage}
              onLanguageChange={setCurrentLanguage}
              showFlags={true}
              showNativeNames={true}
            />
          </div>
        </div>

        {/* Demo Sections */}
        <div className="space-y-8">
          {/* Multi-Language Text Input */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Multi-Language Text Input</h2>
            <p className="text-gray-600 mb-4">This replaces the old title fields with multi-language support.</p>
            
            <MultiLangInput
              value={title}
              onChange={setTitle}
              placeholder="Enter title in current language..."
              required={true}
              maxLength={100}
              showLanguageTabs={true}
              defaultLanguage={currentLanguage}
            />
            
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium text-gray-900 mb-2">Current Values:</h3>
              <pre className="text-sm text-gray-600 overflow-auto">
                {JSON.stringify(title, null, 2)}
              </pre>
            </div>
          </div>

          {/* Multi-Language HTML Editor */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Multi-Language HTML Editor</h2>
            <p className="text-gray-600 mb-4">Rich HTML editing with Quill, supporting RTL languages.</p>
            
            <MultiLangHTMLEditor
              value={description}
              onChange={setDescription}
              placeholder="Enter rich content in current language..."
              height={200}
              showLanguageTabs={true}
              defaultLanguage={currentLanguage}
            />
            
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium text-gray-900 mb-2">Current Values:</h3>
              <pre className="text-sm text-gray-600 overflow-auto">
                {JSON.stringify(description, null, 2)}
              </pre>
            </div>
          </div>

          {/* Language Features Demo */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Language Features</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* RTL Support */}
              <div className="p-4 bg-blue-50 rounded-md">
                <h3 className="font-medium text-blue-900 mb-2">RTL Support</h3>
                <p className="text-blue-700 text-sm">
                  Current language: <strong>{currentLanguage}</strong><br/>
                  Is RTL: <strong>{currentLanguage === 'he' || currentLanguage === 'ar' ? 'Yes' : 'No'}</strong><br/>
                  Text direction: <strong>{currentLanguage === 'he' || currentLanguage === 'ar' ? 'Right to Left' : 'Left to Right'}</strong>
                </p>
              </div>

              {/* Content Summary */}
              <div className="p-4 bg-green-50 rounded-md">
                <h3 className="font-medium text-green-900 mb-2">Content Summary</h3>
                <p className="text-green-700 text-sm">
                  Title languages: <strong>{MultiLangUtils.getLanguagesWithContent(title).join(', ')}</strong><br/>
                  Description languages: <strong>{MultiLangUtils.getLanguagesWithContent(description).join(', ')}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Utility Functions Demo */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Utility Functions</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-md">
                <h3 className="font-medium text-gray-900 mb-2">Get Value in Current Language</h3>
                <p className="text-gray-600">
                  <strong>Title:</strong> {MultiLangUtils.getValue(title, currentLanguage) || 'No content'}
                </p>
                <p className="text-gray-600">
                  <strong>Description:</strong> {MultiLangUtils.getValue(description, currentLanguage) ? 'Has content' : 'No content'}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-md">
                <h3 className="font-medium text-gray-900 mb-2">Check Content Availability</h3>
                <p className="text-gray-600">
                  <strong>Title in English:</strong> {MultiLangUtils.hasContent(title, 'en') ? '✅ Yes' : '❌ No'}<br/>
                  <strong>Title in Hebrew:</strong> {MultiLangUtils.hasContent(title, 'he') ? '✅ Yes' : '❌ No'}<br/>
                  <strong>Title in Arabic:</strong> {MultiLangUtils.hasContent(title, 'ar') ? '✅ Yes' : '❌ No'}
                </p>
              </div>
            </div>
          </div>

          {/* RTL Layout Demo */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">RTL Layout Demo</h2>
            <p className="text-gray-600 mb-4">Notice how the layout changes for RTL languages.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-yellow-50 rounded-md text-center">
                <h4 className="font-medium text-yellow-900">Left Item</h4>
                <p className="text-yellow-700 text-sm">This should be on the left in LTR</p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-md text-center">
                <h4 className="font-medium text-purple-900">Center Item</h4>
                <p className="text-purple-700 text-sm">This stays centered</p>
              </div>
              
              <div className="p-4 bg-pink-50 rounded-md text-center">
                <h4 className="font-medium text-pink-900">Right Item</h4>
                <p className="text-pink-700 text-sm">This should be on the right in LTR</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MultiLangDemoPage() {
  return (
    <AdminGuard>
      <LanguageProvider>
        <MultiLangDemoContent />
      </LanguageProvider>
    </AdminGuard>
  )
}
