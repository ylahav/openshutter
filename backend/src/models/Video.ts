import mongoose, { Document, Schema, Types } from 'mongoose'

export interface IVideo extends Document {
  title: Record<string, string>
  description: Record<string, string>
  filename: string
  originalFilename: string
  mimeType: string
  size: number
  hash?: string
  duration?: number
  dimensions?: {
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
    storageOwnerId?: string
  }
  albumId?: Types.ObjectId
  tags: Types.ObjectId[]
  people: Types.ObjectId[]
  location?: Types.ObjectId | null
  isPublished: boolean
  uploadedBy: Types.ObjectId
  uploadedAt: Date
  updatedAt: Date
}

export const VideoSchema = new Schema<IVideo>(
  {
    title: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    description: {
      type: Schema.Types.Mixed,
      default: {},
    },
    filename: {
      type: String,
      required: true,
      unique: true,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    hash: {
      type: String,
      index: true,
    },
    duration: {
      type: Number,
    },
    dimensions: {
      width: { type: Number },
      height: { type: Number },
    },
    storage: {
      provider: { type: String, required: true },
      fileId: { type: String, required: true },
      url: { type: String, required: true },
      bucket: String,
      folderId: String,
      path: { type: String, required: true },
      storageOwnerId: String,
    },
    albumId: {
      type: Schema.Types.ObjectId,
      ref: 'Album',
    },
    tags: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Tag',
        default: [],
      },
    ],
    people: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Person',
        default: [],
      },
    ],
    location: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      default: null,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

VideoSchema.index({ albumId: 1 })
VideoSchema.index({ uploadedBy: 1 })
VideoSchema.index({ isPublished: 1 })
VideoSchema.index({ uploadedAt: -1 })
VideoSchema.index({ originalFilename: 1, size: 1 })
VideoSchema.index({ tags: 1 })
VideoSchema.index({ people: 1 })
VideoSchema.index({ location: 1 })

export const VideoModel = mongoose.models.Video || mongoose.model<IVideo>('Video', VideoSchema)
