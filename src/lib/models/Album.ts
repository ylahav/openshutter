import mongoose, { Schema, Document, Types } from 'mongoose'
import { Album } from '@/types'

export interface IAlbum extends Omit<Album, '_id' | 'createdBy' | 'parentAlbumId' | 'coverPhotoId' | 'allowedUsers'>, Document {
  _id: Types.ObjectId
  createdBy: Types.ObjectId
  parentAlbumId?: Types.ObjectId
  coverPhotoId?: Types.ObjectId
  allowedUsers?: Types.ObjectId[]
}

const AlbumSchema = new Schema<IAlbum>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  alias: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  storageProvider: {
    type: String,
    required: true,
    enum: ['google-drive', 'aws-s3', 'local'],
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
    type: String,
    trim: true
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
AlbumSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

// Indexes for performance
AlbumSchema.index({ parentAlbumId: 1, order: 1 })
AlbumSchema.index({ level: 1 })
AlbumSchema.index({ isPublic: 1 })
AlbumSchema.index({ isFeatured: 1 })
AlbumSchema.index({ firstPhotoDate: 1 })
AlbumSchema.index({ lastPhotoDate: 1 })

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
