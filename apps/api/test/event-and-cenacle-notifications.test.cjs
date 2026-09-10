const test = require('node:test');
const assert = require('node:assert/strict');
const { NotificationsService } = require('../dist/notifications/notifications.service.js');
const { CommunitiesService } = require('../dist/communities/communities.service.js');

const dateKey = (offsetDays = 0) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

test('gera lembrete de evento na antecedência configurada sem duplicar', async () => {
  const notifications = [];
  const repository = {
    isDemo: () => false,
    read: async (tab) => {
      if (tab === 'Membros') return [];
      if (tab === 'Notificações') return notifications;
      if (tab === 'Eventos')
        return [{ id: 'event-1', titulo: 'Formação', inicio: `${dateKey(1)}T19:30:00`, local: 'Casa de missão', publicado: 'TRUE', ativo: 'TRUE' }];
      return [];
    },
    appendRecord: async (tab, row) => {
      if (tab === 'Notificações') notifications.push(row);
    },
  };
  const service = new NotificationsService(
    repository,
    { get: async () => ({ birthdaysEnabled: false, birthdayNotificationsEnabled: false, birthdayReminderDays: 3, eventReminderDays: 1 }) },
    {},
    {},
  );

  const first = await service.processAutomations();
  const second = await service.processAutomations();

  assert.equal(first.processed, 1);
  assert.equal(second.processed, 0);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].tipo, 'EVENTO');
  assert.equal(notifications[0].publico, 'TODOS');
  assert.match(notifications[0].titulo, /Lembrete: Formação/);
});

test('notifica todos os membros quando um cenáculo é criado', async () => {
  const rows = { 'Cenáculos': [], Participantes: [], Ministérios: [], Células: [] };
  const sent = [];
  const repository = {
    isDemo: () => false,
    parseActive: (value, fallback = false) => value ? value === 'TRUE' : fallback,
    listMembers: async () => [{ id: 'leader-1', name: 'Líder', active: true }],
    read: async (tab) => rows[tab] || [],
    appendRecord: async (tab, row) => { (rows[tab] ||= []).push(row); },
  };
  const service = new CommunitiesService(
    repository,
    { reconcileStructure: async () => {} },
    { geocode: async () => { throw new Error('sem geocodificação'); } },
    { ensureReferenceFolder: async () => ({ id: '' }) },
    { isCellsMinistryLeader: async () => false, cellIds: async () => new Set() },
    { createSystem: async (dto) => sent.push(dto) },
  );

  await service.create({
    type: 'CENACLE', name: 'Cenáculo Esperança', description: '', leaderId: 'leader-1',
    viceLeaderId: '', leaderName: '', leaderContact: '', viceLeaderName: '', viceLeaderContact: '',
    ministryId: '', cellId: '', address: '', neighborhood: '', city: '', state: '', latitude: 0,
    longitude: 0, weekday: '', modality: '', startDate: dateKey(2), endDate: dateKey(2),
    time: '19:00', endTime: '21:00',
  }, { id: 'developer', memberId: 'developer', profile: 'DEVELOPER' });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].audience, 'TODOS');
  assert.equal(sent[0].type, 'EVENTO');
  assert.equal(sent[0].referenceType, 'CENACULO');
  assert.match(sent[0].title, /Cenáculo Esperança/);
});
