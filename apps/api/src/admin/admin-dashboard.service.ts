import { Injectable } from '@nestjs/common';
import { GoogleSheetsService } from '../google/google-sheets.service';
import type {
  AdminDashboardChange,
  AdminDashboardData,
  AdminDashboardLog,
} from './admin-dashboard.types';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly sheets: GoogleSheetsService) {}

  private active(value: string | undefined, fallback = true): boolean {
    return this.sheets.parseActive(value || '', fallback);
  }

  private demo(): AdminDashboardData {
    const now = new Date().toISOString();
    return {
      generatedAt: now,
      metrics: {
        members: 128,
        leaders: 21,
        cells: 18,
        ministries: 8,
        events: 14,
        cenacles: 7,
        onlineUsers: 5,
      },
      recentLogs: [
        {
          id: 'a1',
          action: 'LOGIN',
          module: 'AUTH',
          description: 'Acesso realizado',
          userName: 'Administrador',
          userEmail: 'admin@demo.local',
          createdAt: now,
        },
        {
          id: 'a2',
          action: 'CREATE',
          module: 'MEMBERS',
          description: 'Novo membro cadastrado',
          userName: 'Administrador',
          userEmail: 'admin@demo.local',
          createdAt: now,
        },
      ],
      latestChanges: [
        {
          id: 'a2',
          action: 'CREATE',
          module: 'MEMBERS',
          entity: 'Membro',
          recordId: 'demo-1',
          description: 'Novo membro cadastrado',
          userName: 'Administrador',
          userEmail: 'admin@demo.local',
          createdAt: now,
        },
      ],
    };
  }

  private toLog(row: Record<string, string>): AdminDashboardLog {
    return {
      id: row.id || '',
      action: row.acao || 'CHANGE',
      module: row.modulo || 'SISTEMA',
      description: row.descricao || `${row.acao || 'Alteração'} em ${row.modulo || 'sistema'}`,
      userName: row.usuario_nome || 'Sistema',
      userEmail: row.usuario_email || '',
      createdAt: row.criado_em || '',
    };
  }

  private onlineUsers(rows: Array<Record<string, string>>): number {
    const threshold = Date.now() - 15 * 60 * 1000;
    const state = new Map<string, { action: string; at: number }>();
    rows.forEach((row) => {
      const identity = row.usuario_id || row.usuario_email;
      const at = new Date(row.criado_em || '').getTime();
      if (!identity || !Number.isFinite(at)) return;
      const previous = state.get(identity);
      if (!previous || at > previous.at) state.set(identity, { action: row.acao || '', at });
    });
    return [...state.values()].filter((entry) => entry.action === 'LOGIN' && entry.at >= threshold)
      .length;
  }

  async getDashboard(): Promise<AdminDashboardData> {
    if (this.sheets.isDemo()) return this.demo();
    const [members, ministries, cells, cenacles, events, audit] = await Promise.all([
      this.sheets.listMembers().catch(() => []),
      this.sheets.read('Ministérios').catch(() => []),
      this.sheets.read('Células').catch(() => []),
      this.sheets.read('Cenáculos').catch(() => []),
      this.sheets.read('Eventos').catch(() => []),
      this.sheets.read('Auditoria').catch(() => []),
    ]);

    const orderedAudit = [...audit].sort((a, b) =>
      (b.criado_em || '').localeCompare(a.criado_em || ''),
    );
    const recentLogs = orderedAudit.slice(0, 10).map((row) => this.toLog(row));
    const latestChanges: AdminDashboardChange[] = orderedAudit
      .filter((row) => !['LOGIN', 'LOGOUT'].includes(row.acao || ''))
      .slice(0, 10)
      .map((row) => ({
        ...this.toLog(row),
        entity: row.entidade || '',
        recordId: row.registro_id || '',
      }));

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        members: members.filter((member) => member.active).length,
        leaders: members.filter(
          (member) =>
            member.active &&
            ['DEVELOPER', 'MISSION_LEADER', 'ADMIN', 'MINISTRY_LEADER', 'CELL_LEADER'].includes(
              member.profile,
            ),
        ).length,
        cells: cells.filter((row) => this.active(row.ativo)).length,
        ministries: ministries.filter((row) => this.active(row.ativo)).length,
        events: events.filter((row) => this.active(row.ativo)).length,
        cenacles: cenacles.filter((row) => this.active(row.ativo)).length,
        onlineUsers: this.onlineUsers(audit),
      },
      recentLogs,
      latestChanges,
    };
  }
}
