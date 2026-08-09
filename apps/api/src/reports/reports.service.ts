import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { escapeCsvCell, neutralizeSpreadsheetFormula } from '../common/spreadsheet-cell';
import { GoogleSheetsService, type SheetRecord } from '../google/google-sheets.service';
import type {
  OperationalReportQuery,
  ReportExportFormat,
  ReportMember,
  ReportScopeType,
} from './reports.types';

@Injectable()
export class ReportsService {
  constructor(private readonly sheets: GoogleSheetsService) {}
  private userId(user: AuthenticatedUser) {
    return user.memberId || user.id || user.uid;
  }
  private active(row: SheetRecord, fallback = true) {
    return this.sheets.parseActive(row.ativo || '', fallback);
  }
  private normalize(value = '') {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
  private inPeriod(date: string, start?: string, end?: string) {
    const day = (date || '').slice(0, 10);
    return Boolean(day) && (!start || day >= start) && (!end || day <= end);
  }
  private profileLabel(value = '') {
    const v = this.normalize(value).replace(/ /g, '_');
    if (v === 'admin') return 'ADMIN';
    if (['lider_ministerio', 'ministry_leader'].includes(v)) return 'MINISTRY_LEADER';
    if (['lider', 'lider_celula', 'cell_leader'].includes(v)) return 'CELL_LEADER';
    return 'MEMBER';
  }
  private monthKey(date = '') {
    return date.slice(0, 7);
  }
  private escapeCsv(value: unknown) {
    return escapeCsvCell(value);
  }
  private xmlEscape(value: unknown) {
    return neutralizeSpreadsheetFormula(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  private id(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private async context() {
    const [members, ministries, cells, cenacles, participants, attendance, events, confirmations] =
      await Promise.all([
        this.sheets.read('Membros'),
        this.sheets.read('Ministérios'),
        this.sheets.read('Células'),
        this.sheets.read('Cenáculos'),
        this.sheets.read('Participantes'),
        this.sheets.read('Presenças'),
        this.sheets.read('Eventos'),
        this.sheets.read('ConfirmacoesEventos'),
      ]);
    return {
      members,
      ministries,
      cells,
      cenacles,
      participants,
      attendance,
      events,
      confirmations,
    };
  }

  private scopeForUser(
    user: AuthenticatedUser,
    ministries: SheetRecord[],
    cells: SheetRecord[],
    cenacles: SheetRecord[],
  ) {
    const uid = this.userId(user);
    const ministryIds = new Set(
      ministries
        .filter((r) => this.active(r) && (r.lider_id === uid || r.vice_lider_id === uid))
        .map((r) => r.id),
    );
    const cellIds = new Set(
      cells
        .filter((r) => this.active(r) && (r.lider_id === uid || r.vice_lider_id === uid))
        .map((r) => r.id),
    );
    const cenacleIds = new Set(
      cenacles
        .filter(
          (r) => this.active(r) && (r.responsavel_id === uid || r.vice_responsavel_id === uid),
        )
        .map((r) => r.id),
    );
    if (user.profile === 'MINISTRY_LEADER') {
      cells.filter((r) => ministryIds.has(r.ministerio_id)).forEach((r) => cellIds.add(r.id));
      cenacles.filter((r) => ministryIds.has(r.ministerio_id)).forEach((r) => cenacleIds.add(r.id));
    }
    return { ministryIds, cellIds, cenacleIds };
  }

  private allowedMemberIds(
    user: AuthenticatedUser,
    participants: SheetRecord[],
    scope: ReturnType<ReportsService['scopeForUser']>,
  ) {
    if (['ADMIN', 'MISSION_LEADER', 'DEVELOPER'].includes(user.profile)) return null;
    const allowed = new Set<string>([this.userId(user)]);
    participants
      .filter((r) => this.active(r))
      .forEach((r) => {
        if (r.tipo === 'MINISTERIO' && scope.ministryIds.has(r.referencia_id))
          allowed.add(r.membro_id);
        if (r.tipo === 'CELULA' && scope.cellIds.has(r.referencia_id)) allowed.add(r.membro_id);
        if (r.tipo === 'CENACULO' && scope.cenacleIds.has(r.referencia_id))
          allowed.add(r.membro_id);
      });
    return allowed;
  }

  private validateRequestedScope(
    user: AuthenticatedUser,
    type: ReportScopeType,
    id: string,
    scope: ReturnType<ReportsService['scopeForUser']>,
  ) {
    if (['ADMIN', 'MISSION_LEADER', 'DEVELOPER'].includes(user.profile) || type === 'ALL' || !id)
      return;
    const permitted =
      (type === 'MINISTRY' && scope.ministryIds.has(id)) ||
      (type === 'CELL' && scope.cellIds.has(id)) ||
      (type === 'CENACLE' && scope.cenacleIds.has(id));
    if (!permitted)
      throw new ForbiddenException('Você não pode consultar relatórios desta estrutura.');
  }

  async options(user: AuthenticatedUser) {
    const { members, ministries, cells, cenacles, participants } = await this.context();
    const scope = this.scopeForUser(user, ministries, cells, cenacles);
    const allowed = this.allowedMemberIds(user, participants, scope);
    const canShow = (t: ReportScopeType, id: string) =>
      ['ADMIN', 'MISSION_LEADER', 'DEVELOPER'].includes(user.profile) ||
      (t === 'MINISTRY' && scope.ministryIds.has(id)) ||
      (t === 'CELL' && scope.cellIds.has(id)) ||
      (t === 'CENACLE' && scope.cenacleIds.has(id));
    return {
      members: members
        .filter((r) => this.active(r) && (!allowed || allowed.has(r.id)))
        .map((r) => ({ id: r.id, name: r.nome })),
      ministries: ministries
        .filter((r) => this.active(r) && canShow('MINISTRY', r.id))
        .map((r) => ({ id: r.id, name: r.nome })),
      cells: cells
        .filter((r) => this.active(r) && canShow('CELL', r.id))
        .map((r) => ({ id: r.id, name: r.nome })),
      cenacles: cenacles
        .filter((r) => this.active(r) && canShow('CENACLE', r.id))
        .map((r) => ({ id: r.id, name: r.nome })),
    };
  }

  async advanced(query: OperationalReportQuery, user: AuthenticatedUser) {
    const ctx = await this.context();
    const {
      members,
      ministries,
      cells,
      cenacles,
      participants,
      attendance,
      events,
      confirmations,
    } = ctx;
    const scope = this.scopeForUser(user, ministries, cells, cenacles);
    const type = query.structureType || 'ALL';
    const sid = query.structureId || '';
    this.validateRequestedScope(user, type, sid, scope);
    const allowed = this.allowedMemberIds(user, participants, scope);
    const links = participants.filter((r) => this.active(r));
    const sheetType =
      type === 'MINISTRY'
        ? 'MINISTERIO'
        : type === 'CELL'
          ? 'CELULA'
          : type === 'CENACLE'
            ? 'CENACULO'
            : '';
    const scopedIds =
      type !== 'ALL' && sid
        ? new Set(
            links
              .filter((r) => r.tipo === sheetType && r.referencia_id === sid)
              .map((r) => r.membro_id),
          )
        : null;
    const visible = members.filter(
      (r) =>
        (!allowed || allowed.has(r.id)) &&
        (!scopedIds || scopedIds.has(r.id)) &&
        (!query.memberId || r.id === query.memberId),
    );
    const mapNames = (rows: SheetRecord[]) => new Map(rows.map((r) => [r.id, r.nome]));
    const mm = mapNames(ministries),
      cm = mapNames(cells),
      zm = mapNames(cenacles);
    const selectedAttendance = attendance.filter(
      (r) =>
        this.inPeriod(r.data, query.startDate, query.endDate) &&
        visible.some((m) => m.id === r.membro_id) &&
        (!sid || (r.tipo === sheetType && r.referencia_id === sid)),
    );
    const compareAttendance = attendance.filter(
      (r) =>
        this.inPeriod(r.data, query.compareStartDate, query.compareEndDate) &&
        visible.some((m) => m.id === r.membro_id) &&
        (!sid || (r.tipo === sheetType && r.referencia_id === sid)),
    );
    const selectedEvents = events.filter((e) =>
      this.inPeriod(e.inicio, query.startDate, query.endDate),
    );
    const selectedEventIds = new Set(selectedEvents.map((e) => e.id));
    const eventResponses = confirmations.filter(
      (c) => selectedEventIds.has(c.evento_id) && visible.some((m) => m.id === c.membro_id),
    );
    const memberRows: ReportMember[] = visible.map((m) => {
      const records = selectedAttendance.filter((r) => r.membro_id === m.id);
      const pres = records.filter((r) => this.sheets.parseActive(r.presente || '')).length;
      const abs = records.length - pres;
      const confirmed = eventResponses.filter(
        (r) =>
          r.membro_id === m.id &&
          ['CONFIRMADO', 'PRESENTE', 'SIM'].includes((r.status || r.situacao || '').toUpperCase()),
      ).length;
      const eventAbsent = eventResponses.filter(
        (r) =>
          r.membro_id === m.id &&
          ['AUSENTE', 'NAO', 'NÃO', 'RECUSADO'].includes(
            (r.status || r.situacao || '').toUpperCase(),
          ),
      ).length;
      const names = (t: string, map: Map<string, string>) =>
        links
          .filter((r) => r.membro_id === m.id && r.tipo === t)
          .map((r) => map.get(r.referencia_id) || '')
          .filter(Boolean);
      return {
        id: m.id,
        name: m.nome || '',
        email: m.email || '',
        photo: m.foto || '',
        birthDate: m.data_nascimento || '',
        profile: this.profileLabel(m.perfil || ''),
        active: this.active(m),
        ministryNames: names('MINISTERIO', mm),
        cellNames: names('CELULA', cm),
        cenacleNames: names('CENACULO', zm),
        presences: pres,
        absences: abs,
        justifiedAbsences: records.filter(
          (r) => !this.sheets.parseActive(r.presente || '') && Boolean(r.justificativa?.trim()),
        ).length,
        attendanceRate: records.length ? Math.round((pres / records.length) * 100) : 0,
        eventConfirmed: confirmed,
        eventAbsent,
        participationScore: pres + confirmed,
      };
    });
    const search = this.normalize(query.search || '');
    const searched = search
      ? memberRows.filter((r) =>
          this.normalize(
            [r.name, r.email, ...r.ministryNames, ...r.cellNames, ...r.cenacleNames].join(' '),
          ).includes(search),
        )
      : memberRows;
    const monthlyMap = new Map<
      string,
      { month: string; presences: number; absences: number; rate: number }
    >();
    selectedAttendance.forEach((r) => {
      const k = this.monthKey(r.data);
      if (!k) return;
      const x = monthlyMap.get(k) || { month: k, presences: 0, absences: 0, rate: 0 };
      if (this.sheets.parseActive(r.presente || '')) x.presences++;
      else x.absences++;
      x.rate = Math.round((x.presences / (x.presences + x.absences)) * 100);
      monthlyMap.set(k, x);
    });
    const periodStats = (rows: SheetRecord[]) => {
      const p = rows.filter((r) => this.sheets.parseActive(r.presente || '')).length;
      return {
        records: rows.length,
        presences: p,
        absences: rows.length - p,
        rate: rows.length ? Math.round((p / rows.length) * 100) : 0,
      };
    };
    const birthdays = searched
      .filter((r) => {
        const md = (r.birthDate || '').slice(5, 10);
        if (!md) return false;
        const s = (query.startDate || '').slice(5, 10),
          e = (query.endDate || '').slice(5, 10);
        return !s || !e || s <= e ? md >= s && md <= e : md >= s || md <= e;
      })
      .map((r) => ({ id: r.id, name: r.name, birthDate: r.birthDate, photo: r.photo }))
      .sort((a, b) => a.birthDate.slice(5).localeCompare(b.birthDate.slice(5)));
    const low = Number(query.lowFrequencyThreshold) || 75;
    const ranking = [...searched]
      .sort(
        (a, b) =>
          b.participationScore - a.participationScore || b.attendanceRate - a.attendanceRate,
      )
      .slice(0, 20);
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 5), 100),
      page = Math.max(Number(query.page) || 1, 1);
    return {
      generatedAt: new Date().toISOString(),
      scope: { profile: user.profile, structureType: type, structureId: sid },
      indicators: {
        ...periodStats(selectedAttendance),
        members: searched.length,
        eventConfirmations: eventResponses.filter((r) =>
          ['CONFIRMADO', 'PRESENTE', 'SIM'].includes((r.status || r.situacao || '').toUpperCase()),
        ).length,
        eventAbsences: eventResponses.filter((r) =>
          ['AUSENTE', 'NAO', 'NÃO', 'RECUSADO'].includes(
            (r.status || r.situacao || '').toUpperCase(),
          ),
        ).length,
        birthdays: birthdays.length,
      },
      comparison: {
        current: periodStats(selectedAttendance),
        previous: periodStats(compareAttendance),
        rateDifference: periodStats(selectedAttendance).rate - periodStats(compareAttendance).rate,
      },
      monthly: [...monthlyMap.values()].sort((a, b) => a.month.localeCompare(b.month)),
      birthdays,
      ranking,
      lowFrequency: searched
        .filter((r) => r.presences + r.absences > 0 && r.attendanceRate < low)
        .sort((a, b) => a.attendanceRate - b.attendanceRate),
      members: searched.slice((page - 1) * pageSize, page * pageSize),
      pagination: {
        page,
        pageSize,
        total: searched.length,
        totalPages: Math.max(1, Math.ceil(searched.length / pageSize)),
      },
    };
  }

  async operational(query: OperationalReportQuery, user: AuthenticatedUser) {
    return this.advanced(query, user);
  }

  async history(user: AuthenticatedUser) {
    const rows = await this.sheets.read('RelatoriosHistorico');
    const uid = this.userId(user);
    return rows
      .filter(
        (r) =>
          ['DEVELOPER', 'MISSION_LEADER', 'ADMIN'].includes(user.profile) || r.gerado_por === uid,
      )
      .sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || ''))
      .slice(0, 100);
  }

  async export(query: OperationalReportQuery, format: ReportExportFormat, user: AuthenticatedUser) {
    const report = await this.advanced({ ...query, page: 1, pageSize: 100 }, user);
    const rows = report.members;
    const headers = [
      'Membro',
      'E-mail',
      'Perfil',
      'Ministérios',
      'Células',
      'Cenáculos',
      'Presenças',
      'Faltas',
      'Justificadas',
      'Assiduidade',
      'Eventos confirmados',
      'Ausências em eventos',
      'Pontuação',
    ];
    const values = rows.map((r) => [
      r.name,
      r.email,
      r.profile,
      r.ministryNames.join('; '),
      r.cellNames.join('; '),
      r.cenacleNames.join('; '),
      r.presences,
      r.absences,
      r.justifiedAbsences,
      `${r.attendanceRate}%`,
      r.eventConfirmed,
      r.eventAbsent,
      r.participationScore,
    ]);
    let buffer: Buffer, mime: string, extension: string;
    if (format === 'csv') {
      buffer = Buffer.from(
        '\uFEFF' +
          [headers, ...values].map((row) => row.map((v) => this.escapeCsv(v)).join(';')).join('\n'),
        'utf8',
      );
      mime = 'text/csv; charset=utf-8';
      extension = 'csv';
    } else if (format === 'xlsx') {
      const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Relatório"><Table>${[headers, ...values].map((row) => `<Row>${row.map((v) => `<Cell><Data ss:Type="String">${this.xmlEscape(v)}</Data></Cell>`).join('')}</Row>`).join('')}</Table></Worksheet></Workbook>`;
      buffer = Buffer.from(xml, 'utf8');
      mime = 'application/vnd.ms-excel';
      extension = 'xls';
    } else {
      const lines = [
        'RELATÓRIO AVANÇADO - COLO DE DEUS',
        `Período: ${query.startDate || '-'} a ${query.endDate || '-'}`,
        `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
        '',
        ...rows.map(
          (r) =>
            `${r.name} | Assiduidade ${r.attendanceRate}% | Presenças ${r.presences} | Faltas ${r.absences} | Eventos ${r.eventConfirmed}`,
        ),
      ];
      const content = lines.join('\n').replace(/[()\\]/g, (m) => '\\' + m);
      const stream = `BT /F1 10 Tf 40 800 Td 12 TL (${content.replace(/\n/g, ') Tj T* (')}) Tj ET`;
      const objects = [
        `1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj`,
        `2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj`,
        `3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources<< /Font<< /F1 5 0 R>>>> /Contents 4 0 R >>endobj`,
        `4 0 obj<< /Length ${Buffer.byteLength(stream)} >>stream\n${stream}\nendstream endobj`,
        `5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj`,
      ];
      let pdf = '%PDF-1.4\n';
      const offsets = [0];
      objects.forEach((o) => {
        offsets.push(Buffer.byteLength(pdf));
        pdf += o + '\n';
      });
      const xref = Buffer.byteLength(pdf);
      pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
        .slice(1)
        .map((n) => String(n).padStart(10, '0') + ' 00000 n ')
        .join('\n')}\ntrailer<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
      buffer = Buffer.from(pdf, 'latin1');
      mime = 'application/pdf';
      extension = 'pdf';
    }
    const fileName = `relatorio-${query.structureType || 'geral'}-${new Date().toISOString().slice(0, 10)}.${extension}`;
    await this.sheets.appendRecord('RelatoriosHistorico', {
      id: this.id('REL'),
      tipo: 'AVANCADO',
      formato: format.toUpperCase(),
      escopo_tipo: query.structureType || 'ALL',
      escopo_id: query.structureId || '',
      membro_id: query.memberId || '',
      periodo_inicio: query.startDate || '',
      periodo_fim: query.endDate || '',
      gerado_por: this.userId(user),
      gerado_por_nome: user.name || user.email || '',
      status: 'GERADO',
      arquivo_nome: fileName,
      total_registros: String(rows.length),
      criado_em: new Date().toISOString(),
    });
    return { buffer, mime, fileName };
  }
}
