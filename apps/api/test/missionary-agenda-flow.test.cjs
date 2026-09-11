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
  yearOne: {
    id: 'year-one',
    memberId: 'year-one',
    uid: 'year-one',
    name: 'Membro Ano 1',
    email: 'year.one@test.dev',
    profile: 'MEMBER',
    ministry: 'Missões',
    vocationalYear: 'ANO_1',
  },
  yearTwo: {
    id: 'year-two',
    memberId: 'year-two',
    uid: 'year-two',
    name: 'Membro Ano 2',
    email: 'year.two@test.dev',
    profile: 'MEMBER',
    ministry: 'Missões',
    vocationalYear: 'ANO_2',
  },
  intercessionLeader: {
    id: 'intercession-leader',
    memberId: 'intercession-leader',
    uid: 'intercession-leader',
    name: 'Líder de Intercessão',
    email: 'intercession.leader@test.dev',
    profile: 'MINISTRY_LEADER',
    ministry: 'Intercessão',
  },
  intercessor: {
    id: 'intercessor-1',
    memberId: 'intercessor-1',
    uid: 'intercessor-1',
    name: 'Intercessor Enviado',
    email: 'intercessor@test.dev',
    profile: 'MEMBER',
    ministry: 'Intercessão',
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
    vocationalYear: user.vocationalYear || '',
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
    {
      id: 'ministry-intercession',
      nome: 'Intercessão',
      codigo: 'INTERCESSAO',
      lider_id: users.intercessionLeader.id,
      vice_lider_id: '',
      ativo: 'TRUE',
    },
  ];
  const notifications = [];
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
    service: new MissionaryAgendaService(repository, {
      createSystem: async (notification) => notifications.push(notification),
    }),
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
  responsibleId: users.member.id,
  ministryId: 'ministry-1',
  participantLimit: 40,
  meetingPoint: 'Entrada principal',
  transport: '',
  notes: '',
});

const calendarEvent = (extra = {}) => ({
  id: 'event-test',
  titulo: 'Retiro da Missão',
  inicio: '2026-09-05T08:00:00',
  fim: '2026-09-05T10:00:00',
  ativo: 'TRUE',
  publicado: 'TRUE',
  ...extra,
});

test('permite várias missões na mesma data quando não há evento', async () => {
  const { service, tabs } = fixture();
  const first = await service.create(input('Missão A'), users.agenda);
  const second = await service.create(input('Missão B'), users.agenda);
  assert.notEqual(first.id, second.id);
  assert.equal(first.startDate, second.startDate);
  assert.equal(tabs.AgendaMissionaria.length, 2);
});

test('bloqueia cadastro na data de um evento, informa o título e não grava nem notifica', async () => {
  const { service, tabs, notifications } = fixture();
  tabs.Eventos = [calendarEvent()];
  await assert.rejects(service.create(input(), users.agenda), (error) => {
    assert.equal(error.getStatus(), 409);
    assert.match(error.message, /Retiro da Missão \(05\/09\/2026\)/);
    return true;
  });
  assert.equal(tabs.AgendaMissionaria.length, 0);
  assert.equal(tabs.AgendaMissionariaHistorico.length, 0);
  assert.equal(notifications.length, 0);
});

test('detecta sobreposição de períodos e limites inclusivos, ignorando horários', async () => {
  for (const [start, end] of [
    ['2026-09-04', '2026-09-06'],
    ['2026-09-05', '2026-09-07'],
    ['2026-09-01', '2026-09-05'],
  ]) {
    const { service, tabs } = fixture();
    tabs.Eventos = [calendarEvent({ inicio: start, fim: end })];
    await assert.rejects(service.create(input(), users.agenda), /Retiro da Missão/);
  }
  const { service, tabs } = fixture();
  tabs.Eventos = [calendarEvent({ inicio: '2026-09-06', fim: '2026-09-06' })];
  await assert.rejects(
    service.create({ ...input(), endDate: '2026-09-07' }, users.agenda),
    /Retiro da Missão/,
  );
});

test('permite dias livres e ignora eventos excluídos, inativos ou rascunhos', async () => {
  const { service, tabs } = fixture();
  tabs.Eventos = [
    calendarEvent({ deleted_at: '2026-09-01' }),
    calendarEvent({ ativo: 'FALSE' }),
    calendarEvent({ publicado: 'FALSE' }),
    calendarEvent({ inicio: '2026-09-06', fim: '' }),
  ];
  assert.equal((await service.create(input(), users.agenda)).status, 'RASCUNHO');
});

test('revalida edição e envio quando um evento é cadastrado depois do rascunho', async () => {
  const { service, tabs } = fixture();
  const created = await service.create(input(), users.agenda);
  tabs.Eventos = [calendarEvent()];
  await assert.rejects(
    service.update(created.id, { title: 'Alterado' }, users.agenda),
    /Retiro da Missão/,
  );
  await assert.rejects(service.submit(created.id, users.agenda), /Retiro da Missão/);
  assert.equal((await service.findOne(created.id, users.agenda)).title, input().title);
});

test('revalida aprovação e não libera conflito para liderança central', async () => {
  const { service, tabs } = fixture();
  const created = await service.create(input(), users.agenda);
  await service.submit(created.id, users.agenda);
  tabs.Eventos = [calendarEvent()];
  await assert.rejects(service.approve(created.id, {}, users.mission), /Retiro da Missão/);
  assert.equal((await service.findOne(created.id, users.mission)).status, 'AGUARDANDO_APROVACAO');
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
  assert.equal(ministryView.canEdit, false);
  assert.equal(ministryView.canSelectMembers, true);

  const sent = await service.sendToMembers(
    created.id,
    { memberIds: [users.member.id], authorizeRequestedMissionary: true },
    users.ministry,
  );
  assert.equal(sent.status, 'AGUARDANDO_INDICACOES');
  assert.equal(sent.ministrySelectionCompleted, true);
  assert.equal(sent.intercessionSelectionCompleted, false);
  assert.equal(notifications.length, 3);

  const finalized = await service.sendIntercessors(
    created.id,
    { memberIds: [users.intercessor.id] },
    users.intercessionLeader,
  );
  assert.equal(finalized.status, 'ENVIADA_AOS_MEMBROS');
  assert.equal(finalized.intercessionSelectionCompleted, true);
  assert.deepEqual(sent.participantIds, [users.member.id]);
  assert.equal((await service.list({}, users.member)).length, 1);
  assert.equal(tabs.AgendaMissionariaHistorico.length, 6);
  assert.equal(notifications.length, 5);
  assert.deepEqual(notifications.at(-2).recipientIds, [users.intercessor.id]);
  assert.deepEqual(notifications.at(-1).recipientIds, [users.agenda.id]);
});

test('permite criar e enviar a agenda sem missionário previamente indicado', async () => {
  const { service } = fixture();
  const created = await service.create({ ...input(), responsibleId: '' }, users.agenda);

  assert.equal(created.responsibleId, '');
  assert.equal(created.canSubmit, true);

  const submitted = await service.submit(created.id, users.agenda);
  assert.equal(submitted.status, 'AGUARDANDO_APROVACAO');
});

test('salva acompanhantes solicitados e deixa intercessores para a liderança responsável', async () => {
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
  assert.deepEqual(created.intercessorIds, []);
  assert.equal(
    tabs.AgendaMissionariaParticipantes.find((row) => row.membro_id === users.ministry.id).funcao,
    'ACOMPANHANTE',
  );
  assert.equal(
    tabs.AgendaMissionariaParticipantes.some((row) => row.funcao === 'INTERCESSOR'),
    false,
  );
});

test('ignora indicação antecipada de intercessores feita pelo criador', async () => {
  const { service } = fixture();
  const created = await service.create(
    {
      ...input('Missão com intercessão antecipada'),
      intercessorIds: [users.intercessor.id],
    },
    users.agenda,
  );
  assert.deepEqual(created.intercessorIds, []);
});

test('registra o responsável pelos itens da Store e o controle da maquininha', async () => {
  const { service, tabs } = fixture();
  const created = await service.create(
    {
      ...input('Missão com Store'),
      responsibleId: users.ministry.id,
      takesStoreItems: true,
      storeResponsibleId: users.member.id,
      storeCardMachine: true,
      accompanyingIds: [users.member.id],
    },
    users.agenda,
  );

  assert.equal(created.takesStoreItems, true);
  assert.equal(created.storeResponsibleId, users.member.id);
  assert.equal(created.storeResponsibleName, users.member.name);
  assert.equal(created.storeCardMachine, true);
  assert.equal(tabs.AgendaMissionaria[0].levar_itens_store, 'TRUE');
  assert.equal(tabs.AgendaMissionaria[0].responsavel_store_id, users.member.id);
  assert.equal(tabs.AgendaMissionaria[0].maquininha_store, 'TRUE');
  assert.match(tabs.AgendaMissionariaHistorico[0].observacao, /maquininha de cartão/i);
  await assert.rejects(
    () => service.update(created.id, { accompanyingIds: [] }, users.agenda),
    /selecionado como acompanhante/i,
  );
});

test('impede que missionário solicitado ou enviado também seja acompanhante ou responsável pela Store', async () => {
  const { service } = fixture();
  await assert.rejects(
    () =>
      service.create(
        {
          ...input('Missão com função duplicada'),
          accompanyingIds: [users.member.id],
        },
        users.agenda,
      ),
    /missionário solicitado não pode ser acompanhante/i,
  );

  const created = await service.create(
    {
      ...input('Missão com acompanhante exclusivo'),
      responsibleId: '',
      accompanyingIds: [users.member.id],
    },
    users.agenda,
  );
  await service.submit(created.id, users.agenda);
  await service.approve(created.id, {}, users.mission);
  await assert.rejects(
    () => service.sendToMembers(created.id, { memberIds: [users.member.id] }, users.ministry),
    /não pode estar selecionado como acompanhante/i,
  );
});

test('exige acompanhante selecionado como responsável quando a missão leva itens da Store', async () => {
  const { service, tabs } = fixture();
  await assert.rejects(
    () =>
      service.create(
        { ...input('Missão sem responsável da Store'), takesStoreItems: true },
        users.agenda,
      ),
    /responsável pelos itens/i,
  );
  await assert.rejects(
    () =>
      service.create(
        {
          ...input('Missão com responsável fora dos acompanhantes'),
          takesStoreItems: true,
          storeResponsibleId: users.member.id,
        },
        users.agenda,
      ),
    /selecionado como acompanhante/i,
  );
  assert.equal(tabs.AgendaMissionaria.length, 0);
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

test('permite anos iniciais somente como acompanhantes na Agenda Missionária', async () => {
  const { service, tabs, notifications } = fixture();
  const created = await service.create(
    { ...input('Missão com regra vocacional'), responsibleId: '' },
    users.agenda,
  );
  await service.submit(created.id, users.agenda);
  await service.approve(created.id, {}, users.mission);

  const optionsBefore = await service.options(users.ministry);
  assert.equal(
    optionsBefore.members.some((member) => member.id === users.yearOne.id),
    true,
  );
  assert.equal(
    optionsBefore.members.some((member) => member.id === users.yearTwo.id),
    true,
  );
  assert.equal(
    optionsBefore.yearTwoMembers.some((member) => member.id === users.yearTwo.id),
    true,
  );

  await assert.rejects(
    () =>
      service.sendToMembers(
        created.id,
        { memberIds: [users.yearOne.id], authorizeRequestedMissionary: true },
        users.ministry,
      ),
    /somente como acompanhantes/i,
  );
  await assert.rejects(
    () =>
      service.sendToMembers(
        created.id,
        { memberIds: [users.yearTwo.id], authorizeRequestedMissionary: true },
        users.ministry,
      ),
    /somente como acompanhantes/i,
  );

  await assert.rejects(
    () => service.authorizeYearTwo(created.id, users.yearTwo.id, users.ministry),
    /somente como acompanhantes/i,
  );
  assert.equal(tabs.AgendaMissionariaHistorico.some((row) => row.acao === 'ANO_2_AUTORIZADO'), false);
  assert.equal(notifications.some((notice) => notice.recipientIds.includes(users.yearTwo.id)), false);
});

test('impede perfil sem gestão de autorizar Ano 2 na Agenda Missionária', async () => {
  const { service } = fixture();
  const created = await service.create(input('Missão sem autorização indevida'), users.agenda);
  await service.submit(created.id, users.agenda);
  await service.approve(created.id, {}, users.mission);
  await assert.rejects(
    () => service.authorizeYearTwo(created.id, users.yearTwo.id, users.member),
    /não encontrada|Somente a liderança/i,
  );
});

test('exige autorização explícita do missionário solicitado pelo líder do ministério', async () => {
  const { service } = fixture();
  const created = await service.create(input('Missão com indicação específica'), users.agenda);
  await service.submit(created.id, users.agenda);
  await service.approve(created.id, {}, users.mission);
  await assert.rejects(
    () => service.sendToMembers(created.id, { memberIds: [users.member.id] }, users.ministry),
    /Confirme a autorização do missionário solicitado/i,
  );
  await assert.rejects(
    () =>
      service.sendToMembers(
        created.id,
        { memberIds: [users.ministry.id], authorizeRequestedMissionary: true },
        users.ministry,
      ),
    /missionário solicitado precisa estar entre/i,
  );
});

test('somente Intercessão seleciona intercessores e cada equipe é notificada na sua etapa', async () => {
  const { service, notifications } = fixture();
  const created = await service.create(
    { ...input('Missão aguardando duas equipes'), responsibleId: '' },
    users.agenda,
  );
  await service.submit(created.id, users.agenda);
  await service.approve(created.id, {}, users.mission);
  const workflowNotifications = notifications.length;
  await service.sendToMembers(created.id, { memberIds: [users.member.id] }, users.ministry);
  assert.equal(notifications.length, workflowNotifications + 1);
  assert.deepEqual(notifications.at(-1).recipientIds, [users.member.id]);
  await assert.rejects(
    () =>
      service.sendIntercessors(created.id, { memberIds: [users.intercessor.id] }, users.ministry),
    /Somente o líder do Ministério de Intercessão/i,
  );
});

test('rejeita término anterior ao início', async () => {
  const { service } = fixture();
  await assert.rejects(
    () => service.create({ ...input(), endDate: '2026-09-04' }, users.agenda),
    /término não pode ser anterior/i,
  );
});
