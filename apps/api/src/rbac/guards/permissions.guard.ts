import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '../../auth/types/auth-user.type';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ANY_PERMISSIONS_KEY } from '../decorators/any-permissions.decorator';
import type { Permission } from '../enums/permission.enum';
import { PermissionService } from '../permission.service';
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly permissions: PermissionService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required=this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY,[context.getHandler(),context.getClass()]);
    const anyRequired=this.reflector.getAllAndOverride<Permission[]>(ANY_PERMISSIONS_KEY,[context.getHandler(),context.getClass()]);
    if(!required?.length && !anyRequired?.length)return true;
    const user=context.switchToHttp().getRequest<{user:AuthenticatedUser}>().user;
    if(!user) throw new ForbiddenException('Usuário não autenticado.');
    if(required?.length && !(await this.permissions.has(user,...required))) throw new ForbiddenException('Você não possui as permissões necessárias para esta ação.');
    if(anyRequired?.length){const granted=await this.permissions.forUser(user);if(!anyRequired.some((permission)=>granted.permissions.includes(permission)))throw new ForbiddenException('Você não possui nenhuma das permissões necessárias para esta ação.');}
    return true;
  }
}
