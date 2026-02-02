import mongoose, { Schema, Document } from 'mongoose'

// Define User interface locally
export interface User {
  _id: string
  name: Record<string, any>
  username: string
  passwordHash: string
  role: 'admin' | 'owner' | 'guest'
  groupAliases: string[]
  blocked: boolean
  allowedStorageProviders: string[]
  forcePasswordChange?: boolean
  preferredLanguage?: string
  createdAt: Date
  updatedAt: Date
}

export interface IUserDocument extends Omit<User, '_id'>, Document {
  _id: any
}

const UserSchema = new Schema<IUserDocument>({
  name: {
    type: Schema.Types.Mixed,
    required: true,
    default: {}
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'owner', 'guest'],
    default: 'guest'
  },
  groupAliases: [{
    type: String,
    trim: true
  }],
  blocked: {
    type: Boolean,
    default: false
  },
  allowedStorageProviders: [{
    type: String,
    trim: true
  }],
  forcePasswordChange: {
    type: Boolean,
    default: false
  },
  preferredLanguage: {
    type: String,
    trim: true,
    default: ''
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

// Update timestamps
UserSchema.pre('save', function() {
  this.updatedAt = new Date()
})

// Indexes for performance
// Note: username index is already defined as unique: true in the schema
UserSchema.index({ role: 1 })
UserSchema.index({ blocked: 1 })

export const UserModel = mongoose.models.User || 
  mongoose.model<IUserDocument>('User', UserSchema)

export { UserSchema }
