import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { GoogleSheetsService, type SheetRecord } from '../google/google-sheets.service';
import { SHEET_SCHEMAS } from '../google/sheet-schemas';
import { normalizeMinistryModule } from '../rbac/ministry-permission.map';
import type { SaveCenacleMissionDto, SaveCenacleMissionFeedbackDto } from './cenacle-missions.dto';

@Injectable()
export class CenacleMissionsService implements OnModuleInit {
  constructor(private readonly sheets: GoogleSheetsService) {}
  async onModuleInit() {
    await this.sheets.ensureTab('MissoesCenaculo', SHEET_SCHEMAS.MissoesCenaculo);
    await this.sheets.ensureTab('MissoesCenaculoFeedback', SHEET_SCHEMAS.MissoesCenaculoFeedback);
  }
  private uid(user: AuthenticatedUser) {
    return user.memberId || user.id || user.uid;
  }
  private central(user: AuthenticatedUser) {
    return ['DEVELOPER', 'MISSION_LEADER', 'ADMIN'].includes(user.profile);
  }
  private active(row: SheetRecord) {
    return !row.ativo || this.sheets.parseActive(row.ativo, true);
  }
  private ids(row: SheetRecord) {
    return String(row.participantes_ids || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }
  private async managedMinistryIds(user: AuthenticatedUser) {
    if (this.central(user)) return null;
    if (user.profile !== 'MINISTRY_LEADER') return new Set<string>();
    const uid = this.uid(user);
    return new Set(
      (await this.sheets.read('Ministérios'))
        .filter(
          (row) =>
            this.active(row) &&
            (row.lider_id === uid ||
              row.vice_lider_id === uid ||
              (!!user.ministry && row.nome === user.ministry)),
        )
        .filter(
          (row) =>
            normalizeMinistryModule(row.codigo || row.code || row.tipo || row.nome || '') ===
            'MISSOES',
        )
        .map((row) => row.id),
    );
  }
  private async canManage(user: AuthenticatedUser, ministryId = '') {
    const ids = await this.managedMinistryIds(user);
    return ids === null || (Boolean(ministryId) && ids.has(ministryId));
  }
  private async mission(id: string) {
    const row = (await this.sheets.read('MissoesCenaculo')).find(
      (item) => item.id === id && this.active(item),
    );
    if (!row) throw new NotFoundException('Missão não encontrada.');
    return row;
  }
  private async map(row: SheetRecord, user: AuthenticatedUser) {
    const [members, feedback] = await Promise.all([
      this.sheets.listMembers(),
      this.sheets.read('MissoesCenaculoFeedback'),
    ]);
    const memberNames = new Map(members.map((member) => [member.id, member.name]));
    const participantIds = this.ids(row);
    const ownFeedback = feedback.find(
      (item) => item.missao_id === row.id && item.membro_id === this.uid(user),
    );
    return {
      id: row.id,
      title: row.titulo,
      description: row.descricao || '',
      date: row.data,
      time: row.horario,
      location: row.local,
      ministryId: row.ministerio_id || '',
      status: row.status || 'AGENDADA',
      participantIds,
      participantNames: participantIds.map((id) => memberNames.get(id) || id),
      canManage: await this.canManage(user, row.ministerio_id || ''),
      canGiveFeedback:
        participantIds.includes(this.uid(user)) &&
        row.data <= new Date().toISOString().slice(0, 10) &&
        !ownFeedback,
      feedbackSubmitted: Boolean(ownFeedback),
      feedbackCount: feedback.filter((item) => item.missao_id === row.id).length,
    };
  }
  async list(user: AuthenticatedUser) {
    const rows = (await this.sheets.read('MissoesCenaculo')).filter((row) => this.active(row));
    const manager = this.central(user) || (await this.managedMinistryIds(user))!.size > 0;
    const visible = manager ? rows : rows.filter((row) => this.ids(row).includes(this.uid(user)));
    return Promise.all(
      visible
        .sort((a, b) => `${a.data}T${a.horario}`.localeCompare(`${b.data}T${b.horario}`))
        .map((row) => this.map(row, user)),
    );
  }
  async options(user: AuthenticatedUser) {
    const [members, ministries] = await Promise.all([
      this.sheets.listMembers(),
      this.sheets.read('Ministérios'),
    ]);
    const managed = await this.managedMinistryIds(user);
    return {
      members: members
        .filter((member) => member.active)
        .map((member) => ({ id: member.id, name: member.name })),
      ministries: ministries
        .filter(
          (row) =>
            this.active(row) &&
            normalizeMinistryModule(row.codigo || row.code || row.tipo || row.nome || '') ===
              'MISSOES' &&
            (managed === null || managed.has(row.id)),
        )
        .map((row) => ({ id: row.id, name: row.nome })),
      canCreate: managed === null || managed.size > 0,
    };
  }
  private validate(dto: SaveCenacleMissionDto) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(dto.time))
      throw new BadRequestException('Informe data e horário válidos.');
    if (!dto.participantIds.length)
      throw new BadRequestException('Selecione pelo menos um participante.');
  }
  private async assertReferences(dto: SaveCenacleMissionDto) {
    if (!dto.ministryId) throw new BadRequestException('Selecione o Ministério de Missões.');
    const [ministries, members] = await Promise.all([
      this.sheets.read('Ministérios'),
      this.sheets.listMembers(),
    ]);
    const ministry = ministries.find((row) => row.id === dto.ministryId && this.active(row));
    if (
      !ministry ||
      normalizeMinistryModule(
        ministry.codigo || ministry.code || ministry.tipo || ministry.nome || '',
      ) !== 'MISSOES'
    )
      throw new BadRequestException('Selecione um Ministério de Missões ativo.');
    const activeIds = new Set(members.filter((member) => member.active).map((member) => member.id));
    if (dto.participantIds.some((id) => !activeIds.has(id)))
      throw new BadRequestException('Selecione somente membros ativos como participantes.');
  }
  async create(dto: SaveCenacleMissionDto, user: AuthenticatedUser) {
    this.validate(dto);
    await this.assertReferences(dto);
    if (!(await this.canManage(user, dto.ministryId || '')))
      throw new ForbiddenException(
        'Somente a liderança do Ministério de Missões pode criar esta missão.',
      );
    const now = new Date().toISOString(),
      id = randomUUID();
    await this.sheets.appendRecord('MissoesCenaculo', {
      id,
      titulo: dto.title.trim(),
      descricao: dto.description?.trim() || '',
      data: dto.date,
      horario: dto.time,
      local: dto.location.trim(),
      ministerio_id: dto.ministryId || '',
      participantes_ids: [...new Set(dto.participantIds)].join(','),
      status: dto.status || 'AGENDADA',
      ativo: 'TRUE',
      criado_por: this.uid(user),
      criado_em: now,
      atualizado_por: this.uid(user),
      atualizado_em: now,
    });
    return this.map(await this.mission(id), user);
  }
  async update(id: string, dto: SaveCenacleMissionDto, user: AuthenticatedUser) {
    this.validate(dto);
    await this.assertReferences(dto);
    const old = await this.mission(id);
    if (!(await this.canManage(user, old.ministerio_id || dto.ministryId || '')))
      throw new ForbiddenException('Você não pode alterar esta missão.');
    const row = {
      ...old,
      titulo: dto.title.trim(),
      descricao: dto.description?.trim() || '',
      data: dto.date,
      horario: dto.time,
      local: dto.location.trim(),
      ministerio_id: dto.ministryId || old.ministerio_id || '',
      participantes_ids: [...new Set(dto.participantIds)].join(','),
      status: dto.status || old.status || 'AGENDADA',
      atualizado_por: this.uid(user),
      atualizado_em: new Date().toISOString(),
    };
    await this.sheets.updateRecord('MissoesCenaculo', 'id', id, row);
    return this.map(row, user);
  }
  async feedback(id: string, dto: SaveCenacleMissionFeedbackDto, user: AuthenticatedUser) {
    const row = await this.mission(id),
      uid = this.uid(user);
    if (!this.ids(row).includes(uid))
      throw new ForbiddenException('Somente participantes enviados podem responder ao feedback.');
    if (row.data > new Date().toISOString().slice(0, 10))
      throw new BadRequestException('O feedback ficará disponível após a data da missão.');
    const feedback = await this.sheets.read('MissoesCenaculoFeedback');
    if (feedback.some((item) => item.missao_id === id && item.membro_id === uid))
      throw new ConflictException('Você já respondeu ao feedback desta missão.');
    const now = new Date().toISOString();
    await this.sheets.appendRecord('MissoesCenaculoFeedback', {
      id: randomUUID(),
      missao_id: id,
      membro_id: uid,
      nota: String(dto.rating),
      pontos_positivos: dto.strengths || '',
      pontos_melhoria: dto.improvements || '',
      criado_em: now,
      atualizado_em: now,
    });
    return { success: true, message: 'Feedback enviado com sucesso.' };
  }
  async results(id: string, user: AuthenticatedUser) {
    const row = await this.mission(id);
    if (!(await this.canManage(user, row.ministerio_id || '')))
      throw new ForbiddenException('Você não pode consultar estas respostas.');
    const [feedback, members] = await Promise.all([
      this.sheets.read('MissoesCenaculoFeedback'),
      this.sheets.listMembers(true),
    ]);
    const names = new Map(members.map((member) => [member.id, member.name]));
    return feedback
      .filter((item) => item.missao_id === id)
      .map((item) => ({
        id: item.id,
        memberId: item.membro_id,
        memberName: names.get(item.membro_id) || 'Membro',
        rating: Number(item.nota || 0),
        strengths: item.pontos_positivos || '',
        improvements: item.pontos_melhoria || '',
        createdAt: item.criado_em || '',
      }));
  }
}
