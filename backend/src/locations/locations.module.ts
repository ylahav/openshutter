import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LocationsController } from './locations.controller';
import { LocationSchema } from '../models/Location';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Location', schema: LocationSchema },
    ]),
  ],
  controllers: [LocationsController],
  providers: [],
  exports: [],
})
export class LocationsModule {}

