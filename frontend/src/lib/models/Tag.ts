import mongoose, { Document, Schema, Types } from 'mongoose'
import type { MultiLangText } from '../types/multi-lang'

export interface ITag extends Document {
  name: string | MultiLangText
  description?: string | MultiLangText
  color?: string
  category?: string
  isActive: boolean
  usageCount: number
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const TagSchema = new Schema<ITag>({
  name: {
    type: Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function(v: any) {
        // Allow string or MultiLangText object
        if (typeof v === 'string') return v.trim().length > 0
        if (typeof v === 'object' && v !== null) {
          // Check if it's a MultiLangText object (has at least one language key)
          const langs = Object.keys(v).filter(k => {
            const val = v[k];
            return typeof val === 'string' && val.trim().length > 0;
          })
          return langs.length > 0
        }
        return false
      },
      message: 'Tag name must be a non-empty string or multi-language object'
    }
  },
  description: {
    type: Schema.Types.Mixed,
    validate: {
      validator: function(v: any) {
        if (!v) return true // Optional field
        // Allow string or MultiLangText object
        if (typeof v === 'string') return true
        if (typeof v === 'object' && v !== null) {
          // Check if it's a MultiLangText object
          return Object.values(v).some(val => typeof val === 'string')
        }
        return false
      },
      message: 'Tag description must be a string or multi-language object'
    }
  },
  color: {
    type: String,
    trim: true,
    default: '#3B82F6' // Default blue color
  },
  category: {
    type: String,
    trim: true,
    enum: ['general', 'location', 'event', 'object', 'mood', 'technical', 'custom'],
    default: 'general'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

// Indexes for performance
// Note: name index is already defined as unique: true in the schema
TagSchema.index({ category: 1 })
TagSchema.index({ isActive: 1 })
TagSchema.index({ usageCount: -1 })
TagSchema.index({ createdBy: 1 })

// Text search index - Note: MongoDB text search works with string fields
// For multi-language fields, we'll need to handle search differently
// Keeping this for backward compatibility with string-based tags
TagSchema.index({
  name: 'text',
  description: 'text'
})

// Update usage count when tag is used
TagSchema.methods.incrementUsage = function() {
  this.usageCount += 1
  return this.save()
}

TagSchema.methods.decrementUsage = function() {
  this.usageCount = Math.max(0, this.usageCount - 1)
  return this.save()
}

export const TagModel = mongoose.models.Tag || mongoose.model<ITag>('Tag', TagSchema)
