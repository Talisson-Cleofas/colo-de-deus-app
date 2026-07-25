import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/types/auth-user.type';
import { CellScopeService } from '../cell-scope.service';

@Injectable()
export class CellLeaderGuard implements CanActivate {
  constructor(private readonly scope: CellScopeService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      params?: Record<string, string>;
      query?: Record<string, string>;
      body?: Record<string, unknown>;
      route?: { path?: string };
      baseUrl?: string;
    }>();
    const user = req.user;
    if (!user) return true;
    const restricted = this.scope.isCellLeader(user);
    const cellsMinistryLeader = await this.scope.isCellsMinistryLeader(user);
    if (!restricted && !cellsMinistryLeader) return true;

    const ids = await this.scope.cellIds(user);
    (req as any).cellScopeIds = [...ids];
    (req as any).canManageAllCells = cellsMinistryLeader;

    const path = `${req.baseUrl || ''}${req.route?.path || ''}`;
    if (!path.includes('/communities') && !path.includes('/events') && !path.includes('/members')) return true;

    const requested = String(req.body?.cellId ?? req.body?.celula_id ?? req.query?.cellId ?? req.query?.celula_id ?? '');
    if (requested && !ids.has(requested)) throw new ForbiddenException('Acesso restrito à sua célula.');

    const id = req.params?.id || '';
    if (id && (path.includes('/communities') || path.includes('/events'))) {
      const cellId = await this.scope.resourceCellId(id);
      if (cellId && !ids.has(cellId)) throw new ForbiddenException('Acesso restrito à sua célula.');
      if (restricted && path.includes('/communities') && !cellId) {
        const type = String(req.body?.type ?? req.query?.type ?? '');
        if (type === 'CELL') throw new ForbiddenException('Acesso restrito à sua célula.');
      }
    }
    return true;
  }
}
