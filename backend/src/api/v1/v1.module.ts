import { Module } from '@nestjs/common';
import { ApiKeysModule } from '../../api-keys/api-keys.module';
import { V1Controller } from './v1.controller';

@Module({
  imports: [ApiKeysModule],
  controllers: [V1Controller],
})
export class V1Module {}
