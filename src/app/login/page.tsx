'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TemplateWrapper from '@/components/TemplateWrapper'
import DynamicTemplateLoader from '@/components/DynamicTemplateLoader'
import { signIn, useSession } from 'next-auth/react'
import { useI18n } from '@/hooks/useI18n'

interface FormData {
  email: string
  password: string
}

export default function LoginPage() {
  const router = useRouter()
  const { t } = useI18n()
  const { data: session, status } = useSession()
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
    <TemplateWrapper pageName="login">
      <DynamicTemplateLoader pageName="login" />
    </TemplateWrapper>
  )
}
