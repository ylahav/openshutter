import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { UserSchema } from '../models/User';
import { DatabaseInitService } from './database-init.service';
import { DatabaseInitController } from './database-init.controller';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('mongodb.uri'),
      }),
    }),
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
    ]),
  ],
  providers: [DatabaseInitService],
  controllers: [DatabaseInitController],
  exports: [DatabaseInitService],
})
export class DatabaseModule {}
