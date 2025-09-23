'use client'

import { Page } from '@/lib/models/Page'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, Eye, EyeOff } from 'lucide-react'

interface PageListProps {
  pages: Page[]
  onEdit: (page: Page) => void
  onDelete: (page: Page) => void
}

export default function PageList({ pages, onEdit, onDelete }: PageListProps) {
  const { currentLanguage } = useLanguage()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="grid gap-4">
      {pages.map((page) => (
        <Card key={page._id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">
                  {MultiLangUtils.getTextValue(page.title, currentLanguage)}
                </CardTitle>
                <div className="text-sm text-gray-500 mt-1">
                  /{page.alias}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={page.category === 'system' ? 'default' : 'secondary'}>
                    {page.category}
                  </Badge>
                  <Badge variant={page.isPublished ? 'default' : 'outline'}>
                    {page.isPublished ? (
                      <>
                        <Eye className="w-3 h-3 mr-1" />
                        Published
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3 mr-1" />
                        Draft
                      </>
                    )}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(page)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(page)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              <p>Created: {formatDate(page.createdAt)}</p>
              <p>Updated: {formatDate(page.updatedAt)}</p>
              {page.subtitle && (
                <p className="mt-2">
                  {MultiLangUtils.getTextValue(page.subtitle, currentLanguage)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
