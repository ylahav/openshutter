import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IInAppNotification } from './in-app-notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel('InAppNotification') private notificationModel: Model<IInAppNotification>,
  ) {}

  async createMention(opts: {
    userId: string;
    title: string;
    body: string;
    linkPath: string;
  }): Promise<void> {
    await this.notificationModel.create({
      userId: new Types.ObjectId(opts.userId),
      kind: 'comment_mention',
      title: opts.title.slice(0, 200),
      body: opts.body.slice(0, 2000),
      linkPath: opts.linkPath.slice(0, 500),
      read: false,
    });
  }

  async listForUser(userId: string, limit = 50): Promise<IInAppNotification[]> {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100))
      .lean()
      .exec() as Promise<IInAppNotification[]>;
  }

  async markRead(userId: string, id: string): Promise<void> {
    const res = await this.notificationModel
      .updateOne(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { $set: { read: true } },
      )
      .exec();
    if (res.matchedCount === 0) {
      throw new NotFoundException('Notification not found');
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationModel
      .updateMany({ userId: new Types.ObjectId(userId), read: false }, { $set: { read: true } })
      .exec();
  }
}
