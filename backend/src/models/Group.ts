import mongoose, { Document, Schema } from 'mongoose';

export interface IGroup extends Document {
  alias: string;
  name: { en?: string; he?: string };
  createdAt: Date;
  updatedAt: Date;
}

export const GroupSchema = new Schema<IGroup>({
  alias: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  name: {
    en: { type: String, trim: true },
    he: { type: String, trim: true },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Update timestamps
GroupSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// Indexes for performance
// Note: alias index is automatically created by unique: true, so we don't need to add it again

export const GroupModel = mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema);
