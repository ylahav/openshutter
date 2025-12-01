'use client'

import { useState, useEffect } from 'react'
import { Page } from '@/lib/models/Page'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, User } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface PageDisplayProps {
  alias: string
}

export default function PageDisplay({ alias }: PageDisplayProps) {
  const { currentLanguage } = useLanguage()
  const [page, setPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPage()
  }, [alias])

  const fetchPage = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/pages/${alias}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setPage(data.data)
        } else {
          setError(data.error || 'Page not found')
        }
      } else if (response.status === 404) {
        setError('Page not found')
      } else {
        setError('Failed to load page')
      }
    } catch (error) {
      console.error('Error fetching page:', error)
      setError('Failed to load page')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading page...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Page Not Found</h1>
            <p className="text-gray-600 mb-6">
              {error || 'The page you are looking for does not exist or has been removed.'}
            </p>
            <div className="space-x-4">
              <Link href="/">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </Link>
              <Link href="/albums">
                <Button>View Gallery</Button>
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const title = MultiLangUtils.getTextValue(page.title, currentLanguage)
  const subtitle = page.subtitle ? MultiLangUtils.getTextValue(page.subtitle, currentLanguage) : null
  const introText = page.introText ? MultiLangUtils.getHTMLValue(page.introText, currentLanguage) : null
  const content = page.content ? MultiLangUtils.getHTMLValue(page.content, currentLanguage) : null

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      {/* Page Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <Badge variant={page.category === 'system' ? 'default' : 'secondary'}>
              {page.category}
            </Badge>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{title}</h1>
          {subtitle && (
            <p className="text-xl text-gray-600 mb-4">{subtitle}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Updated {new Date(page.updatedAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>By {page.updatedBy}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Leading Image */}
          {page.leadingImage && (
            <div className="mb-8">
              <img
                src={page.leadingImage}
                alt={title}
                className="w-full h-64 md:h-96 object-cover rounded-lg shadow-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          )}

          {/* Intro Text */}
          {introText && (
            <Card className="mb-8">
              <CardContent className="p-6">
                <div 
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: introText }}
                />
              </CardContent>
            </Card>
          )}

          {/* Main Content */}
          {content && (
            <Card>
              <CardContent className="p-6">
                <div 
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!introText && !content && (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500 text-lg">This page doesn't have any content yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  )
}
