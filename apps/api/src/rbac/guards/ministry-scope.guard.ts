import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/auth-user.type';
import { MinistryScopeService } from '../ministry-scope.service';
import { CellScopeService } from '../cell-scope.service';

@Injectable()
export class MinistryScopeGuard implements CanActivate {
  constructor(private readonly scope: MinistryScopeService, private readonly cells: CellScopeService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?:AuthenticatedUser; params?:Record<string,string>; query?:Record<string,string>; body?:Record<string,unknown>; route?:{path?:string}; baseUrl?:string; originalUrl?:string; url?:string }>();
    const user = req.user;
    if (!user || !this.scope.isRestricted(user)) return true;
    const path = [req.originalUrl, req.url, req.baseUrl, req.route?.path]
      .filter(Boolean)
      .join(' ');
    // In the missionary agenda, ministryId is the requested ministry, not the
    // ministry owned by the agenda creator. PermissionsGuard and the workflow
    // service enforce the route-specific authorization and state transitions.
    if (
      context.getClass?.()?.name === 'MissionaryAgendaController' ||
      path.includes('/missionary-agenda')
    )
      return true;
    if (path.includes('/communities') && await this.cells.isCellsMinistryLeader(user)) return true;
    const owned = await this.scope.ministryIds(user);
    (req as any).ministryScopeIds = [...owned];

    const requested = String((req.body?.ministryId ?? req.body?.ministerio_id ?? req.query?.ministryId ?? req.query?.ministerio_id) || '');
    if (requested && !owned.has(requested)) throw new ForbiddenException('Acesso restrito ao seu ministério.');

    const id = req.params?.id || '';
    let kind: 'events'|'communities'|'members'|null = null;
    if (path.includes('/events')) kind = 'events';
    else if (path.includes('/communities')) kind = 'communities';
    else if (path.includes('/members')) kind = 'members';
    if (kind && id) {
      const ministryId = await this.scope.resourceMinistryId(kind, id);
      if (ministryId && !owned.has(ministryId)) throw new ForbiddenException('Acesso restrito ao seu ministério.');
    }
    return true;
  }
}
