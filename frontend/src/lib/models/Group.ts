import mongoose, { Schema, Document } from 'mongoose';
import type { MultiLangText } from '../types/multi-lang';

export interface IGroup extends Document {
	alias: string;
	name: string | MultiLangText;
	createdAt: Date;
	updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
	{
		alias: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			lowercase: true
		},
		name: {
			type: Schema.Types.Mixed,
			required: true
		},
		createdAt: {
			type: Date,
			default: Date.now
		},
		updatedAt: {
			type: Date,
			default: Date.now
		}
	},
	{
		timestamps: true
	}
);

// Update timestamps
GroupSchema.pre('save', function () {
	this.updatedAt = new Date();
});

// Indexes for performance
GroupSchema.index({ alias: 1 });

export const GroupModel = mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema);

