import mongoose, { Schema, Document, Types } from 'mongoose'

// Simple schema for multi-language text (unused but kept for potential future use)
// const MultiLangTextSchema = new Schema({
//   en: { type: String, default: '' },
//   he: { type: String, default: '' },
// }, { _id: false });

// Simple schema for multi-language HTML (unused but kept for potential future use)
// const MultiLangHTMLSchema = new Schema({
//   en: { type: String, default: '' },
//   he: { type: String, default: '' },
// }, { _id: false });

// Define interfaces locally instead of importing from @/types
export interface Album {
  _id: string
  name: { en?: string; he?: string } | string
  alias: string
  description?: { en?: string; he?: string } | string
  isPublic: boolean
  isPublished: boolean
  isFeatured: boolean
  storageProvider: 'google-drive' | 'aws-s3' | 'local' | 'backblaze' | 'wasabi'
  storagePath: string
  parentAlbumId?: string
  parentPath?: string
  level: number
  order: number
  coverPhotoId?: string
  photoCount: number
  firstPhotoDate?: Date
  lastPhotoDate?: Date
  createdAt: Date
  updatedAt: Date
  createdBy: string
  tags: string[]
  allowedGroups: string[]
  allowedUsers: string[]
  metadata?: {
    location?: string
    date?: Date
    category?: string
  }
}

export interface IAlbum extends Omit<Album, '_id' | 'createdBy' | 'parentAlbumId' | 'coverPhotoId' | 'allowedUsers'>, Document {
  _id: Types.ObjectId
  createdBy: Types.ObjectId
  parentAlbumId?: Types.ObjectId
  coverPhotoId?: Types.ObjectId
  allowedUsers?: Types.ObjectId[]
}

export const AlbumSchema = new Schema<IAlbum>({
  name: {
    type: Schema.Types.Mixed, // Allow both string and multilingual object
    required: true,
  },
  alias: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: Schema.Types.Mixed, // Allow both string and multilingual object
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  storageProvider: {
    type: String,
    required: true,
    enum: ['google-drive', 'aws-s3', 'local', 'backblaze', 'wasabi'],
    default: 'local'
  },
  storagePath: {
    type: String,
    required: true,
    unique: true
  },
  parentAlbumId: {
    type: Schema.Types.ObjectId,
    ref: 'Album',
    default: null
  },
  parentPath: {
    type: String,
    default: ''
  },
  level: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  coverPhotoId: {
    type: Schema.Types.ObjectId,
    ref: 'Photo',
    default: null
  },
  photoCount: {
    type: Number,
    default: 0
  },
  firstPhotoDate: {
    type: Date,
    default: null
  },
  lastPhotoDate: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: Schema.Types.ObjectId,
    ref: 'Tag',
    default: []
  }],
  // Access control fields
  allowedGroups: [{
    type: String,
    trim: true
  }],
  allowedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  metadata: {
    location: String,
    date: Date,
    category: String
  }
})

// Update timestamps
AlbumSchema.pre('save', function() {
  this.updatedAt = new Date()
})

// Indexes for performance
AlbumSchema.index({ parentAlbumId: 1, order: 1 })
AlbumSchema.index({ level: 1 })
AlbumSchema.index({ isPublic: 1 })
AlbumSchema.index({ isPublished: 1 })
AlbumSchema.index({ isFeatured: 1 })
AlbumSchema.index({ firstPhotoDate: 1 })
AlbumSchema.index({ lastPhotoDate: 1 })
AlbumSchema.index({ tags: 1 })

// Virtual for full path
AlbumSchema.virtual('fullPath').get(function() {
  if (this.parentPath) {
    return `${this.parentPath}/${this.alias}`
  }
  return this.alias
})

// Method to get children
AlbumSchema.methods.getChildren = async function() {
  return await this.model('Album').find({ parentAlbumId: this._id }).sort({ order: 1 })
}

// Method to get siblings
AlbumSchema.methods.getSiblings = async function() {
  if (!this.parentAlbumId) {
    return await this.model('Album').find({ parentAlbumId: null }).sort({ order: 1 })
  }
  return await this.model('Album').find({ parentAlbumId: this.parentAlbumId }).sort({ order: 1 })
}

// Method to get ancestors
AlbumSchema.methods.getAncestors = async function() {
  const ancestors = []
  let current = this
  
  while (current.parentAlbumId) {
    current = await this.model('Album').findById(current.parentAlbumId)
    if (current) {
      ancestors.unshift(current)
    } else {
      break
    }
  }
  
  return ancestors
}

export const AlbumModel = mongoose.models.Album || 
  mongoose.model<IAlbum>('Album', AlbumSchema)
