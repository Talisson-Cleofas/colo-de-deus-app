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
    cell: '', photo: '', role: 'MEMBER',
  },
  {
    id: 'qa-7', memberId: 'qa-7', uid: 'qa-7',
    name: 'Mariana Rodrigues com Nome Extenso para Teste Responsivo',
    email: 'mariana.rodrigues.email-extenso-homologacao@example.test',
    profile: 'MEMBER', active: true, gifts: [], ministry: 'Comunicação',
    cell: '', photo: '', role: 'MEMBER',
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
const cenacleMissions = [];
const qaMinistryMembers = [members[2], members[3], members[5], members[6], members[7]].map(
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
  server.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    req.user =
      members.find((m) => req.headers.cookie?.includes(`qa_profile=${m.id}`)) || members[0];
    next();
  });
  server.get('/test', (_req, res) =>
    res.send(
      '<h1>Homologação isolada — somente dados fictícios</h1><p>Os dados são temporários e compartilhados neste teste. Nenhuma mensagem sai deste ambiente.</p>' +
        members.map((m) => `<p><a href="/test/profile/${m.id}">${m.profile}</a></p>`).join(''),
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
      ministryIds: [],
      cellIds: req.user.profile === 'CELL_LEADER' ? ['qa-cell-leader'] : [],
    });
  });
  server.get('/api/communities', (_req, res) => res.json([]));
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
  const mapCenacleMission = (row, req) => ({
    ...row,
    participantNames: row.participantIds.map((id) => members.find((member) => member.id === id)?.name || id),
    canManage: ['DEVELOPER', 'MISSION_LEADER'].includes(req.user.profile),
    canGiveFeedback: row.participantIds.includes(req.user.id) && row.date <= new Date().toISOString().slice(0, 10),
    feedbackSubmitted: false,
    feedbackCount: 0,
  });
  server.get('/api/cenacle-missions/options', (req, res) => res.json({
    members: members.map((member) => ({ id: member.id, name: member.name })),
    ministries: [{ id: qaMissionsMinistry.id, name: qaMissionsMinistry.name }],
    canCreate: ['DEVELOPER', 'MISSION_LEADER'].includes(req.user.profile),
  }));
  server.get('/api/cenacle-missions', (req, res) =>
    res.json(cenacleMissions.map((row) => mapCenacleMission(row, req))),
  );
  server.post('/api/cenacle-missions', (req, res) => {
    const body = req.body || {};
    if (!body.title || !body.date || !body.time || !body.location || !Array.isArray(body.participantIds) || !body.participantIds.length)
      return res.status(400).json({ message: 'Preencha título, data, horário, local e participantes.' });
    const row = { id: `qa-mission-${Date.now()}`, title: body.title, description: body.description || '', date: body.date, time: body.time, location: body.location, ministryId: qaMissionsMinistry.id, participantIds: body.participantIds, status: body.status || 'AGENDADA' };
    cenacleMissions.push(row);
    res.status(201).json(mapCenacleMission(row, req));
  });
  server.patch('/api/cenacle-missions/:id', (req, res) => {
    const index = cenacleMissions.findIndex((row) => row.id === req.params.id);
    if (index < 0) return res.sendStatus(404);
    cenacleMissions[index] = { ...cenacleMissions[index], ...req.body, id: req.params.id, ministryId: qaMissionsMinistry.id };
    res.json(mapCenacleMission(cenacleMissions[index], req));
  });
  server.get('/api/cenacle-missions/:id/feedback', (_req, res) => res.json([]));
  server.post('/api/cenacle-missions/:id/feedback', (_req, res) =>
    res.json({ success: true, message: 'Feedback fictício registrado.' }),
  );
  server.get('/api/notifications/state', (_req, res) =>
    res.json({
      notifications: tabs['Notificações'],
      unreadCount: tabs['Notificações'].length,
      total: tabs['Notificações'].length,
    }),
  );
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
