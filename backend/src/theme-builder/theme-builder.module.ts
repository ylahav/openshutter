import { Module } from '@nestjs/common';
import { ThemeBuilderController } from './theme-builder.controller';
import { ThemeBuilderService } from './theme-builder.service';

@Module({
  controllers: [ThemeBuilderController],
  providers: [ThemeBuilderService],
  exports: [ThemeBuilderService],
})
export class ThemeBuilderModule {}
