import { ForbiddenException, Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedUser } from '../../auth/types/auth-user.type';
import type { Permission } from '../enums/permission.enum';
import { PermissionService } from '../permission.service';
@Injectable()
export class PermissionMiddleware implements NestMiddleware {
  constructor(private readonly service: PermissionService) {}
  require(...permissions: Permission[]) { return async (req: Request & {user?:AuthenticatedUser}, _res:Response, next:NextFunction) => {
    if(!req.user || !(await this.service.has(req.user,...permissions))) return next(new ForbiddenException('Permissão insuficiente.'));
    next();
  }; }
  use(_req: Request, _res: Response, next: NextFunction) { next(); }
}
