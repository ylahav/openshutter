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
  slug: string;
  /** Optional application-reserved identity for predefined pages. */
  pageRole?: 'home' | 'gallery' | 'login' | 'search' | 'blog' | 'album' | 'blog-category' | 'blog-article';
  /** Optional parent page reference for nested page trees. */
  parentPageId?: Types.ObjectId | null;
  /** Optional route parameter names for dynamic path resolution. */
  routeParams?: string[];
  /** Optional: per-page template pack override (`noir` | `studio` | `atelier`). */
  frontendTemplate?: string;
  /** Optional multi-pack assignment (`noir` | `studio` | `atelier`). Empty = default variant. */
  frontendTemplates?: string[];
  leadingImage?: string;
  introText?: MultiLangHTML;
  content?: MultiLangHTML;
  layout?: {
    zones: string[];
  };
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
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  pageRole: {
    type: String,
    enum: ['home', 'gallery', 'login', 'search', 'blog', 'album', 'blog-category', 'blog-article'],
    trim: true,
    lowercase: true,
  },
  parentPageId: {
    type: Schema.Types.ObjectId,
    ref: 'Page',
    default: null,
  },
  routeParams: {
    type: [String],
    default: undefined,
  },
  frontendTemplate: {
    type: String,
    trim: true,
    lowercase: true,
  },
  frontendTemplates: {
    type: [String],
    default: undefined,
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
  layout: {
    zones: {
      type: [String],
      default: ['main'],
    },
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
// Note: alias and slug indexes are automatically created by unique: true on those fields
PageSchema.index({ category: 1 });
PageSchema.index({ isPublished: 1 });
/** Reserved-role lookups by pack happen in controller (array overlap checks are app-level validation). */
PageSchema.index({ pageRole: 1 }, { sparse: true });
PageSchema.index({ pageRole: 1, frontendTemplate: 1 });
PageSchema.index({ pageRole: 1, frontendTemplates: 1 });
PageSchema.index({ parentPageId: 1 });

export const PageModel = mongoose.models.Page || mongoose.model<IPage>('Page', PageSchema);
