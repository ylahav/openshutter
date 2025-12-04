import mongoose, { Schema, Document, Types } from 'mongoose';
import { MultiLangText, MultiLangHTML } from '../types/multi-lang';

// Simple schema for multi-language text
const MultiLangTextSchema = new Schema({
  en: { type: String, default: '' },
  he: { type: String, default: '' },
}, { _id: false });

// Simple schema for multi-language HTML
const MultiLangHTMLSchema = new Schema({
  en: { type: String, default: '' },
  he: { type: String, default: '' },
}, { _id: false });

export interface IPage extends Document {
  title: MultiLangText;
  subtitle?: MultiLangText;
  alias: string;
  leadingImage?: string;
  introText?: MultiLangHTML;
  content?: MultiLangHTML;
  category: 'system' | 'site';
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
}

export const PageSchema = new Schema<IPage>({
  title: {
    type: MultiLangTextSchema,
    required: true,
  },
  subtitle: {
    type: MultiLangTextSchema,
  },
  alias: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  leadingImage: {
    type: String,
    trim: true,
  },
  introText: {
    type: MultiLangHTMLSchema,
  },
  content: {
    type: MultiLangHTMLSchema,
  },
  category: {
    type: String,
    required: true,
    enum: ['system', 'site'],
    default: 'site',
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Update timestamps
PageSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// Indexes for performance
PageSchema.index({ alias: 1 });
PageSchema.index({ category: 1 });
PageSchema.index({ isPublished: 1 });

export const PageModel = mongoose.models.Page || mongoose.model<IPage>('Page', PageSchema);
