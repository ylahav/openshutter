import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserSchema } from '../models/User';
import { OptionalAdminGuard } from '../common/guards/optional-admin.guard';
import { LoginRateLimitGuard } from '../common/guards/login-rate-limit.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
  ],
  controllers: [AuthController],
  providers: [AuthService, OptionalAdminGuard, LoginRateLimitGuard],
  exports: [AuthService],
})
export class AuthModule {}
