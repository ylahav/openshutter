import mongoose, { Document, Schema, Types } from 'mongoose'

export interface ILocation extends Document {
  name: { en?: string; he?: string }
  description?: { en?: string; he?: string }
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  placeId?: string // Google Places ID or similar
  category: string
  isActive: boolean
  usageCount: number
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const LocationSchema = new Schema<ILocation>({
  name: {
    en: { type: String, trim: true },
    he: { type: String, trim: true }
  },
  description: {
    en: { type: String, trim: true },
    he: { type: String, trim: true }
  },
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true
  },
  postalCode: {
    type: String,
    trim: true
  },
  coordinates: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    }
  },
  placeId: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true,
    enum: ['city', 'landmark', 'venue', 'outdoor', 'indoor', 'travel', 'home', 'work', 'custom'],
    default: 'custom'
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
LocationSchema.index({ name: 1 })
LocationSchema.index({ city: 1 })
LocationSchema.index({ country: 1 })
LocationSchema.index({ category: 1 })
LocationSchema.index({ isActive: 1 })
LocationSchema.index({ usageCount: -1 })
LocationSchema.index({ createdBy: 1 })

// Geospatial index for coordinates
LocationSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 })

// Text search index
LocationSchema.index({
  name: 'text',
  description: 'text',
  address: 'text',
  city: 'text',
  state: 'text',
  country: 'text'
})

// Update usage count when location is used
LocationSchema.methods.incrementUsage = function() {
  this.usageCount += 1
  return this.save()
}

LocationSchema.methods.decrementUsage = function() {
  this.usageCount = Math.max(0, this.usageCount - 1)
  return this.save()
}

export const LocationModel = mongoose.models.Location || mongoose.model<ILocation>('Location', LocationSchema)
