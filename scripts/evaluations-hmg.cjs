// Isolated QA entrypoint. Never imported by the production application.
// No Google/Firebase clients, external messages, payments, or durable data.
if (process.env.EVALUATIONS_QA !== 'true') throw new Error('QA entrypoint disabled');
require('reflect-metadata');
const { NestFactory, Reflector } = require('@nestjs/core');
const { Module, ValidationPipe } = require('@nestjs/common');
const express = require('express');
const path = require('node:path');
const { EvaluationsController } = require('../apps/api/dist/evaluations/evaluations.controller');
const { EvaluationsService } = require('../apps/api/dist/evaluations/evaluations.service');
const { RolesGuard } = require('../apps/api/dist/auth/guards/roles.guard');
const { DEFAULT_PROFILE_PERMISSIONS } = require('../apps/api/dist/rbac/permission.defaults');
const members = ['DEVELOPER', 'MISSION_LEADER', 'MINISTRY_LEADER', 'MEMBER', 'CELL_LEADER'].map(
  (profile, i) => ({
    id: `qa-${i}`,
    memberId: `qa-${i}`,
    uid: `qa-${i}`,
    name: `Teste ${profile}`,
    email: `qa-${i}@example.test`,
    profile,
    active: true,
    gifts: [],
    ministry: '',
    cell: '',
    photo: '',
    role: profile,
    vocationalYear: 'DISCIPULO',
  }),
);
members.push(
  {
    id: 'qa-5', memberId: 'qa-5', uid: 'qa-5',
    name: 'Brendo de Almeida dos Santos',
    email: 'brendo.almeida.teste@example.test',
    profile: 'MEMBER', active: true, gifts: [], ministry: 'Comunicação',
    cell: '', photo: '', role: 'MEMBER',
  },
  {
    id: 'qa-6', memberId: 'qa-6', uid: 'qa-6',
    name: 'Isabella Silva Valverde',
    email: 'isabella.valverde.teste@example.test',
    profile: 'MEMBER', active: true, gifts: [], ministry: 'Comunicação',
    cell: '', photo: '', role: 'MEMBER', vocationalYear: 'ANO_2',
  },
  {
    id: 'qa-7', memberId: 'qa-7', uid: 'qa-7',
    name: 'Mariana Rodrigues com Nome Extenso para Teste Responsivo',
    email: 'mariana.rodrigues.email-extenso-homologacao@example.test',
    profile: 'MEMBER', active: true, gifts: [], ministry: 'Comunicação',
    cell: '', photo: '', role: 'MEMBER', vocationalYear: 'ANO_1',
  },
);
const qaMinistry = {
  id: 'qa-ministry-communication',
  missionId: 'missao-brasilia',
  name: 'Comunicação',
  description: 'Ministério fictício para validação de layout e permissões em homologação.',
  leaderId: 'qa-2',
  leaderEmail: 'qa-2@example.test',
  leaderName: 'Teste MINISTRY_LEADER',
  viceLeaderEmail: '',
  viceLeaderName: '',
  color: '#d99a4e',
  icon: '',
  type: 'COMUNICACAO',
  notes: 'Registro temporário e sem dados reais.',
  active: true,
  membersCount: 5,
};
const qaMissionsMinistry = {
  ...qaMinistry,
  id: 'qa-ministry-missions',
  name: 'Ministério de Missões',
  description: 'Ministério fictício para criação e avaliação de missões em homologação.',
  type: 'MISSOES',
  membersCount: 4,
};
const cenacleMissions = [
  {
    id: 'qa-mission-presence',
    title: 'Missão com confirmação de presença',
    description: 'Validação do fluxo completo',
    date: '2026-09-08',
    time: '19:00',
    location: 'Local fictício',
    ministryId: qaMissionsMinistry.id,
    participantIds: ['qa-3'],
    status: 'CONCLUIDA',
    presences: { 'qa-3': 'CONFIRMADA' },
    feedbackOpen: true,
    authorizedYearTwoIds: [],
  },
];
const qaCommunities = [
  {
    id: 'qa-cell-leader',
    name: 'Célula Esperança — teste',
    type: 'CELL',
    description: 'Célula fictícia para validar visualização e permissões.',
    leader: members[4],
    coLeaders: [],
    participants: [members[3], members[5]],
    ministryId: 'qa-ministry-communication',
    ministryName: 'Comunicação',
    cellId: 'qa-cell-leader',
    cellName: 'Célula Esperança — teste',
    weekday: 'QUARTA',
    time: '20:00',
    recurrence: 'SEMANAL',
    modality: 'PRESENCIAL',
    status: 'UPCOMING',
    address: 'Endereço fictício',
    neighborhood: 'Bairro de teste',
    city: 'Brasília',
    state: 'DF',
    latitude: 0,
    longitude: 0,
    active: true,
    canEdit: false,
    canManageParticipants: false,
    canAddExternalParticipants: false,
  },
];
const qaMinistryMembers = [members[2], members[3], members[5]].map(
  (member) => ({
    memberId: member.id,
    name: member.name,
    email: member.email,
    profile: member.profile,
    function: member.id === 'qa-2' ? 'LIDER' : 'MEMBRO',
    photo: member.photo,
    active: true,
  }),
);
const tabs = {
  AvaliacoesCiclos: [],
  AvaliacoesRespostas: [],
  Notificações: [],
  Ministérios: [{ id: 'music', nome: 'Música de teste', lider_id: 'qa-2', ativo: 'TRUE' }],
  Participantes: [{ tipo: 'MINISTERIO', referencia_id: 'music', membro_id: 'qa-3', ativo: 'TRUE' }],
};
const sheets = {
  ensureTab: async () => {},
  listMembers: async () => members,
  read: async (tab) => tabs[tab] || [],
  parseActive: (v, d = false) => (v ? v === 'TRUE' : d),
  appendRecord: async (tab, row) => {
    if (tabs[tab].length >= 250) throw new Error('Limite de teste atingido');
    tabs[tab].push({ ...row });
  },
  updateRecord: async (tab, key, id, row) => {
    tabs[tab][tabs[tab].findIndex((r) => r[key] === id)] = { ...row };
  },
};
const notifications = {
  createSystem: async (dto) => {
    tabs['Notificações'].push({
      ...dto,
      id: `notice-${tabs['Notificações'].length}`,
      referencia_tipo: dto.referenceType,
      referencia_id: dto.referenceId,
      sentAt: new Date().toISOString(),
      senderName: 'Sistema QA',
      read: false,
      active: true,
    });
  },
};
class QaModule {}
Module({
  controllers: [EvaluationsController],
  providers: [
    { provide: EvaluationsService, useValue: new EvaluationsService(sheets, notifications) },
  ],
})(QaModule);
(async () => {
  const app = await NestFactory.create(QaModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalGuards(new RolesGuard(new Reflector()));
  const server = app.getHttpAdapter().getInstance();
  server.use(express.json());
  server.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    req.user =
      members.find((m) => req.headers.cookie?.includes(`qa_profile=${m.id}`)) || members[0];
    next();
  });
  server.get('/test', (_req, res) =>
    res.send(
      '<h1>Homologação isolada — somente dados fictícios</h1><p>Os dados são temporários e compartilhados neste teste. Nenhuma mensagem sai deste ambiente.</p>' +
        members.map((m) => `<p><a href="/test/profile/${m.id}">${m.profile} — ${m.name}</a></p>`).join(''),
    ),
  );
  server.get('/test/profile/:id', (req, res) => {
    const user = members.find((m) => m.id === req.params.id);
    if (!user) return res.sendStatus(404);
    res.cookie('qa_profile', user.id, { httpOnly: true, sameSite: 'lax' });
    res.send(
      `<script>localStorage.setItem('colo:user',${JSON.stringify(JSON.stringify(user))});location.replace('/avaliacoes');</script>`,
    );
  });
  server.get('/api/auth/me', (req, res) => res.json({ user: req.user }));
  server.post('/api/auth/google', (req, res) => res.json({ user: req.user }));
  server.get('/api/rbac/me', (req, res) => {
    const rows = DEFAULT_PROFILE_PERMISSIONS.filter(
      (row) => row.profileCode === req.user.profile && row.allowed,
    );
    res.json({
      profile: req.user.profile,
      permissions: rows.map((row) => row.permissionCode),
      scopes: Object.fromEntries(rows.map((row) => [row.permissionCode, row.scope])),
      ministryIds: req.user.profile === 'MINISTRY_LEADER' ? [qaMinistry.id, qaMissionsMinistry.id] : [],
      cellIds: req.user.profile === 'CELL_LEADER' ? ['qa-cell-leader'] : [],
    });
  });
  server.get('/api/communities', (req, res) =>
    res.json(qaCommunities.filter((item) => !req.query.type || item.type === req.query.type)),
  );
  server.post('/api/communities', (req, res) => {
    const body = req.body || {};
    if (!body.name || !body.type) return res.status(400).json({ message: 'Informe nome e tipo.' });
    const item = {
      id: `qa-community-${Date.now()}`,
      name: body.name,
      type: body.type,
      description: body.description || '',
      leader: members.find((member) => member.id === body.leaderId) || members[0],
      coLeaders: [],
      participants: [],
      ministryId: body.ministryId || '',
      ministryName: body.ministryId === qaMissionsMinistry.id ? qaMissionsMinistry.name : '',
      cellId: body.cellId || '',
      cellName: '',
      weekday: body.weekday || '',
      startDate: body.startDate || '',
      endDate: body.endDate || body.startDate || '',
      time: body.time || '',
      endTime: body.endTime || '',
      recurrence: 'NAO',
      modality: body.modality || '',
      status: 'UPCOMING',
      address: body.address || '',
      neighborhood: body.neighborhood || '',
      city: body.city || '',
      state: body.state || '',
      latitude: 0,
      longitude: 0,
      active: true,
      canEdit: true,
      canManageParticipants: true,
      canAddExternalParticipants: true,
    };
    qaCommunities.push(item);
    if (body.type === 'CENACLE') {
      const now = new Date().toISOString();
      tabs['Notificações'].push({
        id: `qa-notice-${Date.now()}`,
        titulo: `Novo cenáculo: ${body.name}`,
        mensagem: `${body.name} foi marcado para ${String(body.startDate || '').split('-').reverse().join('/')} às ${body.time || ''}.`,
        title: `Novo cenáculo: ${body.name}`,
        message: `${body.name} foi marcado para ${String(body.startDate || '').split('-').reverse().join('/')} às ${body.time || ''}.`,
        tipo: 'EVENTO',
        type: 'EVENTO',
        publico: 'TODOS',
        audience: 'TODOS',
        origem: 'Cenáculos',
        referencia_tipo: 'CENACULO',
        referencia_id: item.id,
        link: '/cenaculos',
        data_envio: now,
        sentAt: now,
        enviado_por: 'SYSTEM',
        enviado_por_nome: 'Sistema QA',
        senderName: 'Sistema QA',
        ativo: 'TRUE',
        active: true,
        read: false,
      });
    }
    res.status(201).json(item);
  });
  server.get('/api/members', (_req, res) => res.json({ members }));
  server.get('/api/missions', (_req, res) =>
    res.json([{ id: 'missao-brasilia', name: 'Missão Brasília', active: true }]),
  );
  server.get('/api/ministries', (_req, res) => res.json([qaMinistry, qaMissionsMinistry]));
  server.get('/api/ministries/:id', (req, res) =>
    [qaMinistry.id, qaMissionsMinistry.id].includes(req.params.id)
      ? res.json({ ministry: req.params.id === qaMinistry.id ? qaMinistry : qaMissionsMinistry, members: qaMinistryMembers, attendances: [] })
      : res.sendStatus(404),
  );
  server.post('/api/ministries/:id/members', (req, res) => {
    const member = members.find((item) => item.id === req.body?.memberId && item.active);
    if (!member) return res.status(404).json({ message: 'Membro ativo não encontrado.' });
    if (member.vocationalYear === 'ANO_1')
      return res.status(403).json({ message: 'Membros do Ano 1 não podem ser vinculados.' });
    if (!qaMinistryMembers.some((item) => item.memberId === member.id))
      qaMinistryMembers.push({
        memberId: member.id, name: member.name, email: member.email, profile: member.profile,
        function: req.body?.function || 'MEMBRO', photo: member.photo, active: true,
        autorizacao_ano_2_por: member.vocationalYear === 'ANO_2' ? req.user.id : '',
        autorizacao_ano_2_em: member.vocationalYear === 'ANO_2' ? new Date().toISOString() : '',
      });
    res.json(qaMinistryMembers);
  });
  const mapCenacleMission = (row, req) => {
    const presenceStatus = row.presences?.[req.user.id] || 'PENDENTE';
    const authorizedYearTwoIds = row.authorizedYearTwoIds || [];
    const normallyEligible = !['ANO_1', 'ANO_2'].includes(req.user.vocationalYear || '');
    const yearTwoAuthorized = authorizedYearTwoIds.includes(req.user.id);
    return {
      ...row,
      participantNames: row.participantIds.map((id) => members.find((member) => member.id === id)?.name || id),
      participants: row.participantIds.map((id) => ({
        id,
        name: members.find((member) => member.id === id)?.name || id,
        presenceStatus: row.presences?.[id] || 'PENDENTE',
      })),
      presenceStatus,
      authorizedYearTwoIds,
      authorizedYearTwoNames: authorizedYearTwoIds.map((id) => members.find((member) => member.id === id)?.name || id),
      canConfirmPresence: Boolean(req.user.active && (normallyEligible || yearTwoAuthorized)),
      participationBlockedReason: req.user.active && !normallyEligible && !yearTwoAuthorized ? 'A participação é liberada a partir do Discipulado, salvo autorização da liderança para o Ano 2.' : '',
      confirmedCount: Object.values(row.presences || {}).filter((status) => status === 'CONFIRMADA').length,
      feedbackOpen: Boolean(row.feedbackOpen),
      canManage: ['DEVELOPER', 'MISSION_LEADER', 'MINISTRY_LEADER'].includes(req.user.profile),
      canManageFeedback: ['DEVELOPER', 'MINISTRY_LEADER'].includes(req.user.profile),
      canGiveFeedback: row.participantIds.includes(req.user.id) && presenceStatus === 'CONFIRMADA' && Boolean(row.feedbackOpen) && row.date <= new Date().toISOString().slice(0, 10),
      feedbackSubmitted: false,
      feedbackCount: 0,
    };
  };
  server.get('/api/cenacle-missions/options', (req, res) => res.json({
    members: members.filter((member) => !['ANO_1', 'ANO_2'].includes(member.vocationalYear || '')).map((member) => ({ id: member.id, name: member.name })),
    yearTwoMembers: members.filter((member) => member.vocationalYear === 'ANO_2').map((member) => ({ id: member.id, name: member.name })),
    ministries: [{ id: qaMissionsMinistry.id, name: qaMissionsMinistry.name }],
    canCreate: ['DEVELOPER', 'MISSION_LEADER', 'MINISTRY_LEADER'].includes(req.user.profile),
  }));
  server.get('/api/cenacle-missions', (req, res) =>
    res.json(cenacleMissions.map((row) => mapCenacleMission(row, req))),
  );
  server.post('/api/cenacle-missions', (req, res) => {
    const body = req.body || {};
    if (!body.title || !body.date || !body.time || !body.location)
      return res.status(400).json({ message: 'Preencha título, data, horário e local.' });
    const row = { id: `qa-mission-${Date.now()}`, title: body.title, description: body.description || '', date: body.date, time: body.time, location: body.location, ministryId: qaMissionsMinistry.id, participantIds: [], authorizedYearTwoIds: [], status: body.status || 'AGENDADA', presences: {}, feedbackOpen: false };
    cenacleMissions.push(row);
    const now = new Date().toISOString();
    tabs['Notificações'].push({
      id: `qa-mission-notice-${Date.now()}`, titulo: `Nova missão: ${body.title}`,
      mensagem: `${body.title} foi marcada. Confirme se você participará.`,
      title: `Nova missão: ${body.title}`, message: `${body.title} foi marcada. Confirme se você participará.`,
      tipo: 'EVENTO', type: 'EVENTO', publico: 'INDIVIDUAL', audience: 'INDIVIDUAL',
      destinatarios: members.filter((member) => !['ANO_1', 'ANO_2'].includes(member.vocationalYear || '')).map((member) => member.id).join(','),
      referencia_tipo: 'MISSAO_CENACULO', referencia_id: row.id, link: '/cenaculos?tab=missoes',
      data_envio: now, sentAt: now, enviado_por: 'SYSTEM', enviado_por_nome: 'Sistema QA',
      senderName: 'Sistema QA', ativo: 'TRUE', active: true, read: false,
    });
    res.status(201).json(mapCenacleMission(row, req));
  });
  server.patch('/api/cenacle-missions/:id', (req, res) => {
    const index = cenacleMissions.findIndex((row) => row.id === req.params.id);
    if (index < 0) return res.sendStatus(404);
    cenacleMissions[index] = { ...cenacleMissions[index], ...req.body, id: req.params.id, ministryId: qaMissionsMinistry.id };
    res.json(mapCenacleMission(cenacleMissions[index], req));
  });
  server.post('/api/cenacle-missions/:id/presence', (req, res) => {
    const row = cenacleMissions.find((item) => item.id === req.params.id);
    if (!row) return res.sendStatus(404);
    if (!req.user.active)
      return res.status(403).json({ message: 'Somente membros ativos podem confirmar participação.' });
    const normallyEligible = !['ANO_1', 'ANO_2'].includes(req.user.vocationalYear || '');
    if (!normallyEligible && !(row.authorizedYearTwoIds || []).includes(req.user.id))
      return res.status(403).json({ message: 'Participação disponível a partir do Discipulado ou mediante autorização para o Ano 2.' });
    row.presences ||= {};
    row.presences[req.user.id] = req.body?.confirmed ? 'CONFIRMADA' : 'RECUSADA';
    if (req.body?.confirmed && !row.participantIds.includes(req.user.id)) row.participantIds.push(req.user.id);
    if (!req.body?.confirmed) row.participantIds = row.participantIds.filter((id) => id !== req.user.id);
    res.json({ success: true, status: row.presences[req.user.id] });
  });
  server.post('/api/cenacle-missions/:id/authorize-year-two', (req, res) => {
    const row = cenacleMissions.find((item) => item.id === req.params.id);
    if (!row) return res.sendStatus(404);
    if (!['DEVELOPER', 'MISSION_LEADER', 'MINISTRY_LEADER'].includes(req.user.profile))
      return res.status(403).json({ message: 'Sem permissão para autorizar.' });
    const member = members.find((item) => item.id === req.body?.memberId && item.vocationalYear === 'ANO_2');
    if (!member) return res.status(400).json({ message: 'Selecione um membro do Ano 2.' });
    row.authorizedYearTwoIds ||= [];
    if (!row.authorizedYearTwoIds.includes(member.id)) row.authorizedYearTwoIds.push(member.id);
    tabs['Notificações'].push({
      id: `qa-year-two-${Date.now()}`, title: `Autorização para missão: ${row.title}`,
      message: 'Sua participação foi autorizada. Confirme sua presença.', type: 'EVENTO',
      publico: 'INDIVIDUAL', audience: 'INDIVIDUAL', destinatarios: member.id,
      referencia_tipo: 'MISSAO_CENACULO', referencia_id: row.id, link: '/cenaculos?tab=missoes',
      sentAt: new Date().toISOString(), senderName: 'Sistema QA', active: true, read: false,
    });
    res.json({ success: true, message: `${member.name} foi autorizado e recebeu a notificação.` });
  });
  server.post('/api/cenacle-missions/:id/feedback/open', (req, res) => {
    const row = cenacleMissions.find((item) => item.id === req.params.id);
    if (!row) return res.sendStatus(404);
    if (!['DEVELOPER', 'MINISTRY_LEADER'].includes(req.user.profile))
      return res.status(403).json({ message: 'Acesso restrito ao líder do Ministério de Missões.' });
    if (row.date > new Date().toISOString().slice(0, 10))
      return res.status(400).json({ message: 'O feedback só pode ser liberado ao final da missão.' });
    const confirmedIds = row.participantIds.filter((id) => row.presences?.[id] === 'CONFIRMADA');
    if (!confirmedIds.length)
      return res.status(400).json({ message: 'Nenhum participante confirmou presença nesta missão.' });
    row.feedbackOpen = true;
    const now = new Date().toISOString();
    tabs['Notificações'].push({
      id: `qa-feedback-notice-${Date.now()}`,
      titulo: `Feedback disponível: ${row.title}`,
      mensagem: `Você confirmou presença em ${row.title}. Conte como foi sua experiência.`,
      title: `Feedback disponível: ${row.title}`,
      message: `Você confirmou presença em ${row.title}. Conte como foi sua experiência.`,
      tipo: 'SISTEMA', type: 'SISTEMA', publico: 'INDIVIDUAL', audience: 'INDIVIDUAL',
      destinatarios: confirmedIds.join(','), destinatario_id: confirmedIds.join(','),
      referencia_tipo: 'MISSAO_CENACULO', referencia_id: row.id, link: '/cenaculos',
      data_envio: now, sentAt: now, enviado_por: 'SYSTEM', enviado_por_nome: 'Sistema QA',
      senderName: 'Sistema QA', ativo: 'TRUE', active: true, read: false,
    });
    res.json({ success: true, notified: confirmedIds.length });
  });
  server.get('/api/cenacle-missions/:id/feedback', (_req, res) => res.json([]));
  server.post('/api/cenacle-missions/:id/feedback', (req, res) => {
    const row = cenacleMissions.find((item) => item.id === req.params.id);
    if (!row) return res.sendStatus(404);
    if (!row.feedbackOpen || row.presences?.[req.user.id] !== 'CONFIRMADA')
      return res.status(403).json({ message: 'Feedback disponível somente para presença confirmada após liberação.' });
    res.json({ success: true, message: 'Feedback fictício registrado.' });
  });
  server.get('/api/notifications/state', (req, res) => {
    const visible = tabs['Notificações'].filter((notice) =>
      (notice.publico || notice.audience || 'TODOS') !== 'INDIVIDUAL' ||
      String(notice.destinatarios || notice.destinatario_id || '').split(',').includes(req.user.id),
    );
    res.json({
      notifications: visible,
      unreadCount: visible.length,
      total: visible.length,
    });
  });
  server.get('/api/notifications/options', (_req, res) =>
    res.json({ members: [], ministries: [], cells: [], cenacles: [], profiles: [] }),
  );
  server.get('/api/notifications/preferences', (_req, res) => res.json({ app: true }));
  server.get('/api/reports/options', (_req, res) =>
    res.json({ members: [], ministries: [], cells: [], cenacles: [] }),
  );
  server.get('/api/reports/history', (_req, res) => res.json([]));
  server.get('/api/reports/advanced', (_req, res) =>
    res.json({
      indicators: {},
      comparison: { rateDifference: 0 },
      monthly: [],
      birthdays: [],
      ranking: [],
      lowFrequency: [],
      members: [],
      pagination: { page: 1, totalPages: 1 },
    }),
  );
  server.get('/api/health', (_req, res) =>
    res.json({
      status: 'ok',
      environment: 'isolated-evaluations-qa',
      storage: 'memory',
      externalNotifications: false,
    }),
  );
  server.use(express.static(path.join(__dirname, '../apps/web/dist'), { index: false }));
  server.use((req, res, next) =>
    req.method === 'GET' && !req.path.startsWith('/api/')
      ? res.sendFile(path.join(__dirname, '../apps/web/dist/index.html'))
      : next(),
  );
  await app.init();
  await app.listen(Number(process.env.PORT || 4180), '0.0.0.0');
})();
