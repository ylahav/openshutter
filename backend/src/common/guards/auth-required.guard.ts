import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/** Use after OptionalAdminGuard. Requires req.user (valid JWT). */
@Injectable()
export class AuthRequiredGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }
    return true;
  }
}
