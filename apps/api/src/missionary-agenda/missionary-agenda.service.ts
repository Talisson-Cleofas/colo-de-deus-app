import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { NotificationsService } from '../notifications/notifications.service';
import {
  MISSIONARY_AGENDA_REPOSITORY,
  type IMissionaryAgendaRepository,
} from '../persistence/interfaces/missionary-agenda-repository.interface';
import type {
  ApproveMissionaryAgendaDto,
  CreateMissionaryAgendaDto,
  RejectMissionaryAgendaDto,
  SendMissionaryAgendaDto,
  UpdateMissionaryAgendaDto,
} from './missionary-agenda.dto';
import type {
  MissionaryAgenda,
  MissionaryAgendaHistory,
  MissionaryAgendaStatus,
  MissionaryAgendaType,
} from './missionary-agenda.types';

type SheetRow = Record<string, string>;

@Injectable()
export class MissionaryAgendaService {
  constructor(
    @Inject(MISSIONARY_AGENDA_REPOSITORY) private readonly repository: IMissionaryAgendaRepository,
    private readonly notifications: NotificationsService,
  ) {}

  private userId(user: AuthenticatedUser) {
    return user.memberId || user.id || user.uid;
  }
  private central(user: AuthenticatedUser) {
    return ['DEVELOPER', 'MISSION_LEADER', 'ADMIN'].includes(user.profile);
  }
  private validDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number),
      parsed = new Date(Date.UTC(year, month - 1, day));
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  }
  private validatePeriod(startDate: string, endDate: string, startTime: string, endTime: string) {
    if (!this.validDate(startDate) || (endDate && !this.validDate(endDate)))
      throw new BadRequestException('Informe um período com datas válidas.');
    const effectiveEnd = endDate || startDate;
    if (effectiveEnd < startDate || (effectiveEnd === startDate && endTime && endTime < startTime))
      throw new BadRequestException('O término não pode ser anterior ao início da agenda.');
  }
  private async context() {
    const [rows, ministries, members, participants, history] = await Promise.all([
      this.repository.read('AgendaMissionaria'),
      this.repository.read('Ministérios'),
      this.repository.listMembers(),
      this.repository.read('AgendaMissionariaParticipantes'),
      this.repository.read('AgendaMissionariaHistorico'),
    ]);
    return {
      rows,
      ministries,
      members,
      participants,
      history,
      ministryNames: new Map(ministries.map((item) => [item.id, item.nome || ''])),
      memberNames: new Map(members.map((item) => [item.id, item.name || ''])),
    };
  }
  private ministryLeader(
    user: AuthenticatedUser,
    ministryId: string,
    ctx: Awaited<ReturnType<MissionaryAgendaService['context']>>,
  ) {
    const ministry = ctx.ministries.find((item) => item.id === ministryId),
      uid = this.userId(user);
    return Boolean(
      ministry &&
      (ministry.lider_id === uid ||
        ministry.vice_lider_id === uid ||
        (user.profile === 'MINISTRY_LEADER' && user.ministry === ministry.nome)),
    );
  }
  private participantIds(
    id: string,
    ctx: Awaited<ReturnType<MissionaryAgendaService['context']>>,
    role = 'ENVIADO',
  ) {
    return ctx.participants
      .filter(
        (item) =>
          item.agenda_id === id &&
          this.repository.parseActive(item.ativo || '', true) &&
          (item.funcao || 'ENVIADO') === role,
      )
      .map((item) => item.membro_id)
      .filter(Boolean);
  }
  private map(
    row: SheetRow,
    ctx: Awaited<ReturnType<MissionaryAgendaService['context']>>,
    user: AuthenticatedUser,
  ): MissionaryAgenda {
    const participantIds = this.participantIds(row.id || '', ctx),
      accompanyingIds = this.participantIds(row.id || '', ctx, 'ACOMPANHANTE'),
      intercessorIds = this.participantIds(row.id || '', ctx, 'INTERCESSOR'),
      status = (row.status || 'RASCUNHO') as MissionaryAgendaStatus;
    const agendaLeader = row.criado_por === this.userId(user),
      central = this.central(user),
      ministryLeader = this.ministryLeader(user, row.ministerio_id || '', ctx);
    return {
      id: row.id || '',
      missionId: row.missao_id || 'missao-brasilia',
      title: row.titulo || '',
      description: row.descricao || '',
      type: (row.tipo || 'OUTRO') as MissionaryAgendaType,
      status,
      startDate: row.data_inicio || '',
      endDate: row.data_fim || row.data_inicio || '',
      startTime: row.horario_inicio || '',
      endTime: row.horario_fim || '',
      location: row.local || '',
      address: row.endereco || '',
      neighborhood: row.bairro || '',
      city: row.cidade || '',
      state: row.estado || '',
      zipCode: row.cep || '',
      responsibleId: row.responsavel_id || '',
      responsibleName: ctx.memberNames.get(row.responsavel_id || '') || '',
      ministryId: row.ministerio_id || '',
      ministryName: ctx.ministryNames.get(row.ministerio_id || '') || '',
      participantLimit: Number(row.limite_participantes || 0),
      meetingPoint: row.ponto_encontro || '',
      transport: row.transporte || '',
      notes: row.observacoes || '',
      submittedBy: row.enviado_aprovacao_por || '',
      submittedAt: row.enviado_aprovacao_em || '',
      approvedBy: row.aprovado_por || '',
      approvedAt: row.aprovado_em || '',
      approvalNotes: row.parecer_aprovacao || '',
      rejectedBy: row.nao_aprovado_por || '',
      rejectedAt: row.nao_aprovado_em || '',
      rejectionReason: row.motivo_nao_aprovacao || '',
      membersSentBy: row.membros_enviados_por || '',
      membersSentAt: row.membros_enviados_em || '',
      participantIds,
      participantNames: participantIds.map((id) => ctx.memberNames.get(id) || id),
      accompanyingIds,
      accompanyingNames: accompanyingIds.map((id) => ctx.memberNames.get(id) || id),
      intercessorIds,
      intercessorNames: intercessorIds.map((id) => ctx.memberNames.get(id) || id),
      canEdit:
        (agendaLeader && ['RASCUNHO', 'NAO_APROVADA'].includes(status)) ||
        (central &&
          ['RASCUNHO', 'NAO_APROVADA', 'AGUARDANDO_APROVACAO', 'AGUARDANDO_INDICACOES'].includes(
            status,
          )) ||
        (ministryLeader && status === 'AGUARDANDO_INDICACOES'),
      canSubmit: (agendaLeader || central) && ['RASCUNHO', 'NAO_APROVADA'].includes(status),
      canReview: central && status === 'AGUARDANDO_APROVACAO',
      canSelectMembers: (ministryLeader || central) && status === 'AGUARDANDO_INDICACOES',
      active: this.repository.parseActive(row.ativo || '', true),
      createdBy: row.criado_por || '',
      createdAt: row.criado_em || '',
      updatedBy: row.atualizado_por || '',
      updatedAt: row.atualizado_em || '',
    };
  }
  private visible(
    item: MissionaryAgenda,
    user: AuthenticatedUser,
    ctx: Awaited<ReturnType<MissionaryAgendaService['context']>>,
  ) {
    if (
      this.central(user) ||
      item.createdBy === this.userId(user) ||
      item.responsibleId === this.userId(user)
    )
      return true;
    if (
      this.ministryLeader(user, item.ministryId, ctx) &&
      ['AGUARDANDO_INDICACOES', 'ENVIADA_AOS_MEMBROS', 'CONCLUIDA'].includes(item.status)
    )
      return true;
    const assigned = [
      ...item.participantIds,
      ...item.accompanyingIds,
      ...item.intercessorIds,
    ].includes(this.userId(user));
    return (
      assigned &&
      [
        'AGUARDANDO_APROVACAO',
        'AGUARDANDO_INDICACOES',
        'ENVIADA_AOS_MEMBROS',
        'CONCLUIDA',
      ].includes(item.status)
    );
  }
  async list(
    filters: { status?: string; type?: string; search?: string },
    user: AuthenticatedUser,
  ) {
    if (this.repository.isDemo()) return [];
    const ctx = await this.context(),
      search = filters.search?.trim().toLocaleLowerCase('pt-BR');
    return ctx.rows
      .map((row) => this.map(row, ctx, user))
      .filter((item) => item.active && this.visible(item, user, ctx))
      .filter((item) => !filters.status || item.status === filters.status)
      .filter((item) => !filters.type || item.type === filters.type)
      .filter(
        (item) =>
          !search ||
          [item.title, item.location, item.city, item.responsibleName, item.ministryName].some(
            (value) => value.toLocaleLowerCase('pt-BR').includes(search),
          ),
      )
      .sort((a, b) =>
        `${a.startDate}T${a.startTime}`.localeCompare(`${b.startDate}T${b.startTime}`),
      );
  }
  async findOne(id: string, user: AuthenticatedUser) {
    const item = (await this.list({}, user)).find((agenda) => agenda.id === id);
    if (!item) throw new NotFoundException('Agenda missionária não encontrada.');
    return item;
  }
  async options(user: AuthenticatedUser) {
    const ctx = await this.context(),
      uid = this.userId(user);
    const managed = new Set(
      ctx.ministries
        .filter(
          (item) =>
            this.central(user) ||
            item.lider_id === uid ||
            item.vice_lider_id === uid ||
            (user.profile === 'MINISTRY_LEADER' && item.nome === user.ministry),
        )
        .map((item) => item.id),
    );
    return {
      currentMemberId: uid,
      members: ctx.members
        .filter((item) => item.active)
        .map((item) => ({ id: item.id, name: item.name, ministry: item.ministry }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      ministries: ctx.ministries
        .filter((item) => this.repository.parseActive(item.ativo || '', true))
        .map((item) => ({ id: item.id, name: item.nome || '', managed: managed.has(item.id) }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    };
  }
  private async validateReferences(responsibleId: string, ministryId: string) {
    const [member, ministries] = await Promise.all([
      responsibleId ? this.repository.findMemberById(responsibleId) : Promise.resolve(undefined),
      ministryId ? this.repository.read('Ministérios') : Promise.resolve([]),
    ]);
    if (responsibleId && !member?.active)
      throw new BadRequestException('Selecione um missionário ativo.');
    if (
      ministryId &&
      !ministries.some(
        (item) => item.id === ministryId && this.repository.parseActive(item.ativo || '', true),
      )
    )
      throw new BadRequestException('Selecione um ministério ativo.');
  }
  private record(
    dto: CreateMissionaryAgendaDto,
    audit: {
      id: string;
      createdBy: string;
      createdAt: string;
      updatedBy: string;
      updatedAt: string;
    },
    workflow: Partial<SheetRow> = {},
  ) {
    return {
      id: audit.id,
      missao_id: 'missao-brasilia',
      titulo: dto.title.trim(),
      descricao: dto.description.trim(),
      tipo: dto.type,
      status: workflow.status || 'RASCUNHO',
      data_inicio: dto.startDate,
      data_fim: dto.endDate || dto.startDate,
      horario_inicio: dto.startTime,
      horario_fim: dto.endTime,
      local: dto.location.trim(),
      endereco: dto.address.trim(),
      bairro: dto.neighborhood.trim(),
      cidade: dto.city.trim(),
      estado: dto.state.trim().toUpperCase(),
      cep: dto.zipCode.trim(),
      responsavel_id: dto.responsibleId,
      ministerio_id: dto.ministryId,
      limite_participantes: dto.participantLimit,
      ponto_encontro: dto.meetingPoint.trim(),
      transporte: dto.transport.trim(),
      observacoes: dto.notes.trim(),
      recorrente: 'FALSE',
      recorrencia_regra: '',
      notificar: 'FALSE',
      antecedencia_notificacao_minutos: 0,
      enviado_aprovacao_por: workflow.enviado_aprovacao_por || '',
      enviado_aprovacao_em: workflow.enviado_aprovacao_em || '',
      aprovado_por: workflow.aprovado_por || '',
      aprovado_em: workflow.aprovado_em || '',
      parecer_aprovacao: workflow.parecer_aprovacao || '',
      nao_aprovado_por: workflow.nao_aprovado_por || '',
      nao_aprovado_em: workflow.nao_aprovado_em || '',
      motivo_nao_aprovacao: workflow.motivo_nao_aprovacao || '',
      membros_enviados_por: workflow.membros_enviados_por || '',
      membros_enviados_em: workflow.membros_enviados_em || '',
      ativo: 'TRUE',
      criado_por: audit.createdBy,
      criado_em: audit.createdAt,
      atualizado_por: audit.updatedBy,
      atualizado_em: audit.updatedAt,
    };
  }
  private form(item: MissionaryAgenda): CreateMissionaryAgendaDto {
    return {
      title: item.title,
      description: item.description,
      type: item.type,
      status: item.status,
      startDate: item.startDate,
      endDate: item.endDate,
      startTime: item.startTime,
      endTime: item.endTime,
      location: item.location,
      address: item.address,
      neighborhood: item.neighborhood,
      city: item.city,
      state: item.state,
      zipCode: item.zipCode,
      responsibleId: item.responsibleId,
      ministryId: item.ministryId,
      participantLimit: item.participantLimit,
      meetingPoint: item.meetingPoint,
      transport: item.transport,
      notes: item.notes,
      accompanyingIds: item.accompanyingIds,
      intercessorIds: item.intercessorIds,
    };
  }

  private async validateTeamSelection(accompanyingIds: string[], intercessorIds: string[]) {
    const accompanying = [...new Set(accompanyingIds.filter(Boolean))],
      intercessors = [...new Set(intercessorIds.filter(Boolean))],
      overlap = accompanying.filter((id) => intercessors.includes(id));
    if (overlap.length)
      throw new BadRequestException(
        'A mesma pessoa não pode ser acompanhante e intercessora na mesma agenda.',
      );
    const members = await this.repository.listMembers(),
      selectedIds = [...accompanying, ...intercessors],
      selected = members.filter((member) => selectedIds.includes(member.id));
    if (selected.length !== selectedIds.length || selected.some((member) => !member.active))
      throw new BadRequestException('A equipe contém membro inexistente ou inativo.');
    return { accompanying, intercessors };
  }

  private async syncTeam(
    agendaId: string,
    ministryId: string,
    accompanyingIds: string[],
    intercessorIds: string[],
    user: AuthenticatedUser,
  ) {
    const { accompanying, intercessors } = await this.validateTeamSelection(
        accompanyingIds,
        intercessorIds,
      ),
      rows = await this.repository.read('AgendaMissionariaParticipantes'),
      current = rows.filter(
        (row) =>
          row.agenda_id === agendaId && ['ACOMPANHANTE', 'INTERCESSOR'].includes(row.funcao || ''),
      ),
      now = new Date().toISOString(),
      uid = this.userId(user);
    for (const role of ['ACOMPANHANTE', 'INTERCESSOR'] as const) {
      const wanted = role === 'ACOMPANHANTE' ? accompanying : intercessors;
      for (const row of current.filter(
        (item) => item.funcao === role && !wanted.includes(item.membro_id),
      ))
        await this.repository.updateRecord('AgendaMissionariaParticipantes', 'id', row.id, {
          ...row,
          ativo: 'FALSE',
          atualizado_em: now,
        });
      for (const memberId of wanted) {
        const existing = current.find((row) => row.funcao === role && row.membro_id === memberId);
        if (existing)
          await this.repository.updateRecord('AgendaMissionariaParticipantes', 'id', existing.id, {
            ...existing,
            ativo: 'TRUE',
            status: 'INDICADO',
            atualizado_em: now,
          });
        else
          await this.repository.appendRecord('AgendaMissionariaParticipantes', {
            id: randomUUID(),
            agenda_id: agendaId,
            membro_id: memberId,
            ministerio_id: ministryId,
            funcao: role,
            status: 'INDICADO',
            enviado_por: uid,
            enviado_em: now,
            ativo: 'TRUE',
            criado_em: now,
            atualizado_em: now,
          });
      }
    }
  }
  private workflow(item: MissionaryAgenda): SheetRow {
    return {
      status: item.status,
      enviado_aprovacao_por: item.submittedBy,
      enviado_aprovacao_em: item.submittedAt,
      aprovado_por: item.approvedBy,
      aprovado_em: item.approvedAt,
      parecer_aprovacao: item.approvalNotes,
      nao_aprovado_por: item.rejectedBy,
      nao_aprovado_em: item.rejectedAt,
      motivo_nao_aprovacao: item.rejectionReason,
      membros_enviados_por: item.membersSentBy,
      membros_enviados_em: item.membersSentAt,
    };
  }
  private async save(item: MissionaryAgenda, user: AuthenticatedUser, workflow: SheetRow) {
    const now = new Date().toISOString();
    await this.repository.updateRecord(
      'AgendaMissionaria',
      'id',
      item.id,
      this.record(
        this.form(item),
        {
          id: item.id,
          createdBy: item.createdBy,
          createdAt: item.createdAt,
          updatedBy: this.userId(user),
          updatedAt: now,
        },
        workflow,
      ),
    );
  }
  private async log(
    item: MissionaryAgenda,
    status: MissionaryAgendaStatus,
    action: string,
    note: string,
    user: AuthenticatedUser,
  ) {
    await this.repository.appendRecord('AgendaMissionariaHistorico', {
      id: randomUUID(),
      agenda_id: item.id,
      status_anterior: item.status,
      status_novo: status,
      acao: action,
      observacao: note,
      usuario_id: this.userId(user),
      usuario_nome: user.name || user.email,
      criado_em: new Date().toISOString(),
    });
  }
  private async notify(title: string, message: string, recipientIds: string[], agendaId: string) {
    if (!recipientIds.length) return;
    try {
      await this.notifications.createSystem({
        title,
        message,
        type: 'EVENTO',
        audience: 'INDIVIDUAL',
        recipientIds: [...new Set(recipientIds)],
        origin: 'Agenda Missionária',
        referenceType: 'AGENDA_MISSIONARIA',
        referenceId: agendaId,
        link: '/agenda-missionaria',
      });
    } catch {
      /* workflow não depende da entrega imediata */
    }
  }
  async create(dto: CreateMissionaryAgendaDto, user: AuthenticatedUser) {
    this.validatePeriod(dto.startDate, dto.endDate, dto.startTime, dto.endTime);
    await this.validateReferences(dto.responsibleId, dto.ministryId);
    await this.validateTeamSelection(dto.accompanyingIds || [], dto.intercessorIds || []);
    const now = new Date().toISOString(),
      id = randomUUID();
    await this.repository.appendRecord(
      'AgendaMissionaria',
      this.record(dto, {
        id,
        createdBy: this.userId(user),
        createdAt: now,
        updatedBy: this.userId(user),
        updatedAt: now,
      }),
    );
    await this.syncTeam(
      id,
      dto.ministryId,
      dto.accompanyingIds || [],
      dto.intercessorIds || [],
      user,
    );
    const created = await this.findOne(id, user);
    await this.log(created, 'RASCUNHO', 'CRIADA', 'Agenda criada como rascunho.', user);
    return created;
  }
  async update(id: string, dto: UpdateMissionaryAgendaDto, user: AuthenticatedUser) {
    const existing = await this.findOne(id, user);
    if (!existing.canEdit)
      throw new ForbiddenException(
        'A agenda só pode ser editada pelo líder da agenda quando estiver em rascunho ou devolvida.',
      );
    const merged: CreateMissionaryAgendaDto = {
      ...this.form(existing),
      ...dto,
      status: existing.status,
    };
    this.validatePeriod(merged.startDate, merged.endDate, merged.startTime, merged.endTime);
    await this.validateReferences(merged.responsibleId, merged.ministryId);
    await this.validateTeamSelection(merged.accompanyingIds || [], merged.intercessorIds || []);
    await this.save({ ...existing, ...merged } as MissionaryAgenda, user, this.workflow(existing));
    await this.syncTeam(
      id,
      merged.ministryId,
      merged.accompanyingIds || [],
      merged.intercessorIds || [],
      user,
    );
    await this.log(existing, existing.status, 'EDITADA', 'Dados da agenda atualizados.', user);
    return this.findOne(id, user);
  }
  async submit(id: string, user: AuthenticatedUser) {
    const item = await this.findOne(id, user);
    if (!item.canSubmit)
      throw new ForbiddenException('Somente o líder da agenda pode enviá-la para aprovação.');
    if (!item.ministryId)
      throw new BadRequestException(
        'Defina o ministério responsável antes de enviar para aprovação.',
      );
    const now = new Date().toISOString(),
      status: MissionaryAgendaStatus = 'AGUARDANDO_APROVACAO';
    await this.save(item, user, {
      ...this.workflow(item),
      status,
      enviado_aprovacao_por: this.userId(user),
      enviado_aprovacao_em: now,
      nao_aprovado_por: '',
      nao_aprovado_em: '',
      motivo_nao_aprovacao: '',
    });
    await this.log(item, status, 'ENVIADA_PARA_APROVACAO', 'Enviada ao líder de missão.', user);
    const ctx = await this.context(),
      leaders = ctx.members
        .filter((member) => ['DEVELOPER', 'MISSION_LEADER', 'ADMIN'].includes(member.profile))
        .map((member) => member.id);
    await this.notify('Agenda aguardando aprovação', item.title, leaders, item.id);
    return this.findOne(id, user);
  }
  async approve(id: string, dto: ApproveMissionaryAgendaDto, user: AuthenticatedUser) {
    const item = await this.findOne(id, user);
    if (!item.canReview)
      throw new ForbiddenException('Somente o líder de missão pode aprovar esta agenda.');
    const now = new Date().toISOString(),
      status: MissionaryAgendaStatus = 'AGUARDANDO_INDICACOES';
    await this.save(item, user, {
      ...this.workflow(item),
      status,
      aprovado_por: this.userId(user),
      aprovado_em: now,
      parecer_aprovacao: dto.notes?.trim() || '',
    });
    await this.log(item, status, 'APROVADA', dto.notes?.trim() || 'Agenda aprovada.', user);
    const ctx = await this.context(),
      ministry = ctx.ministries.find((entry) => entry.id === item.ministryId),
      leaders = [ministry?.lider_id, ministry?.vice_lider_id].filter(Boolean) as string[];
    await this.notify('Agenda aprovada — selecione os membros', item.title, leaders, item.id);
    return this.findOne(id, user);
  }
  async reject(id: string, dto: RejectMissionaryAgendaDto, user: AuthenticatedUser) {
    const item = await this.findOne(id, user);
    if (!item.canReview)
      throw new ForbiddenException('Somente o líder de missão pode devolver esta agenda.');
    const now = new Date().toISOString(),
      status: MissionaryAgendaStatus = 'NAO_APROVADA';
    await this.save(item, user, {
      ...this.workflow(item),
      status,
      nao_aprovado_por: this.userId(user),
      nao_aprovado_em: now,
      motivo_nao_aprovacao: dto.reason.trim(),
    });
    await this.log(item, status, 'NAO_APROVADA', dto.reason.trim(), user);
    await this.notify(
      'Agenda devolvida para ajustes',
      `${item.title}: ${dto.reason.trim()}`,
      [item.createdBy],
      item.id,
    );
    return this.findOne(id, user);
  }
  private memberInMinistry(memberMinistry: string, ministryName: string) {
    const n = (value: string) => value.trim().toLocaleLowerCase('pt-BR');
    return memberMinistry.split(',').map(n).includes(n(ministryName));
  }
  async sendToMembers(id: string, dto: SendMissionaryAgendaDto, user: AuthenticatedUser) {
    const item = await this.findOne(id, user);
    if (!item.canSelectMembers)
      throw new ForbiddenException(
        'Somente o líder do ministério responsável pode selecionar os membros.',
      );
    const ids = [...new Set(dto.memberIds.filter(Boolean))];
    if (!ids.length) throw new BadRequestException('Selecione pelo menos um membro.');
    if (item.participantLimit > 0 && ids.length > item.participantLimit)
      throw new BadRequestException(`Selecione no máximo ${item.participantLimit} membro(s).`);
    const ctx = await this.context(),
      selected = ctx.members.filter((member) => ids.includes(member.id));
    if (selected.length !== ids.length || selected.some((member) => !member.active))
      throw new BadRequestException('A seleção contém membro inexistente ou inativo.');
    if (selected.some((member) => !this.memberInMinistry(member.ministry || '', item.ministryName)))
      throw new BadRequestException(
        'Todos os membros selecionados devem pertencer ao ministério responsável.',
      );
    const now = new Date().toISOString();
    for (const memberId of ids)
      await this.repository.appendRecord('AgendaMissionariaParticipantes', {
        id: randomUUID(),
        agenda_id: item.id,
        membro_id: memberId,
        ministerio_id: item.ministryId,
        funcao: 'ENVIADO',
        status: 'ENVIADO',
        enviado_por: this.userId(user),
        enviado_em: now,
        ativo: 'TRUE',
        criado_em: now,
        atualizado_em: now,
      });
    const status: MissionaryAgendaStatus = 'ENVIADA_AOS_MEMBROS';
    await this.save(item, user, {
      ...this.workflow(item),
      status,
      membros_enviados_por: this.userId(user),
      membros_enviados_em: now,
    });
    await this.log(
      item,
      status,
      'ENVIADA_AOS_MEMBROS',
      `${ids.length} membro(s) selecionado(s).`,
      user,
    );
    await this.notify('Você foi enviado para uma agenda missionária', item.title, ids, item.id);
    return this.findOne(id, user);
  }
  async history(id: string, user: AuthenticatedUser): Promise<MissionaryAgendaHistory[]> {
    await this.findOne(id, user);
    const rows = await this.repository.read('AgendaMissionariaHistorico');
    return rows
      .filter((row) => row.agenda_id === id)
      .map((row) => ({
        id: row.id,
        agendaId: row.agenda_id,
        previousStatus: row.status_anterior,
        status: row.status_novo,
        action: row.acao,
        note: row.observacao,
        userId: row.usuario_id,
        userName: row.usuario_nome,
        createdAt: row.criado_em,
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
