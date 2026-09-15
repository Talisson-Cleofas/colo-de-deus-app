const assert = require('node:assert/strict');
const test = require('node:test');
const { MinistryScopeService } = require('../dist/rbac/ministry-scope.service');
const { MinistryScopeGuard } = require('../dist/rbac/guards/ministry-scope.guard');

const ministries = [
  {
    id: 'agenda-ministry',
    nome: 'Agenda Missionária',
    codigo: 'AGENDA_MISSIONARIA',
    lider_id: 'agenda-leader',
    ativo: 'TRUE',
  },
  {
    id: 'events-ministry',
    nome: 'Eventos',
    codigo: 'EVENTOS',
    lider_id: 'events-leader',
    ativo: 'TRUE',
  },
  {
    id: 'requested-ministry',
    nome: 'Música',
    codigo: 'MUSICA',
    lider_id: 'music-leader',
    ativo: 'TRUE',
  },
];

const sheets = {
  read: async (tab) => (tab === 'Ministérios' ? ministries : []),
  parseActive: (value, fallback = false) =>
    value === '' ? fallback : String(value).toUpperCase() === 'TRUE',
};

function context(user, ministryId = 'requested-ministry', options = {}) {
  return {
    getClass: () => ({ name: options.controller || 'MissionaryAgendaController' }),
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        params: {},
        query: {},
        body: { ministryId },
        originalUrl: options.originalUrl || '/api/missionary-agenda',
        baseUrl: '',
        route: { path: '/' },
      }),
    }),
  };
}

test('agenda missionária não trata o ministério solicitado como escopo do criador', async () => {
  const scope = new MinistryScopeService(sheets);
  const guard = new MinistryScopeGuard(scope, { isCellsMinistryLeader: async () => false });
  const agendaLeader = {
    id: 'agenda-leader',
    memberId: 'agenda-leader',
    profile: 'MINISTRY_LEADER',
    ministry: 'Agenda Missionária',
  };

  assert.equal(await guard.canActivate(context(agendaLeader)), true);
});

test('outros módulos continuam restritos ao próprio ministério', async () => {
  const scope = new MinistryScopeService(sheets);
  const guard = new MinistryScopeGuard(scope, { isCellsMinistryLeader: async () => false });
  const eventsLeader = {
    id: 'events-leader',
    memberId: 'events-leader',
    profile: 'MINISTRY_LEADER',
    ministry: 'Eventos',
  };

  await assert.rejects(
    () => guard.canActivate(context(eventsLeader, 'requested-ministry', {
      controller: 'EventsController',
      originalUrl: '/api/events',
    })),
    /Acesso restrito ao seu ministério/i,
  );
  assert.equal(await guard.canActivate(context(eventsLeader, 'events-ministry', {
    controller: 'EventsController',
    originalUrl: '/api/events',
  })), true);
});
