const test = require('node:test');
const assert = require('node:assert/strict');
const { NotificationDateNormalizer } = require('../dist/notifications/notification-date-normalizer.service');
const { NotificationReadEngine } = require('../dist/notifications/notification-read-engine.service');
const { NotificationSheetValidator } = require('../dist/notifications/notification-sheet-validator.service');

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

function engineFor(notifications) {
  const sheets = {
    isDemo: () => false,
    read: async (tab) => (tab === 'Notificações' ? notifications : []),
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
