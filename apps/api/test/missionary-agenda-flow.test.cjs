const assert = require('node:assert/strict');
const test = require('node:test');
const { MissionaryAgendaService } = require('../dist/missionary-agenda/missionary-agenda.service');

const users = {
  agenda: {
    id: 'agenda-leader',
    memberId: 'agenda-leader',
    uid: 'agenda-leader',
    name: 'Líder da Agenda',
    email: 'agenda@test.dev',
    profile: 'CELL_LEADER',
    ministry: 'Missões',
  },
  mission: {
    id: 'mission-leader',
    memberId: 'mission-leader',
    uid: 'mission-leader',
    name: 'Líder de Missão',
    email: 'mission@test.dev',
    profile: 'MISSION_LEADER',
    ministry: '',
  },
  ministry: {
    id: 'ministry-leader',
    memberId: 'ministry-leader',
    uid: 'ministry-leader',
    name: 'Líder de Ministério',
    email: 'ministry@test.dev',
    profile: 'MINISTRY_LEADER',
    ministry: 'Missões',
  },
  member: {
    id: 'member-1',
    memberId: 'member-1',
    uid: 'member-1',
    name: 'Membro Enviado',
    email: 'member@test.dev',
    profile: 'MEMBER',
    ministry: 'Missões',
  },
  outsider: {
    id: 'member-outsider', memberId: 'member-outsider', uid: 'member-outsider',
    name: 'Membro não enviado', email: 'outsider@test.dev', profile: 'MEMBER', ministry: 'Missões',
  },
};

function fixture() {
  const tabs = {
    AgendaMissionaria: [],
    AgendaMissionariaParticipantes: [],
    AgendaMissionariaHistorico: [],
  };
  const members = Object.values(users).map((user) => ({
    id: user.id,
    name: user.name,
    profile: user.profile,
    ministry: user.ministry,
    active: true,
  }));
  const ministries = [
    {
      id: 'ministry-1',
      nome: 'Missões',
      lider_id: users.ministry.id,
      vice_lider_id: '',
      ativo: 'TRUE',
    },
  ];
  const notifications = [];
  const audits = [];
  const repository = {
    isDemo: () => false,
    parseActive: (value, fallback = false) =>
      value === '' ? fallback : ['TRUE', '1', 'SIM'].includes(String(value).toUpperCase()),
    read: async (tab) => (tab === 'Ministérios' ? ministries : tabs[tab] || []),
    listMembers: async () => members,
    findMemberById: async (id) => members.find((member) => member.id === id) || null,
    appendRecord: async (tab, record) => {
      tabs[tab].push(
        Object.fromEntries(Object.entries(record).map(([key, value]) => [key, String(value)])),
      );
    },
    updateRecord: async (tab, _header, id, record) => {
      const index = tabs[tab].findIndex((row) => row.id === id);
      tabs[tab][index] = Object.fromEntries(
        Object.entries(record).map(([key, value]) => [key, String(value)]),
      );
    },
  };
  return {
    tabs,
    notifications,
    service: new MissionaryAgendaService(
      repository,
      { createSystem: async (notification) => notifications.push(notification) },
      { record: async (record) => audits.push(record) },
    ),
    audits,
  };
}

const input = (title = 'Evangelização na praça') => ({
  title,
  description: 'Ação missionária aberta',
  type: 'EVANGELIZACAO',
  status: 'RASCUNHO',
  startDate: '2026-09-05',
  endDate: '2026-09-05',
  startTime: '16:00',
  endTime: '19:00',
  location: 'Praça Central',
  address: 'Centro',
  neighborhood: 'Centro',
  city: 'Brasília',
  state: 'DF',
  zipCode: '70000-000',
  responsibleId: users.agenda.id,
  ministryId: 'ministry-1',
  participantLimit: 40,
  meetingPoint: 'Entrada principal',
  transport: '',
  notes: '',
});

test('executa aprovação: líder da agenda → líder de missão → líder de ministério → membro', async () => {
  const { service, tabs, notifications } = fixture();
  const created = await service.create(input(), users.agenda);
  assert.equal(created.status, 'RASCUNHO');
  assert.equal(created.canSubmit, true);

  const submitted = await service.submit(created.id, users.agenda);
  assert.equal(submitted.status, 'AGUARDANDO_APROVACAO');
  assert.equal((await service.findOne(created.id, users.mission)).canReview, true);

  const approved = await service.approve(
    created.id,
    { notes: 'Aprovada para envio.' },
    users.mission,
  );
  assert.equal(approved.status, 'AGUARDANDO_INDICACOES');
  const ministryView = await service.findOne(created.id, users.ministry);
  assert.equal(ministryView.canEdit, true);
  assert.equal(ministryView.canSelectMembers, true);

  const sent = await service.sendToMembers(
    created.id,
    { memberIds: [users.member.id] },
    users.ministry,
  );
  assert.equal(sent.status, 'ENVIADA_AOS_MEMBROS');
  assert.deepEqual(sent.participantIds, [users.member.id]);
  assert.equal((await service.list({}, users.member)).length, 1);
  assert.equal(tabs.AgendaMissionariaHistorico.length, 4);
  assert.equal(notifications.length, 3);
});

test('permite criar e enviar a agenda sem missionário previamente indicado', async () => {
  const { service } = fixture();
  const created = await service.create({ ...input(), responsibleId: '' }, users.agenda);

  assert.equal(created.responsibleId, '');
  assert.equal(created.canSubmit, true);

  const submitted = await service.submit(created.id, users.agenda);
  assert.equal(submitted.status, 'AGUARDANDO_APROVACAO');
});

test('salva acompanhantes e intercessores em funções separadas', async () => {
  const { service, tabs } = fixture();
  const created = await service.create(
    {
      ...input('Missão com equipe ampliada'),
      accompanyingIds: [users.ministry.id],
      intercessorIds: [users.member.id],
    },
    users.agenda,
  );

  assert.deepEqual(created.accompanyingIds, [users.ministry.id]);
  assert.deepEqual(created.intercessorIds, [users.member.id]);
  assert.equal(
    tabs.AgendaMissionariaParticipantes.find((row) => row.membro_id === users.ministry.id).funcao,
    'ACOMPANHANTE',
  );
  assert.equal(
    tabs.AgendaMissionariaParticipantes.find((row) => row.membro_id === users.member.id).funcao,
    'INTERCESSOR',
  );
});

test('impede que a mesma pessoa ocupe as duas funções da equipe', async () => {
  const { service } = fixture();
  await assert.rejects(
    () =>
      service.create(
        {
          ...input('Missão com função duplicada'),
          accompanyingIds: [users.member.id],
          intercessorIds: [users.member.id],
        },
        users.agenda,
      ),
    /não pode ser acompanhante e intercessora/i,
  );
});

test('executa não aprovação e devolve ao líder da agenda para editar e reenviar', async () => {
  const { service } = fixture();
  const created = await service.create(input('Visita missionária'), users.agenda);
  await service.submit(created.id, users.agenda);
  const rejected = await service.reject(
    created.id,
    { reason: 'Revisar o local e o horário.' },
    users.mission,
  );
  assert.equal(rejected.status, 'NAO_APROVADA');
  assert.equal(rejected.rejectionReason, 'Revisar o local e o horário.');
  assert.equal((await service.findOne(created.id, users.agenda)).canEdit, true);
  const edited = await service.update(created.id, { location: 'Novo local' }, users.agenda);
  assert.equal(edited.location, 'Novo local');
  assert.equal((await service.submit(created.id, users.agenda)).status, 'AGUARDANDO_APROVACAO');
});

test('bloqueia transições por perfil e seleção fora do ministério', async () => {
  const { service } = fixture();
  const created = await service.create(input(), users.agenda);
  await assert.rejects(
    () => service.approve(created.id, {}, users.ministry),
    /não encontrada|Somente o líder de missão/i,
  );
  await service.submit(created.id, users.agenda);
  await service.approve(created.id, {}, users.mission);
  const outsider = { ...users.member, id: 'outsider', memberId: 'outsider', ministry: 'Eventos' };
  await assert.rejects(
    () => service.sendToMembers(created.id, { memberIds: [outsider.id] }, users.ministry),
    /inexistente|ministério/i,
  );
});

test('rejeita término anterior ao início', async () => {
  const { service } = fixture();
  await assert.rejects(
    () => service.create({ ...input(), endDate: '2026-09-04' }, users.agenda),
    /término não pode ser anterior/i,
  );
});

async function sentMission(service, title = 'Missão pronta para conclusão') {
  const created = await service.create(input(title), users.agenda);
  await service.submit(created.id, users.agenda);
  await service.approve(created.id, {}, users.mission);
  return service.sendToMembers(created.id, { memberIds: [users.member.id] }, users.ministry);
}

test('missionário efetivamente enviado conclui e grava efeitos append-only uma única vez', async () => {
  const { service, tabs, audits, notifications } = fixture();
  const sent = await sentMission(service);
  const historyBefore = tabs.AgendaMissionariaHistorico.length;
  const notificationsBefore = notifications.length;

  const completed = await service.complete(sent.id, users.member, 'request-complete-1');
  assert.equal(completed.status, 'CONCLUIDA');
  assert.equal(completed.completedBy, users.member.id);
  assert.equal(completed.completionRole, 'MISSIONARIO_ENVIADO');
  assert.match(completed.completedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(completed.canComplete, false);
  assert.equal(tabs.AgendaMissionariaHistorico.length, historyBefore + 1);
  assert.equal(tabs.AgendaMissionariaHistorico.at(-1).acao, 'CONCLUIDA');
  assert.equal(audits.length, 1);
  assert.equal(audits[0].newData.correlationId, 'request-complete-1');
  assert.equal(audits[0].newData.previousStatus, 'ENVIADA_AOS_MEMBROS');
  assert.equal(notifications.length, notificationsBefore + 1);
  assert.equal(notifications.at(-1).audience, 'INDIVIDUAL');

  const again = await service.complete(sent.id, users.member, 'request-complete-2');
  assert.equal(again.status, 'CONCLUIDA');
  assert.equal(tabs.AgendaMissionariaHistorico.length, historyBefore + 1);
  assert.equal(audits.length, 1);
  assert.equal(notifications.length, notificationsBefore + 1);
});

test('membro não enviado e tentativa BOLA por ID recebem 403', async () => {
  const { service } = fixture();
  const sent = await sentMission(service, 'Missão protegida por objeto');
  await assert.rejects(
    () => service.complete(sent.id, users.outsider, 'request-bola'),
    (error) => error?.status === 403,
  );
});

test('missão em estado inválido não pode pular etapas para CONCLUIDA', async () => {
  const { service } = fixture();
  const draft = await service.create(input('Rascunho não concluível'), users.agenda);
  await assert.rejects(
    () => service.complete(draft.id, users.agenda, 'request-invalid-state'),
    /Somente uma missão enviada aos membros/i,
  );
});

test('lideranças autorizadas da agenda e da missão podem concluir', async () => {
  for (const leader of [users.agenda, users.mission]) {
    const { service } = fixture();
    const sent = await sentMission(service, `Missão concluída por ${leader.profile}`);
    const completed = await service.complete(sent.id, leader, `request-${leader.id}`);
    assert.equal(completed.status, 'CONCLUIDA');
    assert.equal(completed.completedBy, leader.id);
  }
});

test('requisições concorrentes revalidam autorização e não duplicam efeitos', async () => {
  const { service, tabs, audits, notifications } = fixture();
  const sent = await sentMission(service, 'Missão com conclusão concorrente');
  const historyBefore = tabs.AgendaMissionariaHistorico.length;
  const notificationsBefore = notifications.length;
  const authorized = service.complete(sent.id, users.member, 'request-concurrent-authorized');
  const attacker = service.complete(sent.id, users.outsider, 'request-concurrent-attacker');

  assert.equal((await authorized).status, 'CONCLUIDA');
  await assert.rejects(attacker, (error) => error?.status === 403);
  assert.equal(tabs.AgendaMissionariaHistorico.length, historyBefore + 1);
  assert.equal(audits.length, 1);
  assert.equal(notifications.length, notificationsBefore + 1);
});
