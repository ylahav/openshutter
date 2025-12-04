import { Module } from '@nestjs/common';
import { FaceDetectionController } from './face-detection.controller';
import { FaceDetectionService } from './face-detection.service';

@Module({
	controllers: [FaceDetectionController],
	providers: [FaceDetectionService],
})
export class FaceDetectionModule {}
