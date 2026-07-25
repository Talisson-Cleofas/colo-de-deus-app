import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AccessProfile, AuthenticatedUser } from '../types/auth-user.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AccessProfile[]>(ROLES_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (!required?.length) return true;
    const user = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user;
    const allowed = user.profile === 'DEVELOPER' || user.profile === 'MISSION_LEADER' || user.profile === 'ADMIN' || required.includes(user.profile);
    if (!allowed) throw new ForbiddenException('Seu perfil não possui permissão para esta ação.');
    return true;
  }
}
