import mongoose, { Schema, Model } from 'mongoose'

export interface ContactMessageDocument {
  _id?: string
  name: string
  email: string
  subject?: string
  request?: string
  ip?: string
  createdAt: Date
}

const ContactMessageSchema = new Schema<ContactMessageDocument>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  subject: { type: String, default: '' },
  request: { type: String, default: '' },
  ip: { type: String, default: '' },
  createdAt: { type: Date, default: () => new Date() }
})

export const ContactMessage: Model<ContactMessageDocument> =
  mongoose.models.ContactMessage || mongoose.model<ContactMessageDocument>('ContactMessage', ContactMessageSchema)
