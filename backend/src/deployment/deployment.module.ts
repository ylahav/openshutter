import { Module } from '@nestjs/common';
import { DeploymentController } from './deployment.controller';

@Module({
	controllers: [DeploymentController],
	providers: [],
	exports: [],
})
export class DeploymentModule {}

