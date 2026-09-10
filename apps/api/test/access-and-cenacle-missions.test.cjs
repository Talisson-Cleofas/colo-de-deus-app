const test = require('node:test');
const assert = require('node:assert/strict');
const { CenacleMissionsService } = require('../dist/cenacle-missions/cenacle-missions.service');
const { MembersController } = require('../dist/members/members.controller');
const { ConfigService } = require('@nestjs/config');
const { SomaService } = require('../dist/soma/soma.service');

function missionFixture() {
  const members = [
    { id: 'dev', name: 'Dev', profile: 'DEVELOPER', active: true },
    {
      id: 'missions-leader',
      name: 'Líder Missões',
      profile: 'MINISTRY_LEADER',
      active: true,
      ministry: 'Missões',
    },
    {
      id: 'other-leader',
      name: 'Líder Música',
      profile: 'MINISTRY_LEADER',
      active: true,
      ministry: 'Música',
    },
    { id: 'member', name: 'Participante', profile: 'MEMBER', active: true },
    { id: 'outsider', name: 'Outro membro', profile: 'MEMBER', active: true },
  ];
  const tabs = {
    Ministérios: [
      { id: 'missions', nome: 'Missões', lider_id: 'missions-leader', ativo: 'TRUE' },
      { id: 'music', nome: 'Música', lider_id: 'other-leader', ativo: 'TRUE' },
    ],
    MissoesCenaculo: [],
    MissoesCenaculoFeedback: [],
    MissoesCenaculoPresencas: [],
  };
  const sheets = {
    read: async (tab) => tabs[tab] || [],
    listMembers: async () => members,
    parseActive: (value, fallback = false) => (value ? value === 'TRUE' : fallback),
    appendRecord: async (tab, row) => tabs[tab].push({ ...row }),
    updateRecord: async (tab, key, id, row) => {
      tabs[tab][tabs[tab].findIndex((item) => item[key] === id)] = { ...row };
    },
  };
  const notifications = [];
  return {
    service: new CenacleMissionsService(sheets, { createSystem: async (dto) => notifications.push(dto) }),
    members,
    tabs,
    notifications,
  };
}

test('Ministry of Missions manages missions while other ministry leaders cannot', async () => {
  const { service, members } = missionFixture();
  const dto = {
    title: 'Evangelização',
    description: '',
    date: '2026-01-01',
    time: '19:00',
    location: 'Praça',
    ministryId: 'missions',
    participantIds: ['member'],
    status: 'AGENDADA',
  };
  const mission = await service.create(dto, members[1]);
  assert.equal(mission.canManage, true);
  await assert.rejects(
    () => service.create(dto, members[2]),
    (error) => error.getStatus() === 403,
  );
  await assert.rejects(
    () => service.update(mission.id, dto, members[2]),
    (error) => error.getStatus() === 403,
  );
  await assert.rejects(
    () => service.results(mission.id, members[2]),
    (error) => error.getStatus() === 403,
  );
});

test('All active members see missions and confirmed participants answer released feedback', async () => {
  const { service, members, notifications } = missionFixture();
  const mission = await service.create(
    {
      title: 'Visita',
      description: '',
      date: '2026-01-01',
      time: '10:00',
      location: 'Hospital',
      ministryId: 'missions',
      status: 'CONCLUIDA',
    },
    members[0],
  );
  assert.equal((await service.list(members[3])).length, 1);
  assert.equal((await service.list(members[4])).length, 1);
  assert.equal(notifications[0].audience, 'TODOS');
  await assert.rejects(
    () => service.feedback(mission.id, { rating: 5 }, members[3]),
    (error) => error.getStatus() === 403,
  );
  await service.confirmPresence(mission.id, true, members[3]);
  const afterConfirmation = (await service.list(members[3]))[0];
  assert.deepEqual(afterConfirmation.participantIds, ['member']);
  await assert.rejects(
    () => service.openFeedback(mission.id, { id: 'mission-leader', profile: 'MISSION_LEADER' }),
    (error) => error.getStatus() === 403,
  );
  const released = await service.openFeedback(mission.id, members[1]);
  assert.equal(released.notified, 1);
  assert.deepEqual(notifications[1].recipientIds, ['member']);
  await service.feedback(
    mission.id,
    { rating: 5, strengths: 'Acolhimento', improvements: 'Horário' },
    members[3],
  );
  await assert.rejects(
    () => service.feedback(mission.id, { rating: 4 }, members[3]),
    (error) => error.getStatus() === 409,
  );
  await assert.rejects(
    () => service.feedback(mission.id, { rating: 4 }, members[4]),
    (error) => error.getStatus() === 403,
  );
  const results = await service.results(mission.id, members[1]);
  assert.equal(results[0].memberName, 'Participante');
});

test('does not release feedback before mission end and lets every active member respond', async () => {
  const { service, members } = missionFixture();
  const future = new Date();
  future.setDate(future.getDate() + 2);
  const date = future.toISOString().slice(0, 10);
  const mission = await service.create({
    title: 'Missão futura', description: '', date, time: '10:00', location: 'Praça',
    ministryId: 'missions', participantIds: ['member'], status: 'AGENDADA',
  }, members[0]);
  await assert.rejects(
    () => service.openFeedback(mission.id, members[0]),
    (error) => error.getStatus() === 400,
  );
  const presence = await service.confirmPresence(mission.id, true, members[4]);
  assert.equal(presence.status, 'CONFIRMADA');
});

test('Member and ministry leader receive the complete read-only member directory', async () => {
  const rows = [
    { id: 'a', name: 'Ana', email: 'a@example.test', active: true, ministry: 'Música', cell: 'A' },
    {
      id: 'b',
      name: 'Bruno',
      email: 'b@example.test',
      active: true,
      ministry: 'Acolhida',
      cell: 'B',
    },
  ];
  const repository = { listMembers: async () => rows };
  const controller = new MembersController(repository, {}, {}, {});
  for (const user of [
    { id: 'a', profile: 'MEMBER' },
    { id: 'leader', profile: 'MINISTRY_LEADER', ministry: 'Música' },
  ]) {
    const result = await controller.list(user, '', '', '', '', '', 'active');
    assert.deepEqual(
      result.members.map((member) => member.id),
      ['a', 'b'],
    );
  }
});

test('Ministry leader Soma report contains only members of ministries they lead', async () => {
  const paymentRows = [
    {
      id: 'p1',
      payment_id: 'p1',
      member_id: 'a',
      payer_email: 'a@example.test',
      status: 'approved',
      amount: '10',
      net_amount: '10',
      fee_amount: '0',
      date_approved: '2026-09-01T10:00:00Z',
    },
    {
      id: 'p2',
      payment_id: 'p2',
      member_id: 'b',
      payer_email: 'b@example.test',
      status: 'approved',
      amount: '20',
      net_amount: '20',
      fee_amount: '0',
      date_approved: '2026-09-01T10:00:00Z',
    },
  ];
  const sheets = {
    isDemo: () => false,
    read: async (tab) => (tab === 'Pagamentos' ? paymentRows : []),
  };
  const membersRepository = {
    read: async (tab) =>
      tab === 'Membros'
        ? [
            {
              id: 'a',
              nome: 'Ana',
              email: 'a@example.test',
              ministerio: 'Música',
              ministerio_id: 'music',
            },
            {
              id: 'b',
              nome: 'Bruno',
              email: 'b@example.test',
              ministerio: 'Acolhida',
              ministerio_id: 'welcome',
            },
          ]
        : tab === 'Ministérios'
          ? [
              { id: 'music', nome: 'Música', lider_id: 'leader' },
              { id: 'welcome', nome: 'Acolhida', lider_id: 'other' },
            ]
          : [],
  };
  const service = new SomaService(new ConfigService({}), sheets, membersRepository, {}, {}, {});
  const report = await service.financialReport(
    { id: 'leader', memberId: 'leader', email: 'leader@example.test', profile: 'MINISTRY_LEADER' },
    { from: '2026-09-01', to: '2026-09-30' },
  );
  assert.equal(report.totals.gross, 10);
  assert.deepEqual(
    report.payments.map((payment) => payment.member_id),
    ['a'],
  );
});
