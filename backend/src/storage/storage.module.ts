import { Module } from '@nestjs/common'
import { StorageSchedulerService } from './storage-scheduler.service'

@Module({
  providers: [StorageSchedulerService],
})
export class StorageModule {}
