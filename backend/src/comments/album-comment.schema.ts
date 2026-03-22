import { Schema, Document, Types } from 'mongoose';

export interface IAlbumComment extends Document {
  albumId: Types.ObjectId;
  authorId: Types.ObjectId;
  body: string;
  hidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const AlbumCommentSchema = new Schema<IAlbumComment>(
  {
    albumId: { type: Schema.Types.ObjectId, ref: 'Album', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    hidden: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

AlbumCommentSchema.index({ albumId: 1, createdAt: -1 });
