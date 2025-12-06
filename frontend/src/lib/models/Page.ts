import mongoose, { Schema, Document } from 'mongoose';
import type { MultiLangText, MultiLangHTML } from '../types/multi-lang';

export interface IPage extends Document {
	title: string | MultiLangText;
	subtitle?: string | MultiLangText;
	alias: string;
	leadingImage?: string;
	introText?: string | MultiLangHTML;
	content?: string | MultiLangHTML;
	category: 'system' | 'site';
	isPublished: boolean;
	createdAt: Date;
	updatedAt: Date;
	createdBy: string;
	updatedBy: string;
}

const PageSchema = new Schema<IPage>(
	{
		title: {
			type: Schema.Types.Mixed,
			required: true
		},
		subtitle: {
			type: Schema.Types.Mixed
		},
		alias: {
			type: String,
			required: true,
			unique: true,
			trim: true
		},
		leadingImage: {
			type: String
		},
		introText: {
			type: Schema.Types.Mixed
		},
		content: {
			type: Schema.Types.Mixed
		},
		category: {
			type: String,
			required: true,
			enum: ['system', 'site'],
			default: 'site'
		},
		isPublished: {
			type: Boolean,
			default: false
		},
		createdBy: {
			type: String,
			required: true
		},
		updatedBy: {
			type: String,
			required: true
		}
	},
	{
		timestamps: true
	}
);

// Indexes for performance
PageSchema.index({ alias: 1 });
PageSchema.index({ category: 1 });
PageSchema.index({ isPublished: 1 });

export const PageModel = mongoose.models.Page || mongoose.model<IPage>('Page', PageSchema);

export interface Page {
  _id: string
  title: MultiLangText
  subtitle?: MultiLangText
  alias: string
  leadingImage?: string
  introText?: MultiLangHTML
  content?: MultiLangHTML
  category: 'system' | 'site'
  isPublished: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

export interface PageCreate {
  title: MultiLangText
  subtitle?: MultiLangText
  alias: string
  leadingImage?: string
  introText?: MultiLangHTML
  content?: MultiLangHTML
  category: 'system' | 'site'
  isPublished?: boolean
}

export interface PageUpdate {
  title?: MultiLangText
  subtitle?: MultiLangText
  alias?: string
  leadingImage?: string
  introText?: MultiLangHTML
  content?: MultiLangHTML
  category?: 'system' | 'site'
  isPublished?: boolean
}
