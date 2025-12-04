import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupsController } from './groups.controller';
import { GroupSchema } from '../models/Group';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Group', schema: GroupSchema },
    ]),
  ],
  controllers: [GroupsController],
  providers: [],
  exports: [],
})
export class GroupsModule {}
