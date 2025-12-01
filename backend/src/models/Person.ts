import mongoose, { Document, Schema, Types } from 'mongoose'

// Define MultiLangText locally
export interface MultiLangText {
  [key: string]: string
}

export interface IPerson extends Document {
  firstName: MultiLangText
  lastName: MultiLangText
  fullName: MultiLangText
  nickname?: MultiLangText
  birthDate?: Date
  description?: MultiLangText
  profileImage?: {
    url: string
    storageProvider: string
    fileId: string
  }
  faceRecognition?: {
    descriptor: number[] // 128D face descriptor vector
    extractedAt?: Date
    modelVersion?: string
  }
  tags: Types.ObjectId[] // References to Tag collection
  isActive: boolean
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const PersonSchema = new Schema<IPerson>({
  firstName: {
    type: Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function(v: any) {
        return v && typeof v === 'object' && Object.keys(v).length > 0
      },
      message: 'First name must be provided in at least one language'
    }
  },
  lastName: {
    type: Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function(v: any) {
        return v && typeof v === 'object' && Object.keys(v).length > 0
      },
      message: 'Last name must be provided in at least one language'
    }
  },
  fullName: {
    type: Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function(v: any) {
        return v && typeof v === 'object' && Object.keys(v).length > 0
      },
      message: 'Full name must be provided in at least one language'
    }
  },
  nickname: {
    type: Schema.Types.Mixed,
    default: {}
  },
  birthDate: {
    type: Date
  },
  description: {
    type: Schema.Types.Mixed,
    default: {}
  },
  profileImage: {
    url: String,
    storageProvider: String,
    fileId: String
  },
  faceRecognition: {
    descriptor: [Number], // 128D face descriptor vector
    extractedAt: Date,
    modelVersion: String
  },
  tags: [{
    type: Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

// Create fullName before saving
PersonSchema.pre('save', async function() {
  if (this.firstName && this.lastName) {
    this.fullName = {}
    
    // Get all languages from both firstName and lastName
    const allLanguages = new Set([
      ...Object.keys(this.firstName),
      ...Object.keys(this.lastName)
    ])
    
    // Create fullName for each language
    allLanguages.forEach(lang => {
      const firstName = this.firstName[lang] || ''
      const lastName = this.lastName[lang] || ''
      this.fullName[lang] = `${firstName} ${lastName}`.trim()
    })
  }
})

// Indexes for performance
PersonSchema.index({ firstName: 1, lastName: 1 })
PersonSchema.index({ fullName: 1 })
PersonSchema.index({ nickname: 1 })
PersonSchema.index({ tags: 1 })
PersonSchema.index({ isActive: 1 })
PersonSchema.index({ createdBy: 1 })

// Text search index - using wildcard to index all language fields
PersonSchema.index({
  'firstName.*': 'text',
  'lastName.*': 'text',
  'fullName.*': 'text',
  'nickname.*': 'text',
  'description.*': 'text'
})

export const PersonModel = mongoose.models.Person || mongoose.model<IPerson>('Person', PersonSchema)
