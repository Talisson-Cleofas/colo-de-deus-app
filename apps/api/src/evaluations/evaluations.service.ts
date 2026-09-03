import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { GoogleSheetsService, type SheetRecord } from '../google/google-sheets.service';
import { SHEET_SCHEMAS } from '../google/sheet-schemas';
import { NotificationsService } from '../notifications/notifications.service';
import { AnswerEvaluationDto, CreateEvaluationDto } from './evaluations.dto';

export const EVALUATION_QUESTIONS = ['Acolhimento e escuta', 'Comunicação e clareza', 'Organização e compromisso', 'Condução espiritual e serviço'];
type Target = { id: string; name: string; kind: 'MISSION' | 'MINISTRY' | 'SELF' };
const central = (profile: string) => ['DEVELOPER', 'MISSION_LEADER', 'ADMIN'].includes(profile);
const mission = (profile: string) => ['MISSION_LEADER', 'ADMIN'].includes(profile);

@Injectable()
export class EvaluationsService {
  constructor(private readonly sheets: GoogleSheetsService, private readonly notifications: NotificationsService) {}
  // Serialize Sheets read/check/write operations in this API process.
  private queue: Promise<unknown> = Promise.resolve();
  private exclusive<T>(work: () => Promise<T>): Promise<T> {
    const result = this.queue.then(work);
    this.queue = result.catch(() => undefined);
    return result;
  }
  private uid(user: AuthenticatedUser) { return user.memberId || user.id; }
  private admin(user: AuthenticatedUser) {
    if (!central(user.profile)) throw new ForbiddenException('Somente líderes de missão e desenvolvedor podem gerir avaliações e consultar respostas.');
  }
  private async rows(tab: 'AvaliacoesCiclos' | 'AvaliacoesRespostas') {
    await this.sheets.ensureTab(tab, SHEET_SCHEMAS[tab]);
    return this.sheets.read(tab);
  }
  private async cycle(id: string) {
    const row = (await this.rows('AvaliacoesCiclos')).find(item => item.id === id);
    if (!row) throw new NotFoundException('Avaliação não encontrada.');
    return row;
  }
  private publicCycle(row: SheetRecord) {
    return { id: row.id, title: row.titulo, year: Number(row.ano), status: row.status, notified: Boolean(row.notificado_em) };
  }
  private async context(user: AuthenticatedUser) {
    const [members, ministries, participants] = await Promise.all([
      this.sheets.listMembers(), this.sheets.read('Ministérios'), this.sheets.read('Participantes'),
    ]);
    const activeMembers = members.filter(m => m.active);
    const respondent = activeMembers.find(m => m.id === this.uid(user));
    if (!respondent) throw new ForbiddenException('Somente membros ativos podem responder.');
    const activeMinistries = ministries.filter(m => !m.deleted_at && this.sheets.parseActive(m.ativo, true));
    const isMinistryLeader = respondent.profile === 'MINISTRY_LEADER' || activeMinistries.some(m => m.lider_id === respondent.id || m.vice_lider_id === respondent.id);
    const targets: Target[] = [];
    if (mission(respondent.profile)) {
      targets.push({ id: `SELF:${respondent.id}`, name: 'Reflexão sobre meu ano de liderança', kind: 'SELF' });
    } else {
      activeMembers.filter(m => mission(m.profile) && m.id !== respondent.id).forEach(m => targets.push({ id: `MISSION:${m.id}`, name: m.name, kind: 'MISSION' }));
    }
    if (mission(respondent.profile) || !isMinistryLeader) {
      const joined = new Set(participants.filter(p => p.tipo === 'MINISTERIO' && p.membro_id === respondent.id && this.sheets.parseActive(p.ativo, true)).map(p => p.referencia_id));
      for (const ministry of activeMinistries) {
        if (!mission(respondent.profile) && !joined.has(ministry.id) && respondent.ministry !== ministry.nome && respondent.ministry !== ministry.id) continue;
        for (const leaderId of [ministry.lider_id, ministry.vice_lider_id]) {
          const leader = activeMembers.find(m => m.id === leaderId);
          if (!leader || leader.id === respondent.id) continue;
          targets.push({ id: `MINISTRY:${ministry.id}:${leader.id}`, name: `${leader.name} — ${ministry.nome}`, kind: 'MINISTRY' });
        }
      }
    }
    return { respondent, targets: [...new Map(targets.map(t => [t.id, t])).values()] };
  }
  async mine(user: AuthenticatedUser) {
    const [{ targets }, cycles, answers] = await Promise.all([this.context(user), this.rows('AvaliacoesCiclos'), this.rows('AvaliacoesRespostas')]);
    return { questions: EVALUATION_QUESTIONS, cycles: cycles.filter(c => c.status === 'OPEN').map(c => ({
      ...this.publicCycle(c), targets: targets.map(t => ({ ...t, submitted: answers.some(a => a.ciclo_id === c.id && a.membro_id === this.uid(user) && a.alvo_id === t.id) })),
    })) };
  }
  async list(user: AuthenticatedUser) {
    this.admin(user);
    const [cycles, answers] = await Promise.all([this.rows('AvaliacoesCiclos'), this.rows('AvaliacoesRespostas')]);
    return cycles.map(c => ({ ...this.publicCycle(c), responses: answers.filter(a => a.ciclo_id === c.id).length }));
  }
  async create(dto: CreateEvaluationDto, user: AuthenticatedUser) {
    this.admin(user);
    if (dto.title.trim().length < 3) throw new BadRequestException('Informe um título.');
    const row = { id: randomUUID(), titulo: dto.title.trim(), ano: String(dto.year), status: 'DRAFT', criado_por: this.uid(user), criado_em: new Date().toISOString() };
    await this.sheets.appendRecord('AvaliacoesCiclos', row);
    return this.publicCycle(row);
  }
  async open(id: string, user: AuthenticatedUser) {
    this.admin(user);
    return this.exclusive(async () => {
      let row = await this.cycle(id);
      if (!['DRAFT', 'OPEN'].includes(row.status)) throw new ConflictException('Esta avaliação já foi encerrada.');
      if (row.status === 'DRAFT') {
        row = { ...row, status: 'OPEN', liberado_por: this.uid(user), liberado_em: new Date().toISOString() };
        await this.sheets.updateRecord('AvaliacoesCiclos', 'id', id, row);
      }
      if (!row.notificado_em) {
        // A retry after a Sheets failure must not broadcast a second request.
        const sent = (await this.sheets.read('Notificações')).some(n => n.referencia_tipo === 'AVALIACAO' && n.referencia_id === id);
        if (!sent) await this.notifications.createSystem({ title: 'Avaliação de liderança disponível', message: `${row.titulo}: participe da avaliação. As respostas são identificadas e visíveis somente para líderes de missão e desenvolvedor.`, type: 'SISTEMA', audience: 'TODOS', link: '/avaliacoes', origin: 'Avaliações', referenceType: 'AVALIACAO', referenceId: id });
        row.notificado_em = new Date().toISOString();
        await this.sheets.updateRecord('AvaliacoesCiclos', 'id', id, row);
      }
      return this.publicCycle(row);
    });
  }
  async close(id: string, user: AuthenticatedUser) {
    this.admin(user);
    return this.exclusive(async () => {
      const row = await this.cycle(id);
      if (row.status !== 'OPEN') throw new ConflictException('Somente avaliações abertas podem ser encerradas.');
      await this.sheets.updateRecord('AvaliacoesCiclos', 'id', id, { ...row, status: 'CLOSED', encerrado_por: this.uid(user), encerrado_em: new Date().toISOString() });
      return { success: true };
    });
  }
  async answer(id: string, dto: AnswerEvaluationDto, user: AuthenticatedUser) {
    return this.exclusive(async () => {
      const cycle = await this.cycle(id);
      if (cycle.status !== 'OPEN') throw new ConflictException('Esta avaliação não está liberada para respostas.');
      const { respondent, targets } = await this.context(user);
      const target = targets.find(t => t.id === dto.targetId);
      if (!target) throw new ForbiddenException('Você não pode avaliar esta liderança.');
      if (target.kind === 'SELF' && !dto.reflection.trim()) throw new BadRequestException('Descreva como foi seu ano de liderança.');
      const answers = await this.rows('AvaliacoesRespostas');
      if (answers.some(a => a.ciclo_id === id && a.membro_id === respondent.id && a.alvo_id === target.id)) throw new ConflictException('Você já enviou esta avaliação.');
      await this.sheets.appendRecord('AvaliacoesRespostas', {
        id: randomUUID(), ciclo_id: id, membro_id: respondent.id, membro_nome: respondent.name, perfil: respondent.profile,
        alvo_id: target.id, alvo_nome: target.name, tipo: target.kind, notas: JSON.stringify(dto.scores),
        pontos_fortes: dto.strengths.trim(), melhorias: dto.improvements.trim(), reflexao: target.kind === 'SELF' ? dto.reflection.trim() : '', enviado_em: new Date().toISOString(),
      });
      return { success: true };
    });
  }
  async results(id: string, user: AuthenticatedUser) {
    this.admin(user);
    const cycle = await this.cycle(id);
    const rows = (await this.rows('AvaliacoesRespostas')).filter(a => a.ciclo_id === id);
    return { cycle: this.publicCycle(cycle), questions: EVALUATION_QUESTIONS, answers: rows.map(a => ({
      id: a.id, respondent: a.membro_nome, respondentId: a.membro_id, profile: a.perfil, target: a.alvo_nome, kind: a.tipo,
      scores: JSON.parse(a.notas) as number[], strengths: a.pontos_fortes, improvements: a.melhorias, reflection: a.reflexao, submittedAt: a.enviado_em,
    })) };
  }
}
