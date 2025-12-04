import mongoose, { Document, Schema, Types } from 'mongoose';

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
GroupSchema.index({ alias: 1 });

export const GroupModel = mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema);

