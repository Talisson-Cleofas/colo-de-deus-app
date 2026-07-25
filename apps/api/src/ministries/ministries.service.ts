import { Inject, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { MINISTRY_REPOSITORY, type IMinistryRepository } from '../persistence/interfaces/ministry-repository.interface';
import { StructureSyncService } from '../google/structure-sync.service';
import { AddMinistryMemberDto, CreateMinistryDto, RegisterMinistryAttendanceDto, UpdateMinistryDto } from './ministry.dto';
import type { MinistryAttendanceRecord, MinistryMemberRecord, MinistryRecord } from './ministries.types';
@Injectable()
export class MinistriesService {
  private readonly tab = 'Ministérios' as const;
  constructor(@Inject(MINISTRY_REPOSITORY) private readonly sheets: IMinistryRepository, private readonly sync: StructureSyncService) {}
  private async context() {
    const [members, participants, attendances] = await Promise.all([
      this.sheets.listMembers(),
      this.sheets.read('Participantes'),
      this.sheets.read('Presenças'),
    ]);
    return {
      members,
      participants,
      attendances,
      byId: new Map(members.map((member) => [member.id, member])),
      byEmail: new Map(members.map((member) => [member.email, member])),
    };
  }
  private parse(row: Record<string,string>, byId: Map<string, { id:string; email:string; name:string }>, membersCount = 0): MinistryRecord {
    const leader = byId.get(row.lider_id || '');
    const vice = byId.get(row.vice_lider_id || '');
    return {
      id: row.id || '', missionId: row.missao_id || 'missao-brasilia', name: row.nome || '', description: row.descricao || '',
      leaderId: leader?.id || row.lider_id || '', leaderEmail: leader?.email || '', leaderName: leader?.name || '',
      viceLeaderId: vice?.id || row.vice_lider_id || '', viceLeaderEmail: vice?.email || '', viceLeaderName: vice?.name || '',
      color: row.cor || '', icon: row.icone || '', type: row.tipo || 'OUTRO', order: Number(row.ordem || 0),
      createdAt: row.criado_em || '', updatedAt: row.atualizado_em || '', active: this.sheets.parseActive(row.ativo || ''),
      notes: row.observacoes || '', membersCount,
    };
  }
  private canManage(user: AuthenticatedUser, ministry: MinistryRecord): boolean {
    return ['ADMIN', 'MISSION_LEADER', 'DEVELOPER'].includes(user.profile) || (user.profile === 'MINISTRY_LEADER' && ministry.leaderId === user.memberId);
  }
  private assertCanManage(user: AuthenticatedUser, ministry: MinistryRecord) {
    if (!this.canManage(user, ministry)) throw new ForbiddenException('Você só pode gerenciar o ministério no qual é líder.');
  }
  async list(user: AuthenticatedUser, includeInactive = false): Promise<MinistryRecord[]> {
    const { byId, participants } = await this.context();
    const counts = new Map<string, number>();
    participants.filter((row) => row.tipo === 'MINISTERIO' && this.sheets.parseActive(row.ativo || '')).forEach((row) => counts.set(row.referencia_id, (counts.get(row.referencia_id) || 0) + 1));
    let items = (await this.sheets.read(this.tab)).map((row) => this.parse(row, byId, counts.get(row.id) || 0)).filter((item) => item.id && item.name);
    if (user.profile === 'MINISTRY_LEADER') items = items.filter((item) => item.leaderId === user.memberId || item.viceLeaderId === user.memberId);
    return items.filter((item) => includeInactive || item.active).sort((a,b) => a.order - b.order || a.name.localeCompare(b.name,'pt-BR'));
  }
  private async getById(id: string): Promise<MinistryRecord> {
    const { byId, participants } = await this.context();
    const row = (await this.sheets.read(this.tab)).find((item) => item.id === id);
    if (!row) throw new NotFoundException('Ministério não encontrado.');
    const count = participants.filter((item) => item.tipo === 'MINISTERIO' && item.referencia_id === id && this.sheets.parseActive(item.ativo || '')).length;
    return this.parse(row, byId, count);
  }
  async detail(id: string, user: AuthenticatedUser) {
    const ministry = await this.getById(id);
    this.assertCanManage(user, ministry);
    const [members, attendances] = await Promise.all([this.listMembers(id, user), this.listAttendance(id, user)]);
    return { ministry, members, attendances };
  }
  async create(dto: CreateMinistryDto): Promise<MinistryRecord> {
    const name = dto.name.trim();
    const allRows = await this.sheets.read(this.tab);
    if (allRows.some((item) => (item.nome || '').trim().toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) throw new ConflictException('Já existe um ministério com este nome.');
    const { byEmail } = await this.context();
    const leader = dto.leaderEmail ? byEmail.get(dto.leaderEmail.trim().toLowerCase()) : undefined;
    const vice = dto.viceLeaderEmail ? byEmail.get(dto.viceLeaderEmail.trim().toLowerCase()) : undefined;
    const now = new Date().toISOString();
    const id = randomUUID();
    await this.sheets.appendRecord(this.tab, {
      id, missao_id:dto.missionId || 'missao-brasilia', nome:name, descricao:dto.description?.trim() || '', lider_id:leader?.id || '', vice_lider_id:vice?.id || '',
      cor:dto.color?.trim() || '#9e6939', icone:dto.icon?.trim() || '', tipo:dto.type?.trim() || 'OUTRO', ordem:0,
      ativo:'TRUE', observacoes:dto.notes?.trim() || '', criado_em:now, atualizado_em:now,
    });
    if (leader) await this.upsertParticipant(id, leader.id, 'LIDER');
    if (vice) await this.upsertParticipant(id, vice.id, 'VICE_LIDER');
    await this.sync.reconcileStructure('MINISTERIO', id);
    return this.getById(id);
  }
  async update(id: string, dto: UpdateMinistryDto, user: AuthenticatedUser): Promise<MinistryRecord> {
    const current = await this.getById(id);
    this.assertCanManage(user, current);
    const allRows = await this.sheets.read(this.tab);
    if (dto.name) {
      const normalized = dto.name.trim().toLocaleLowerCase('pt-BR');
      if (allRows.some((item) => item.id !== id && (item.nome || '').trim().toLocaleLowerCase('pt-BR') === normalized)) throw new ConflictException('Já existe um ministério com este nome.');
    }
    const source = allRows.find((row) => row.id === id);
    if (!source) throw new NotFoundException('Ministério não encontrado na planilha.');
    const { byEmail } = await this.context();
    const leaderEmail = dto.leaderEmail !== undefined ? dto.leaderEmail.trim().toLowerCase() : current.leaderEmail;
    const viceLeaderEmail = dto.viceLeaderEmail !== undefined ? dto.viceLeaderEmail.trim().toLowerCase() : current.viceLeaderEmail;
    const leader = byEmail.get(leaderEmail);
    const vice = byEmail.get(viceLeaderEmail);
    const isAdmin = ['ADMIN', 'MISSION_LEADER', 'DEVELOPER'].includes(user.profile);
    await this.sheets.updateRecord(this.tab, 'id', id, {
      ...source,
      missao_id:dto.missionId ?? current.missionId,
      nome:dto.name?.trim() ?? current.name,
      descricao:dto.description?.trim() ?? current.description,
      lider_id:isAdmin ? (leader?.id || '') : current.leaderId,
      vice_lider_id:isAdmin ? (vice?.id || '') : current.viceLeaderId,
      cor:dto.color?.trim() ?? current.color,
      icone:dto.icon?.trim() ?? current.icon,
      tipo:dto.type?.trim() ?? current.type,
      ativo:isAdmin && dto.active !== undefined ? (dto.active ? 'TRUE' : 'FALSE') : (current.active ? 'TRUE' : 'FALSE'),
      observacoes:dto.notes?.trim() ?? current.notes,
      atualizado_em:new Date().toISOString(),
    });
    if (isAdmin && leader) await this.upsertParticipant(id, leader.id, 'LIDER');
    if (isAdmin && vice) await this.upsertParticipant(id, vice.id, 'VICE_LIDER');
    if (isAdmin) await this.sync.reconcileStructure('MINISTERIO', id);
    return this.getById(id);
  }
  async deactivate(id: string, user: AuthenticatedUser): Promise<void> { await this.update(id, { active: false }, user); }
  async listMembers(id: string, user: AuthenticatedUser): Promise<MinistryMemberRecord[]> {
    const ministry = await this.getById(id); this.assertCanManage(user, ministry);
    const { byId, participants } = await this.context();
    return participants.filter((row) => row.tipo === 'MINISTERIO' && row.referencia_id === id && this.sheets.parseActive(row.ativo || '')).map((row) => {
      const member = byId.get(row.membro_id);
      return { participantId:row.id, memberId:row.membro_id, name:member?.name || 'Membro não encontrado', email:member?.email || '', photo:member?.photo || '', role:member?.role || '', profile:member?.profile || 'MEMBER', function:row.funcao || 'MEMBRO', joinedAt:row.data_entrada || row.criado_em || '', active:Boolean(member?.active) };
    }).sort((a,b) => a.name.localeCompare(b.name,'pt-BR'));
  }
  private async upsertParticipant(ministryId:string, memberId:string, func:string) {
    const rows = await this.sheets.read('Participantes');
    const existing = rows.find((row) => row.tipo === 'MINISTERIO' && row.referencia_id === ministryId && row.membro_id === memberId);
    const now = new Date().toISOString();
    if (existing) await this.sheets.updateRecord('Participantes','id',existing.id,{...existing,funcao:func,ativo:'TRUE',data_saida:'',atualizado_em:now});
    else await this.sheets.appendRecord('Participantes',{id:randomUUID(),membro_id:memberId,tipo:'MINISTERIO',referencia_id:ministryId,funcao:func,data_entrada:now.slice(0,10),data_saida:'',ativo:'TRUE',criado_em:now,atualizado_em:now});
  }
  async addMember(id:string, dto:AddMinistryMemberDto, user:AuthenticatedUser) {
    const ministry = await this.getById(id); this.assertCanManage(user,ministry);
    const member = (await this.sheets.listMembers()).find((item) => item.id === dto.memberId && item.active);
    if (!member) throw new NotFoundException('Membro ativo não encontrado.');
    await this.upsertParticipant(id,dto.memberId,dto.function || 'MEMBRO');
    return this.listMembers(id,user);
  }
  async removeMember(id:string, memberId:string, user:AuthenticatedUser) {
    const ministry = await this.getById(id); this.assertCanManage(user,ministry);
    if ([ministry.leaderId,ministry.viceLeaderId].includes(memberId)) throw new ConflictException('Altere a liderança antes de remover este membro.');
    const rows = await this.sheets.read('Participantes');
    const row = rows.find((item) => item.tipo === 'MINISTERIO' && item.referencia_id === id && item.membro_id === memberId && this.sheets.parseActive(item.ativo || ''));
    if (!row) throw new NotFoundException('Vínculo não encontrado.');
    const now = new Date().toISOString();
    await this.sheets.updateRecord('Participantes','id',row.id,{...row,ativo:'FALSE',data_saida:now.slice(0,10),atualizado_em:now});
  }
  async listAttendance(id:string,user:AuthenticatedUser):Promise<MinistryAttendanceRecord[]> {
    const ministry = await this.getById(id); this.assertCanManage(user,ministry);
    const { byId, attendances } = await this.context();
    return attendances.filter((row) => row.tipo === 'MINISTERIO' && row.referencia_id === id).map((row) => ({
      id:row.id, memberId:row.membro_id, memberName:byId.get(row.membro_id)?.name || 'Membro não encontrado', date:row.data || '',
      present:this.sheets.parseActive(row.presente || ''), justification:row.justificativa || '', registeredBy:row.registrado_por || '', origin:row.origem || '', createdAt:row.criado_em || '', updatedAt:row.atualizado_em || '',
    })).sort((a,b) => b.date.localeCompare(a.date));
  }
  async registerAttendance(id:string,dto:RegisterMinistryAttendanceDto,user:AuthenticatedUser) {
    const ministry = await this.getById(id); this.assertCanManage(user,ministry);
    const participant = (await this.listMembers(id,user)).find((item) => item.memberId === dto.memberId);
    if (!participant) throw new ConflictException('O membro não está vinculado a este ministério.');
    const rows = await this.sheets.read('Presenças');
    const existing = rows.find((row) => row.tipo === 'MINISTERIO' && row.referencia_id === id && row.membro_id === dto.memberId && row.data === dto.date);
    const now = new Date().toISOString();
    const record = { membro_id:dto.memberId,tipo:'MINISTERIO',referencia_id:id,evento_id:'',data:dto.date,presente:dto.present?'TRUE':'FALSE',justificativa:dto.justification?.trim() || '',registrado_por:user.memberId,origem:'LIDER',atualizado_em:now };
    if (existing) await this.sheets.updateRecord('Presenças','id',existing.id,{...existing,...record});
    else await this.sheets.appendRecord('Presenças',{id:randomUUID(),...record,criado_em:now});
    return this.listAttendance(id,user);
  }
}
