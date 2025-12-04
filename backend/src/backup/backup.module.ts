import { Module } from '@nestjs/common';
import { BackupController } from './backup.controller';

@Module({
  controllers: [BackupController],
  providers: [],
  exports: [],
})
export class BackupModule {}

