import mongoose, { Schema, Document } from 'mongoose'
import { MultiLangText } from '../types/multi-lang'

// Simple schema for multi-language text
const MultiLangTextSchema = new Schema({
  en: { type: String, default: '' },
  he: { type: String, default: '' }
}, { _id: false })

export interface IBlogCategory extends Document {
  _id: any
  alias: string
  title: MultiLangText
  description?: MultiLangText
  leadingImage?: {
    url: string
    alt: MultiLangText
    storageProvider: string
    storagePath: string
  }
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export const BlogCategorySchema = new Schema<IBlogCategory>({
  alias: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  title: {
    type: MultiLangTextSchema,
    required: true
  },
  description: {
    type: MultiLangTextSchema
  },
  leadingImage: {
    url: { type: String },
    alt: { type: MultiLangTextSchema },
    storageProvider: { type: String },
    storagePath: { type: String }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

BlogCategorySchema.pre('save', async function() {
  this.updatedAt = new Date()
})

// Ensure the model is registered with the correct collection name
export const BlogCategoryModel = mongoose.models.BlogCategory ||
  mongoose.model<IBlogCategory>('BlogCategory', BlogCategorySchema, 'blogcategories')
