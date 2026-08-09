import { Inject, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import type { MemberRow } from '../google/google-sheets.service';
import {
  MEMBER_REPOSITORY,
  type IMemberRepository,
} from '../persistence/interfaces/member-repository.interface';
import { StructureSyncService } from '../google/structure-sync.service';
import { AdminUpdateMemberDto } from './admin-update-member.dto';
import { memberProfileAccess } from './member-profile.policy';
@Injectable()
export class MemberProfileService {
  constructor(
    @Inject(MEMBER_REPOSITORY) private readonly sheets: IMemberRepository,
    private readonly sync: StructureSyncService,
  ) {}
  private uid(user: AuthenticatedUser) {
    return user.memberId || user.id;
  }
  private active(value: string) {
    return !value || this.sheets.parseActive(value, true);
  }
  private async member(id: string) {
    const item = (await this.sheets.listMembers()).find((m) => m.id === id);
    if (!item) throw new NotFoundException('Membro não encontrado.');
    return item;
  }
  private async audit(
    memberId: string,
    action: string,
    user: AuthenticatedUser,
    before: unknown,
    after: unknown,
  ) {
    await this.sheets.appendRecord('Histórico', {
      id: randomUUID(),
      tabela: 'Membros',
      registro_id: memberId,
      acao: action,
      usuario_id: this.uid(user),
      usuario_email: user.email,
      dados_anteriores: JSON.stringify(before ?? {}),
      dados_novos: JSON.stringify(after ?? {}),
      ip: '',
      user_agent: '',
      data: new Date().toISOString(),
    });
  }
  private publicMember(m: MemberRow) {
    return {
      id: m.id,
      name: m.name,
      photo: m.photo,
      role: m.role,
      ministry: m.ministry,
      cell: m.cell,
      bio: m.bio,
      instagram: m.instagram,
      city: m.city,
      state: m.state,
      gifts: m.gifts,
      active: m.active,
    };
  }
  async publicProfile(id: string, user: AuthenticatedUser) {
    const m = await this.member(id);
    if (!memberProfileAccess(user, m).canViewPublicProfile)
      throw new ForbiddenException('Você não possui acesso a este perfil.');
    return this.publicMember(m);
  }
  async complete(id: string, user: AuthenticatedUser) {
    const m = await this.member(id);
    const access = memberProfileAccess(user, m);
    if (!access.canViewPublicProfile)
      throw new ForbiddenException('Você não possui acesso a este perfil.');
    const [
      attendance,
      responses,
      events,
      formations,
      students,
      participants,
      ministries,
      cells,
      cenacles,
      soma,
      history,
      members,
    ] = await Promise.all([
      access.canViewCareData ? this.sheets.read('Presenças') : Promise.resolve([]),
      access.canViewCareData ? this.sheets.read('ConfirmacoesEventos') : Promise.resolve([]),
      access.canViewCareData ? this.sheets.read('Eventos') : Promise.resolve([]),
      access.canViewCareData ? this.sheets.read('Formacoes') : Promise.resolve([]),
      access.canViewCareData ? this.sheets.read('Formandos') : Promise.resolve([]),
      this.sheets.read('Participantes'),
      this.sheets.read('Ministérios'),
      this.sheets.read('Células'),
      this.sheets.read('Cenáculos'),
      access.canViewFinancial ? this.sheets.read('Soma') : Promise.resolve([]),
      access.canViewHistory ? this.sheets.read('Histórico') : Promise.resolve([]),
      this.sheets.listMembers(),
    ]);
    const eventMap = new Map(events.map((e) => [e.id, e]));
    const formationMap = new Map(formations.map((f) => [f.id, f]));
    const memberMap = new Map(members.map((x) => [x.id, x]));
    const links = participants.filter((p) => p.membro_id === id && this.active(p.ativo || ''));
    const responsibilities = [
      ...ministries
        .filter((x) => x.lider_id === id || x.vice_lider_id === id)
        .map((x) => ({
          type: 'MINISTERIO',
          id: x.id,
          name: x.nome,
          role: x.lider_id === id ? 'Líder' : 'Vice-líder',
        })),
      ...cells
        .filter((x) => x.lider_id === id || x.vice_lider_id === id)
        .map((x) => ({
          type: 'CELULA',
          id: x.id,
          name: x.nome,
          role: x.lider_id === id ? 'Líder' : 'Vice-líder',
        })),
      ...cenacles
        .filter((x) => x.responsavel_id === id || x.vice_responsavel_id === id)
        .map((x) => ({
          type: 'CENACULO',
          id: x.id,
          name: x.nome,
          role: x.responsavel_id === id ? 'Responsável' : 'Vice-responsável',
        })),
    ];
    const attendanceRows = attendance
      .filter((r) => r.membro_id === id)
      .map((r) => ({
        id: r.id,
        date: r.data,
        type: r.tipo,
        referenceId: r.referencia_id,
        eventId: r.evento_id,
        present: this.sheets.parseActive(r.presente || ''),
        justification: r.justificativa || '',
        origin: r.origem || '',
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    const eventResponses = responses
      .filter((r) => r.membro_id === id)
      .map((r) => ({
        id: r.id,
        eventId: r.evento_id,
        eventTitle: eventMap.get(r.evento_id)?.titulo || 'Evento',
        status: r.status,
        justification: r.justificativa || '',
        createdAt: r.criado_em || '',
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const training = students
      .filter((r) => r.membro_id === id && this.active(r.ativo || ''))
      .map((r) => ({
        id: r.id,
        formationId: r.formacao_id,
        name: formationMap.get(r.formacao_id)?.nome || 'Formação',
        status: r.status,
        progress: Number(r.progresso || 0),
        formator: memberMap.get(r.formador_id)?.name || m.formator,
        startDate: r.data_inicio,
        endDate: r.data_conclusao,
      }));
    const contributions = soma
      .filter((r) => r.membro_id === id)
      .map((r) => ({
        id: r.id,
        value: Number(String(r.valor || '0').replace(',', '.')),
        date: r.data,
        type: r.tipo,
        status: r.status,
        paymentMethod: r.forma_pagamento,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    const changes = history
      .filter((r) => r.tabela === 'Membros' && r.registro_id === id)
      .map((r) => ({
        id: r.id,
        action: r.acao,
        userEmail: r.usuario_email,
        date: r.data,
        before: r.dados_anteriores,
        after: r.dados_novos,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    const structureLinks = links.map((p) => {
      const source = p.tipo === 'MINISTERIO' ? ministries : p.tipo === 'CELULA' ? cells : cenacles;
      const row = source.find((x) => x.id === p.referencia_id);
      return {
        id: p.id,
        type: p.tipo,
        referenceId: p.referencia_id,
        name: row?.nome || '',
        role: p.funcao || '',
        joinedAt: p.data_entrada || '',
      };
    });
    return {
      member: access.isAdministrator ? m : this.publicMember(m),
      privacy: access,
      summary: {
        presences: attendanceRows.filter((x) => x.present).length,
        absences: attendanceRows.filter((x) => !x.present).length,
        justified: attendanceRows.filter((x) => !x.present && x.justification).length,
        confirmedEvents: eventResponses.filter((x) => x.status === 'CONFIRMADO').length,
        unconfirmedEvents: eventResponses.filter((x) => x.status !== 'CONFIRMADO').length,
        formations: training.length,
        responsibilities: responsibilities.length,
      },
      attendance: attendanceRows,
      eventResponses,
      formations: training,
      responsibilities,
      contributions,
      changes,
      links: structureLinks,
      adminOptions: access.isAdministrator
        ? {
            ministries: ministries
              .filter((x) => this.active(x.ativo || ''))
              .map((x) => ({ id: x.id, name: x.nome })),
            cells: cells
              .filter((x) => this.active(x.ativo || ''))
              .map((x) => ({ id: x.id, name: x.nome })),
            cenacles: cenacles
              .filter((x) => this.active(x.ativo || ''))
              .map((x) => ({ id: x.id, name: x.nome })),
            members: members.filter((x) => x.active).map((x) => ({ id: x.id, name: x.name })),
          }
        : undefined,
    };
  }
  private async replaceLink(memberId: string, type: string, ids: string[], role = 'MEMBRO') {
    const rows = await this.sheets.read('Participantes');
    const now = new Date().toISOString();
    for (const row of rows.filter(
      (r) => r.membro_id === memberId && r.tipo === type && this.active(r.ativo || ''),
    )) {
      await this.sheets.updateRecord('Participantes', 'id', row.id, {
        ...row,
        ativo: 'FALSE',
        data_saida: now,
        atualizado_em: now,
      });
    }
    for (const referenceId of ids.filter(Boolean)) {
      await this.sheets.appendRecord('Participantes', {
        id: randomUUID(),
        membro_id: memberId,
        tipo: type,
        referencia_id: referenceId,
        funcao: role,
        data_entrada: now,
        data_saida: '',
        ativo: 'TRUE',
        criado_em: now,
        atualizado_em: now,
      });
    }
  }
  private async leadership(
    tab: 'Ministérios' | 'Células' | 'Cenáculos',
    memberId: string,
    selected: string[],
  ) {
    const rows = await this.sheets.read(tab);
    const primary = tab === 'Cenáculos' ? 'responsavel_id' : 'lider_id';
    const now = new Date().toISOString();
    for (const row of rows) {
      const should = selected.includes(row.id);
      if (row[primary] === memberId && !should)
        await this.sheets.updateRecord(tab, 'id', row.id, {
          ...row,
          [primary]: '',
          atualizado_em: now,
        });
      else if (should && row[primary] !== memberId)
        await this.sheets.updateRecord(tab, 'id', row.id, {
          ...row,
          [primary]: memberId,
          atualizado_em: now,
        });
    }
  }
  async adminUpdate(id: string, dto: AdminUpdateMemberDto, user: AuthenticatedUser) {
    if (!['DEVELOPER', 'MISSION_LEADER', 'ADMIN'].includes(user.profile))
      throw new ForbiddenException('Apenas ADMIN ou DEVELOPER pode alterar campos sensíveis.');
    const before = await this.member(id);
    const ministries = await this.sheets.read('Ministérios'),
      cells = await this.sheets.read('Células');
    const ministryName =
      dto.ministryId === undefined
        ? before.ministry
        : ministries.find((x) => x.id === dto.ministryId)?.nome || '';
    const cellName =
      dto.cellId === undefined ? before.cell : cells.find((x) => x.id === dto.cellId)?.nome || '';
    const updated = await this.sheets.updateMember(id, {
      profile: dto.profile,
      active: dto.active,
      role: dto.role,
      formator: dto.formator,
      ministry: ministryName,
      cell: cellName,
    });
    if (dto.ministryId !== undefined)
      await this.replaceLink(
        id,
        'MINISTERIO',
        dto.ministryId ? [dto.ministryId] : [],
        dto.role || updated.role,
      );
    if (dto.cellId !== undefined)
      await this.replaceLink(
        id,
        'CELULA',
        dto.cellId ? [dto.cellId] : [],
        dto.role || updated.role,
      );
    if (dto.cenacleIds !== undefined)
      await this.replaceLink(id, 'CENACULO', dto.cenacleIds, dto.role || updated.role);
    if (dto.leadMinistryIds !== undefined)
      await this.leadership('Ministérios', id, dto.leadMinistryIds);
    if (dto.leadCellIds !== undefined) await this.leadership('Células', id, dto.leadCellIds);
    if (dto.leadCenacleIds !== undefined)
      await this.leadership('Cenáculos', id, dto.leadCenacleIds);
    if (
      dto.leadMinistryIds !== undefined ||
      dto.leadCellIds !== undefined ||
      dto.leadCenacleIds !== undefined
    )
      await this.sync.reconcileAll();
    await this.sync.syncMemberSummary(id);
    const fresh = await this.member(id);
    await this.audit(id, 'ADMIN_PROFILE_UPDATE', user, before, { ...fresh, ...dto });
    return { member: fresh, message: 'Perfil administrativo atualizado com sucesso.' };
  }
}
