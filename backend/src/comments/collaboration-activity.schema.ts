import { Schema, Document, Types } from 'mongoose';

export type CollaborationActivityType =
  | 'comment_added'
  | 'comment_reply'
  | 'task_created'
  | 'task_completed'
  | 'approval_updated';

export interface ICollaborationActivity extends Document {
  albumId: Types.ObjectId;
  type: CollaborationActivityType;
  actorUserId: Types.ObjectId;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export const CollaborationActivitySchema = new Schema<ICollaborationActivity>(
  {
    albumId: { type: Schema.Types.ObjectId, ref: 'Album', required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ['comment_added', 'comment_reply', 'task_created', 'task_completed', 'approval_updated'],
    },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

CollaborationActivitySchema.index({ albumId: 1, createdAt: -1 });
