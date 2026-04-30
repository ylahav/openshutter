import { Schema, Document } from 'mongoose';

export interface IContactSubmission extends Document {
  name: string;
  email: string;
  phone?: string;
  message: string;
  pageAlias?: string;
  sourceUrl?: string;
  ownerSiteId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const ContactSubmissionSchema = new Schema<IContactSubmission>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 320, index: true },
    phone: { type: String, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    pageAlias: { type: String, trim: true, lowercase: true, maxlength: 200, index: true },
    sourceUrl: { type: String, trim: true, maxlength: 200 },
    ownerSiteId: { type: String, trim: true, maxlength: 64, index: true },
  },
  { timestamps: true },
);

ContactSubmissionSchema.index({ createdAt: -1 });
