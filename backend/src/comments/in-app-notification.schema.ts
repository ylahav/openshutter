import { Schema, Document, Types } from 'mongoose';

export type InAppNotificationKind = 'comment_mention';

export interface IInAppNotification extends Document {
  userId: Types.ObjectId;
  kind: InAppNotificationKind;
  title: string;
  body: string;
  linkPath: string;
  read: boolean;
  createdAt: Date;
}

export const InAppNotificationSchema = new Schema<IInAppNotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, required: true, enum: ['comment_mention'] },
    title: { type: String, required: true },
    body: { type: String, required: true },
    linkPath: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

InAppNotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
