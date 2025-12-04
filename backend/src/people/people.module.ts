import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PeopleController } from './people.controller';
import { PersonSchema } from '../models/Person';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Person', schema: PersonSchema },
    ]),
  ],
  controllers: [PeopleController],
  providers: [],
  exports: [],
})
export class PeopleModule {}

