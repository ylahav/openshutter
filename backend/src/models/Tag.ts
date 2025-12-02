import mongoose, { Document, Schema, Types } from 'mongoose'

export interface ITag extends Document {
  name: string
  description?: string
  color?: string
  category?: string
  isActive: boolean
  usageCount: number
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export const TagSchema = new Schema<ITag>({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
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

// Text search index
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
