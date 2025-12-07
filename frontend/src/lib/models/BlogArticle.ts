import mongoose, { Schema, Document } from 'mongoose'
import { MultiLangText } from '$lib/types/multi-lang'

export interface IBlogArticle extends Document {
  _id: any
  title: MultiLangText
  slug: string
  leadingImage?: {
    url: string
    alt: MultiLangText
    storageProvider: string
    storagePath: string
  }
  category: string
  tags: string[]
  content: MultiLangText
  excerpt?: MultiLangText
  isPublished: boolean
  isFeatured: boolean
  authorId: string
  publishedAt?: Date
  createdAt: Date
  updatedAt: Date
  viewCount: number
  seoTitle?: MultiLangText
  seoDescription?: MultiLangText
}

const BlogArticleSchema = new Schema<IBlogArticle>({
  title: {
    type: Schema.Types.Mixed,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  leadingImage: {
    url: String,
    alt: Schema.Types.Mixed,
    storageProvider: {
      type: String,
      enum: ['google-drive', 'aws-s3', 'local'],
      default: 'local'
    },
    storagePath: String
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  content: {
    type: Schema.Types.Mixed,
    required: true
  },
  excerpt: {
    type: Schema.Types.Mixed
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  authorId: {
    type: String,
    required: true
  },
  publishedAt: {
    type: Date
  },
  viewCount: {
    type: Number,
    default: 0
  },
  seoTitle: {
    type: Schema.Types.Mixed
  },
  seoDescription: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
})

// Update timestamps
BlogArticleSchema.pre('save', async function() {
  this.updatedAt = new Date()
  
  // Set publishedAt when article is published
  if (this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date()
  }
})

// Indexes for performance
// Note: slug index is automatically created by unique: true in schema
BlogArticleSchema.index({ authorId: 1 })
BlogArticleSchema.index({ category: 1 })
BlogArticleSchema.index({ tags: 1 })
BlogArticleSchema.index({ isPublished: 1 })
BlogArticleSchema.index({ isFeatured: 1 })
BlogArticleSchema.index({ publishedAt: -1 })
BlogArticleSchema.index({ createdAt: -1 })

// Method to generate slug from title
BlogArticleSchema.methods.generateSlug = function(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim()
}

// Method to increment view count
BlogArticleSchema.methods.incrementViewCount = function() {
  this.viewCount += 1
  return this.save()
}

// Static method to find published articles
BlogArticleSchema.statics.findPublished = function() {
  return this.find({ isPublished: true }).sort({ publishedAt: -1 })
}

// Static method to find by category
BlogArticleSchema.statics.findByCategory = function(category: string) {
  return this.find({ category, isPublished: true }).sort({ publishedAt: -1 })
}

// Static method to find by author
BlogArticleSchema.statics.findByAuthor = function(authorId: string) {
  return this.find({ authorId }).sort({ createdAt: -1 })
}

export const BlogArticleModel = mongoose.models.BlogArticle || 
  mongoose.model<IBlogArticle>('BlogArticle', BlogArticleSchema)
