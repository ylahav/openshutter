'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils, MultiLangText, MultiLangHTML } from '@/types/multi-lang'
import Link from 'next/link'
import BlogHTMLEditor from '@/components/BlogHTMLEditor'
import BlogImageUpload from '@/components/BlogImageUpload'

interface UserProfile {
  _id: string
  email: string
  name: MultiLangText | string
  bio?: MultiLangHTML
  profileImage?: {
    url: string
    alt: MultiLangText
    storageProvider: string
    storagePath: string
  }
  role: string
  createdAt: string
  updatedAt: string
}

export default function OwnerProfilePage() {
  const { t } = useI18n()
  const { isRTL, currentLanguage } = useLanguage()
  const { data: session, update } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: { en: '', he: '' } as MultiLangHTML,
    profileImage: undefined as UserProfile['profileImage'],
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/profile')
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }
      const data = await response.json()
      setProfile(data.user)
      
      // Extract name using MultiLangUtils
      const displayName = MultiLangUtils.getTextValue(data.user.name, currentLanguage)
      
      setFormData({
        name: displayName,
        email: data.user.email || '',
        bio: data.user.bio || { en: '', he: '' },
        profileImage: data.user.profileImage,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleBioChange = (value: MultiLangHTML) => {
    setFormData(prev => ({
      ...prev,
      bio: value
    }))
  }

  const handleProfileImageChange = (value: UserProfile['profileImage']) => {
    setFormData(prev => ({
      ...prev,
      profileImage: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Validate password fields if changing password
      if (formData.newPassword || formData.confirmPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error(t('owner.passwordsDoNotMatch'))
        }
        if (formData.newPassword.length < 6) {
          throw new Error(t('owner.passwordTooShort'))
        }
      }

      // Prepare name as multi-language object
      const nameUpdate = profile?.name && typeof profile.name === 'object' 
        ? MultiLangUtils.setValue(profile.name, currentLanguage, formData.name)
        : { [currentLanguage]: formData.name }

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: nameUpdate,
          email: formData.email,
          bio: formData.bio,
          profileImage: formData.profileImage,
          currentPassword: formData.currentPassword || undefined,
          newPassword: formData.newPassword || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update profile')
      }

      const data = await response.json()
      setProfile(data.user)
      setSuccess(t('owner.profileUpdatedSuccessfully'))
      
      // Update session with proper name extraction
      const sessionName = MultiLangUtils.getTextValue(data.user.name, currentLanguage)
      await update({
        ...session,
        user: {
          ...session?.user,
          name: sessionName,
          email: data.user.email,
        }
      })

      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const getArrowPath = () => isRTL ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('loading.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('owner.profileManagement')}</h1>
            <p className="text-gray-600 mt-2">{t('owner.editProfileDescription')}</p>
          </div>
          <Link
            href="/owner"
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('owner.backToDashboard')}
          </Link>
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('owner.basicInformation')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('owner.name')}
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('owner.enterYourName')}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('owner.email')}
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('owner.enterYourEmail')}
                  />
                </div>
              </div>
            </div>

            {/* Profile Image */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('owner.profileImage')}</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('owner.profileImageDescription')}
                </label>
                <BlogImageUpload
                  value={formData.profileImage}
                  onChange={handleProfileImageChange}
                  storageProvider="local"
                  className="w-full"
                />
                <p className="mt-1 text-sm text-gray-500">{t('owner.profileImageHelp')}</p>
              </div>
            </div>

            {/* Bio/Description */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('owner.bio')}</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('owner.bioDescription')}
                </label>
                <BlogHTMLEditor
                  value={formData.bio}
                  onChange={handleBioChange}
                  placeholder={t('owner.enterBioDescription')}
                  className="w-full"
                />
                <p className="mt-1 text-sm text-gray-500">{t('owner.bioHelp')}</p>
              </div>
            </div>

            {/* Password Change */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('owner.changePassword')}</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('owner.currentPassword')}
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('owner.enterCurrentPassword')}
                  />
                  <p className="mt-1 text-sm text-gray-500">{t('owner.currentPasswordHelp')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('owner.newPassword')}
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t('owner.enterNewPassword')}
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('owner.confirmPassword')}
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t('owner.confirmNewPassword')}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('owner.accountInformation')}</h3>
              <div className="bg-gray-50 rounded-md p-4">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('owner.role')}</dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize">{profile?.role}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('owner.memberSince')}</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('owner.displayName')}</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {profile?.name ? MultiLangUtils.getTextValue(profile.name, currentLanguage) : '-'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('owner.saving')}
                  </>
                ) : (
                  t('owner.saveChanges')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
