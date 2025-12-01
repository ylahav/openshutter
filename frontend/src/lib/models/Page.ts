import { Document } from 'mongoose'
import { MultiLangText, MultiLangHTML } from '@/types/multi-lang'

export interface IPage extends Document {
  title: MultiLangText
  subtitle?: MultiLangText
  alias: string
  leadingImage?: string
  introText?: MultiLangHTML
  content?: MultiLangHTML
  category: 'system' | 'site'
  isPublished: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
}

export interface Page {
  _id: string
  title: MultiLangText
  subtitle?: MultiLangText
  alias: string
  leadingImage?: string
  introText?: MultiLangHTML
  content?: MultiLangHTML
  category: 'system' | 'site'
  isPublished: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

export interface PageCreate {
  title: MultiLangText
  subtitle?: MultiLangText
  alias: string
  leadingImage?: string
  introText?: MultiLangHTML
  content?: MultiLangHTML
  category: 'system' | 'site'
  isPublished?: boolean
}

export interface PageUpdate {
  title?: MultiLangText
  subtitle?: MultiLangText
  alias?: string
  leadingImage?: string
  introText?: MultiLangHTML
  content?: MultiLangHTML
  category?: 'system' | 'site'
  isPublished?: boolean
}
