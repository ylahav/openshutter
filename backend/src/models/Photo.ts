import mongoose, { Document, Schema, Types } from 'mongoose'

export interface IPhoto extends Document {
  title: Record<string, string>
  description: Record<string, string>
  filename: string
  originalFilename: string
  mimeType: string
  size: number
  hash?: string // SHA-256 hash for duplicate detection
  dimensions: {
    width: number
    height: number
  }
  storage: {
    provider: string
    fileId: string
    url: string
    bucket?: string
    folderId?: string
    path: string
    thumbnailPath: string
  }
  albumId?: Types.ObjectId
  tags: Types.ObjectId[] // References to Tag documents
  people: Types.ObjectId[] // References to Person documents
  location?: Types.ObjectId // Reference to Location document
  isPublished: boolean
  isLeading: boolean
  isGalleryLeading: boolean
  uploadedBy: Types.ObjectId
  uploadedAt: Date
  updatedAt: Date
  exif?: {
    make?: string
    model?: string
    dateTime?: Date
    exposureTime?: string
    fNumber?: number
    iso?: number
    focalLength?: number
    gps?: {
      latitude?: number
      longitude?: number
      altitude?: number
    }
    software?: string
    copyright?: string
    [key: string]: any
  }
  metadata?: {
    location?: string
    category?: string
    rating?: number
    [key: string]: any
  }
  faceRecognition?: {
    faces: Array<{
      descriptor: number[] // 128D face descriptor vector
      box: {
        x: number
        y: number
        width: number
        height: number
      }
      landmarks?: {
        leftEye: { x: number; y: number }
        rightEye: { x: number; y: number }
        nose: { x: number; y: number }
        mouth: { x: number; y: number }
      }
      detectedAt: Date
      matchedPersonId?: Types.ObjectId // Reference to Person if matched
      confidence?: number // Match confidence score
    }>
    processedAt?: Date
    modelVersion?: string
  }
}

export const PhotoSchema = new Schema<IPhoto>({
  title: {
    type: Schema.Types.Mixed,
    required: true,
    default: {}
  },
  description: {
    type: Schema.Types.Mixed,
    default: {}
  },
  filename: {
    type: String,
    required: true,
    unique: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  hash: {
    type: String,
    index: true
  },
  dimensions: {
    width: { type: Number, required: true },
    height: { type: Number, required: true }
  },
  storage: {
    provider: { type: String, required: true },
    fileId: { type: String, required: true },
    url: { type: String, required: true },
    bucket: String,
    folderId: String,
    path: { type: String, required: true },
    thumbnailPath: { type: String, required: true }
  },
  albumId: {
    type: Schema.Types.ObjectId,
    ref: 'Album'
  },
  tags: [{
    type: Schema.Types.ObjectId,
    ref: 'Tag',
    default: []
  }],
  people: [{
    type: Schema.Types.ObjectId,
    ref: 'Person',
    default: []
  }],
  location: {
    type: Schema.Types.ObjectId,
    ref: 'Location'
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  isLeading: {
    type: Boolean,
    default: false
  },
  isGalleryLeading: {
    type: Boolean,
    default: false
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  exif: {
    make: String,
    model: String,
    dateTime: Date,
    exposureTime: String,
    fNumber: Number,
    iso: Number,
    focalLength: Number,
    gps: {
      latitude: Number,
      longitude: Number,
      altitude: Number
    },
    software: String,
    copyright: String
  },
  metadata: {
    location: String,
    category: String,
    rating: Number
  },
  faceRecognition: {
    faces: [{
      descriptor: [Number], // 128D face descriptor vector
      box: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      },
      landmarks: {
        leftEye: { x: Number, y: Number },
        rightEye: { x: Number, y: Number },
        nose: { x: Number, y: Number },
        mouth: { x: Number, y: Number }
      },
      detectedAt: { type: Date, default: Date.now },
      matchedPersonId: { type: Schema.Types.ObjectId, ref: 'Person' },
      confidence: Number
    }],
    processedAt: Date,
    modelVersion: String
  }
}, {
  timestamps: true
})

// Indexes
PhotoSchema.index({ albumId: 1 })
PhotoSchema.index({ uploadedBy: 1 })
PhotoSchema.index({ people: 1 })
PhotoSchema.index({ tags: 1 })
PhotoSchema.index({ location: 1 })
PhotoSchema.index({ isPublished: 1 })
PhotoSchema.index({ uploadedAt: -1 })
// hash index is defined on the field with index: true above
PhotoSchema.index({ originalFilename: 1, size: 1 }) // For duplicate detection by filename + size
// filename index is already defined as unique: true in the schema



export const PhotoModel = mongoose.models.Photo || 
  mongoose.model<IPhoto>('Photo', PhotoSchema)
