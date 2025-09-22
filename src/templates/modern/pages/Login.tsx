'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'
import styles from '../styles.module.scss'
import { signIn, useSession } from 'next-auth/react'
import { useI18n } from '@/hooks/useI18n'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'

interface FormData {
  email: string
  password: string
}

export default function LoginPage() {
  const router = useRouter()
  const { t } = useI18n()
  const { data: session, status } = useSession()
  const { config } = useSiteConfig()
  const { currentLanguage } = useLanguage()
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Handle redirect after successful login
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const userRole = (session.user as any)?.role
      if (userRole === 'admin') {
        router.push('/admin')
      } else if (userRole === 'owner') {
        router.push('/owner')
      } else {
        router.push('/') // Redirect guest users to home page
      }
    }
  }, [status, session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
      })

      if (result?.ok) {
        // The useEffect will handle the redirect based on user role
        return
      }
      setError(t('auth.invalidCredentials'))
    } catch (error) {
      console.error('Login failed:', error)
      setError(t('auth.loginFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev: FormData) => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className={`min-h-screen ${styles.theme}`}>
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className={`mx-auto h-20 w-20 ${styles.primaryBg} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
              <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className={`text-4xl font-bold ${styles.heading1} mb-2`}>
              {t('auth.signInTo')} {MultiLangUtils.getTextValue(config?.title ?? '', currentLanguage) || 'OpenShutter'}
            </h2>
            {/* Subtitle removed as requested */}
          </div>

          <div className={`${styles.card} p-8 shadow-xl border-0`}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className={`${styles.errorCard} p-4 rounded-xl`}>
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className={`text-sm ${styles.errorText}`}>{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className={`block text-sm font-semibold ${styles.textPrimary}`}>
                  {t('auth.emailAddress')}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-3 ${styles.input} rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200`}
                  placeholder={t('auth.enterEmail')}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className={`block text-sm font-semibold ${styles.textPrimary}`}>
                  {t('auth.password')}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-3 ${styles.input} rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200`}
                  placeholder={t('auth.enterPassword')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className={`h-4 w-4 ${styles.primaryColor} focus:ring-blue-500 border-gray-300 rounded`}
                  />
                  <label htmlFor="remember-me" className={`ml-2 block text-sm ${styles.textSecondary}`}>
                    {t('auth.rememberMe')}
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className={`font-semibold ${styles.primaryColor} hover:opacity-80 transition-opacity`}>
                    {t('auth.forgotPassword')}
                  </a>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className={`w-full flex justify-center py-3 px-4 ${styles.primaryButton} rounded-xl font-semibold text-white transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>{t('auth.signingIn')}</span>
                    </div>
                  ) : (
                    t('auth.signIn')
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className={`text-sm ${styles.textSecondary}`}>
                {t('auth.needAccess')}
              </p>
            </div>

            {/* Modern decorative elements */}
            <div className="mt-8 flex items-center justify-center space-x-4">
              <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1"></div>
              <div className={`px-4 py-2 ${styles.secondaryBg} rounded-full`}>
                <span className={`text-xs font-medium ${styles.textSecondary}`}>Secure Login</span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1"></div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
