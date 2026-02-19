import { Schema, Document } from 'mongoose';

export type MarketplaceCategory = 'integration' | 'tool' | 'app' | 'script' | 'theme';

export interface IMarketplaceListing extends Document {
  name: string;
  description: string;
  category: MarketplaceCategory;
  developerName: string;
  developerEmail: string;
  version: string;
  apiVersionCompatible: string[];
  screenshots: string[];
  documentationUrl?: string;
  downloadUrl?: string;
  repositoryUrl?: string;
  isApproved: boolean;
  submittedBy: Schema.Types.ObjectId;
  approvedBy?: Schema.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const MarketplaceListingSchema = new Schema<IMarketplaceListing>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ['integration', 'tool', 'app', 'script', 'theme'],
    },
    developerName: { type: String, required: true, trim: true },
    developerEmail: { type: String, required: true, trim: true },
    version: { type: String, required: true, default: '1.0.0' },
    apiVersionCompatible: { type: [String], default: ['v1'] },
    screenshots: { type: [String], default: [] },
    documentationUrl: { type: String },
    downloadUrl: { type: String },
    repositoryUrl: { type: String },
    isApproved: { type: Boolean, default: false },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true },
);

MarketplaceListingSchema.index({ isApproved: 1, category: 1 });
MarketplaceListingSchema.index({ isApproved: 1 });
