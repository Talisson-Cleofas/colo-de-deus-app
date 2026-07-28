import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../../auth/types/auth-user.type';
import { GoogleSheetsService } from '../../google/google-sheets.service';
import { MINISTRY_MODULE_KEY } from '../decorators/ministry-module.decorator';
import type { MinistryModuleCode } from '../ministry-permission.map';
import { MinistryModuleService } from '../ministry-module.service';

@Injectable()
export class MinistryModuleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly modules: MinistryModuleService, private readonly sheets: GoogleSheetsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const configured = this.reflector.getAllAndOverride<MinistryModuleCode[]>(MINISTRY_MODULE_KEY, [context.getHandler(), context.getClass()]);
    if (!configured?.length) return true;
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser; body?: Record<string, unknown>; params?: Record<string,string>; method?: string; originalUrl?: string }>();
    const user = request.user;
    if (!user || user.profile !== 'MINISTRY_LEADER') return true;
    const requested = await this.resolveRequestedModule(configured, request.body || {}, request.params || {});
    const allowed = requested ? await this.modules.accepts(user, requested) : false;
    await this.audit(user, requested || configured.join('|'), request.method || '', request.originalUrl || '', allowed);
    if (!allowed) throw new ForbiddenException(`Seu ministério não possui autorização para acessar o módulo ${requested || configured.join(' ou ')}.`);
    return true;
  }

  private async resolveRequestedModule(configured: MinistryModuleCode[], body: Record<string, unknown>, params: Record<string,string>): Promise<MinistryModuleCode | null> {
    if (configured.length === 1) return configured[0];
    const type = String(body.type || body.communityType || '').toUpperCase();
    if (type === 'CELL') return 'CELULAS';
    if (type === 'CENACLE') return 'CENACULO';
    const id = params.id;
    if (id) {
      const cells = await this.sheets.read('Células');
      if (cells.some((row) => row.id === id)) return 'CELULAS';
      const cenacles = await this.sheets.read('Cenáculos');
      if (cenacles.some((row) => row.id === id)) return 'CENACULO';
    }
    return null;
  }

  private async audit(user: AuthenticatedUser, module: string, method: string, url: string, allowed: boolean) {
    try {
      await this.sheets.appendRecord('Auditoria', {
        id: randomUUID(), acao: 'PERMISSION', modulo: 'RBAC', entidade: 'MINISTRY_MODULE', registro_id: '',
        usuario_id: user.memberId || user.id, usuario_nome: user.name, usuario_email: user.email, perfil: user.profile,
        descricao: `${allowed ? 'Acesso autorizado' : 'Acesso negado'} por ministério: ${method} ${url} -> ${module}`,
        dados_anteriores: '', dados_novos: JSON.stringify({ ministry: user.ministry, module, allowed }), ip: '', user_agent: '', criado_em: new Date().toISOString(),
      });
    } catch { /* auditoria não pode derrubar a autorização */ }
  }
}
