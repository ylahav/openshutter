import { Module } from '@nestjs/common';
import { TemplateBuilderController } from './template-builder.controller';
import { TemplateBuilderService } from './template-builder.service';

@Module({
  controllers: [TemplateBuilderController],
  providers: [TemplateBuilderService],
  exports: [TemplateBuilderService],
})
export class TemplateBuilderModule {}
