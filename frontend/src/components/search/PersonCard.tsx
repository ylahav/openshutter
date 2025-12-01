'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import { Calendar, User, Eye, Tag } from 'lucide-react'
import { format } from 'date-fns'

interface Person {
  _id: string
  firstName: any
  lastName: any
  fullName: any
  nickname?: any
  birthDate?: string
  description?: any
  profileImage?: {
    url: string
    storageProvider: string
    fileId: string
  }
  tags: any[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface PersonCardProps {
  person: Person
  viewMode: 'grid' | 'list'
}

export function PersonCard({ person, viewMode }: PersonCardProps) {
  const { t } = useI18n()
  const { currentLanguage } = useLanguage()
  const [imageError, setImageError] = useState(false)
  
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-4">
          {/* Profile Image */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden">
              {!imageError && person.profileImage?.url ? (
                <Image
                  src={person.profileImage.url}
                  alt={typeof person.fullName === 'string' ? person.fullName : MultiLangUtils.getValue(person.fullName as any, currentLanguage)}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <User className="h-6 w-6" />
                </div>
              )}
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {typeof person.fullName === 'string' ? person.fullName : MultiLangUtils.getValue(person.fullName as any, currentLanguage)}
                </h4>
                {person.nickname && (typeof person.nickname === 'string' ? person.nickname : MultiLangUtils.getValue(person.nickname as any, currentLanguage)) && (
                  <p className="text-sm text-gray-600 truncate">
                    "{typeof person.nickname === 'string' ? person.nickname : MultiLangUtils.getValue(person.nickname as any, currentLanguage)}"
                  </p>
                )}
                {person.description && (typeof person.description === 'string' ? person.description : MultiLangUtils.getValue(person.description as any, currentLanguage)) && (
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {typeof person.description === 'string' ? person.description : MultiLangUtils.getValue(person.description as any, currentLanguage)}
                  </p>
                )}
                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(new Date(person.createdAt), 'MMM dd, yyyy')}
                  </span>
                  {person.birthDate && (
                    <span>
                      Born: {format(new Date(person.birthDate), 'MMM dd, yyyy')}
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    person.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {person.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              <div className="flex-shrink-0 ml-4">
                <Link
                  href={`/admin/people`}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {t('search.view', 'View')}
                </Link>
              </div>
            </div>
            
            {/* Tags */}
            {person.tags && person.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {person.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </span>
                ))}
                {person.tags.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{person.tags.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
      {/* Profile Image */}
      <div className="aspect-square bg-gray-200 relative">
        {!imageError && person.profileImage?.url ? (
          <Image
            src={person.profileImage.url}
            alt={typeof person.fullName === 'string' ? person.fullName : MultiLangUtils.getValue(person.fullName as any, currentLanguage)}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <User className="h-12 w-12" />
          </div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
          <Link
            href={`/admin/people`}
            className="opacity-0 hover:opacity-100 transition-opacity duration-200 inline-flex items-center px-3 py-1 bg-white rounded-md text-sm font-medium text-gray-700"
          >
            <Eye className="h-4 w-4 mr-1" />
            {t('search.view', 'View')}
          </Link>
        </div>
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded-full">
          {person.isActive ? 'Active' : 'Inactive'}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3">
        <h4 className="text-sm font-medium text-gray-900 truncate mb-1">
          {typeof person.fullName === 'string' ? person.fullName : MultiLangUtils.getValue(person.fullName as any, currentLanguage)}
        </h4>
        {person.nickname && (typeof person.nickname === 'string' ? person.nickname : MultiLangUtils.getValue(person.nickname as any, currentLanguage)) && (
          <p className="text-xs text-gray-600 truncate mb-2">
            "{typeof person.nickname === 'string' ? person.nickname : MultiLangUtils.getValue(person.nickname as any, currentLanguage)}"
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {format(new Date(person.createdAt), 'MMM dd')}
          </span>
          {person.birthDate && (
            <span>
              {format(new Date(person.birthDate), 'MMM dd')}
            </span>
          )}
        </div>
        
        {/* Tags */}
        {person.tags && person.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {person.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </span>
            ))}
            {person.tags.length > 2 && (
              <span className="text-xs text-gray-500">
                +{person.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
