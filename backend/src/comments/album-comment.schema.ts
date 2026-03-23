import { Schema, Document, Types } from 'mongoose';

const ReportedBySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

export interface IAlbumComment extends Document {
  albumId: Types.ObjectId;
  /** Optional: comment on a specific photo within the album */
  photoId?: Types.ObjectId | null;
  authorId: Types.ObjectId;
  body: string;
  hidden: boolean;
  /** Reply to a top-level comment only (max depth: 2) */
  parentCommentId?: Types.ObjectId | null;
  mentionUserIds: Types.ObjectId[];
  reportedBy: Array<{ userId: Types.ObjectId; createdAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

export const AlbumCommentSchema = new Schema<IAlbumComment>(
  {
    albumId: { type: Schema.Types.ObjectId, ref: 'Album', required: true, index: true },
    photoId: { type: Schema.Types.ObjectId, ref: 'Photo', default: null, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    hidden: { type: Boolean, default: false, index: true },
    parentCommentId: { type: Schema.Types.ObjectId, ref: 'AlbumComment', default: null, index: true },
    mentionUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reportedBy: { type: [ReportedBySchema], default: [] },
  },
  { timestamps: true },
);

AlbumCommentSchema.index({ albumId: 1, createdAt: -1 });
AlbumCommentSchema.index({ albumId: 1, photoId: 1, createdAt: -1 });
