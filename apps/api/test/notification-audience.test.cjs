const test = require('node:test');
const assert = require('node:assert/strict');
const { NotificationDateNormalizer } = require('../dist/notifications/notification-date-normalizer.service');
const { NotificationReadEngine } = require('../dist/notifications/notification-read-engine.service');
const { NotificationSheetValidator } = require('../dist/notifications/notification-sheet-validator.service');
const { NotificationsService } = require('../dist/notifications/notifications.service');

const preferences = {
  events: true,
  confirmations: true,
  justifications: true,
  memberships: true,
  leadership: true,
  birthdays: true,
  birthdayAdvance: true,
  app: true,
  push: false,
  sendTime: '08:00',
  firebaseToken: '',
};

const user = (profile, memberId) => ({
  uid: memberId,
  id: memberId,
  memberId,
  profile,
  ministry: 'MINISTERIO-A',
  cell: 'CELULA-A',
});

const notice = (overrides) => ({
  id: 'notice-1',
  titulo: 'Pagamento aprovado',
  mensagem: 'Contribuição confirmada.',
  tipo: 'SOMA',
  publico: 'INDIVIDUAL',
  destinatarios: 'member-owner',
  destinatario_id: 'member-owner',
  data_envio: '2026-08-20T12:00:00.000Z',
  ativo: 'TRUE',
  ...overrides,
});

function engineFor(notifications, context = {}) {
  const sheets = {
    isDemo: () => false,
    read: async (tab) => {
      if (tab === 'Notificações') return notifications;
      if (tab === 'Cenáculos') return context.cenacles || [];
      if (tab === 'Participantes') return context.participants || [];
      return [];
    },
  };
  const dates = new NotificationDateNormalizer();
  const validator = new NotificationSheetValidator(dates);
  return new NotificationReadEngine(sheets, dates, validator);
}

test('notificação individual do Soma+ aparece somente para o destinatário', async () => {
  const engine = engineFor([notice()]);

  for (const profile of ['DEVELOPER', 'ADMIN', 'MISSION_LEADER', 'MEMBER']) {
    const state = await engine.state(user(profile, 'member-other'), preferences);
    assert.equal(state.total, 0, `${profile} não deve receber aviso individual de outro membro`);
    assert.equal(state.unreadCount, 0);
  }

  const ownerState = await engine.state(user('MEMBER', 'member-owner'), preferences);
  assert.equal(ownerState.total, 1);
  assert.equal(ownerState.unreadCount, 1);
});

test('notificações públicas continuam disponíveis para todos os perfis', async () => {
  const engine = engineFor([notice({ publico: 'TODOS', destinatarios: '', destinatario_id: '' })]);

  for (const profile of ['DEVELOPER', 'MISSION_LEADER', 'MEMBER']) {
    const state = await engine.state(user(profile, `member-${profile}`), preferences);
    assert.equal(state.total, 1);
  }
});

const cenacleNotice = (audienceId = 'cenacle-a') =>
  notice({ publico: 'CENACULO', publico_id: audienceId, destinatarios: '', destinatario_id: '' });

const cenacleContext = {
  cenacles: [
    { id: 'cenacle-a', responsavel_id: 'leader-a', vice_responsavel_id: 'vice-a', ativo: 'TRUE' },
    { id: 'cenacle-b', responsavel_id: 'leader-b', vice_responsavel_id: '', ativo: 'TRUE' },
  ],
  participants: [
    { id: 'pa', membro_id: 'member-a', tipo: 'CENACULO', referencia_id: 'cenacle-a', ativo: 'TRUE' },
    { id: 'pb', membro_id: 'member-b', tipo: 'CENACULO', referencia_id: 'cenacle-b', ativo: 'TRUE' },
  ],
};

test('restringe audiência de cenáculo aos participantes e lideranças explícitas', async () => {
  const engine = engineFor([cenacleNotice()], cenacleContext);
  assert.equal((await engine.state(user('MEMBER', 'member-a'), preferences)).total, 1);
  assert.equal((await engine.state(user('MEMBER', 'member-b'), preferences)).total, 0);
  assert.equal((await engine.state(user('MEMBER', 'member-without-cenacle'), preferences)).total, 0);
  assert.equal((await engine.state(user('CELL_LEADER', 'leader-a'), preferences)).total, 1);
  assert.equal((await engine.state(user('ADMIN', 'admin-outside'), preferences)).total, 0);
});

test('ignora cenaculoId adulterado e exige vínculo real com o destino persistido', async () => {
  const engine = engineFor([cenacleNotice('cenacle-a')], cenacleContext);
  const attacker = { ...user('MEMBER', 'member-b'), cenacleId: 'cenacle-a' };
  assert.equal((await engine.state(attacker, preferences)).total, 0);
});

test('marcar como lida exige acesso à notificação e bloqueia BOLA por ID', async () => {
  const tabs = {
    Notificações: [cenacleNotice('cenacle-a')],
    NotificacoesLeituras: [],
    Cenáculos: cenacleContext.cenacles,
    Participantes: cenacleContext.participants,
  };
  const repository = {
    isDemo: () => false,
    read: async (tab) => tabs[tab] || [],
    appendRecord: async (tab, record) => tabs[tab].push(record),
    updateRecord: async () => {},
  };
  const dates = new NotificationDateNormalizer();
  const validator = new NotificationSheetValidator(dates);
  const readEngine = new NotificationReadEngine(repository, dates, validator);
  const service = new NotificationsService(
    repository,
    { get: async () => ({}) },
    dates,
    readEngine,
  );

  await assert.rejects(
    () => service.markRead('notice-1', user('MEMBER', 'member-b'), true),
    /não encontrada/i,
  );
  assert.equal(tabs.NotificacoesLeituras.length, 0);

  await service.markRead('notice-1', user('MEMBER', 'member-a'), true);
  assert.equal(tabs.NotificacoesLeituras.length, 1);
  assert.equal(tabs.NotificacoesLeituras[0].membro_id, 'member-a');
});

test('criação CENACULO valida o destino persistido e o escopo do remetente', async () => {
  const tabs = {
    Cenáculos: cenacleContext.cenacles,
    Notificações: [],
    NotificacoesEntregas: [],
  };
  const repository = {
    isDemo: () => false,
    read: async (tab) => tabs[tab] || [],
    appendRecord: async (tab, record) => tabs[tab].push(record),
  };
  const service = new NotificationsService(
    repository,
    { get: async () => ({}) },
    new NotificationDateNormalizer(),
    { state: async () => ({ notifications: [], unreadCount: 0 }) },
  );
  const payload = {
    title: 'Aviso do Cenáculo A', message: 'Mensagem restrita.', type: 'INFO',
    audience: 'CENACULO', audienceId: 'cenacle-a',
  };

  await service.create(payload, user('CELL_LEADER', 'leader-a'));
  assert.equal(tabs.Notificações.length, 1);
  assert.equal(tabs.Notificações[0].publico_id, 'cenacle-a');

  await assert.rejects(
    () => service.create({ ...payload, audienceId: 'cenacle-b' }, user('CELL_LEADER', 'leader-a')),
    (error) => error?.status === 403,
  );
  await assert.rejects(
    () => service.create({ ...payload, audienceId: 'cenacle-invented' }, user('CELL_LEADER', 'leader-a')),
    /inválido/i,
  );
  assert.equal(tabs.Notificações.length, 1);
});
