import { Schema, Document, Types } from 'mongoose';

export type AlbumTaskStatus = 'open' | 'done';

export interface IAlbumTask extends Document {
  albumId: Types.ObjectId;
  title: string;
  description?: string;
  status: AlbumTaskStatus;
  dueAt?: Date;
  assignedToUserId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  /** Optional reviewer workflow: none = regular task; pending/approved/rejected = simple approval gate */
  approvalStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export const AlbumTaskSchema = new Schema<IAlbumTask>(
  {
    albumId: { type: Schema.Types.ObjectId, ref: 'Album', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 500 },
    description: { type: String, trim: true, maxlength: 4000 },
    status: { type: String, required: true, enum: ['open', 'done'], default: 'open' },
    dueAt: { type: Date },
    assignedToUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvalStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
  },
  { timestamps: true },
);

AlbumTaskSchema.index({ albumId: 1, status: 1, createdAt: -1 });
