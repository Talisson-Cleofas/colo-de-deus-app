const test = require('node:test');
const assert = require('node:assert/strict');
const { MinistriesService } = require('../dist/ministries/ministries.service');

function fixture(vocationalYear) {
  const tabs = {
    Ministérios: [{ id: 'music', nome: 'Música', lider_id: 'leader', ativo: 'TRUE' }],
    Participantes: [],
    Presenças: [],
  };
  const members = [
    { id: 'leader', name: 'Líder', email: 'leader@test.local', active: true },
    {
      id: 'candidate',
      name: 'Candidato',
      email: 'candidate@test.local',
      active: true,
      vocationalYear,
    },
  ];
  const repository = {
    listMembers: async () => members,
    read: async (tab) => tabs[tab] || [],
    parseActive: (value, fallback = false) => (value ? value === 'TRUE' : fallback),
    appendRecord: async (tab, row) => tabs[tab].push({ ...row }),
    updateRecord: async (tab, key, id, row) => {
      tabs[tab][tabs[tab].findIndex((item) => item[key] === id)] = { ...row };
    },
  };
  return {
    service: new MinistriesService(repository, { reconcileStructure: async () => undefined }),
    tabs,
    user: { id: 'dev', memberId: 'dev', profile: 'DEVELOPER' },
  };
}

test('Ano 1 continua impedido de ser vinculado a ministérios', async () => {
  const { service, tabs, user } = fixture('ANO_1');
  await assert.rejects(
    () => service.addMember('music', { memberId: 'candidate', function: 'MEMBRO' }, user),
    (error) => error.getStatus() === 403,
  );
  assert.equal(tabs.Participantes.length, 0);
});

test('liderança pode autorizar Ano 2 em um ministério com registro de auditoria', async () => {
  const { service, tabs, user } = fixture('ANO_2');
  await service.addMember('music', { memberId: 'candidate', function: 'MEMBRO' }, user);
  assert.equal(tabs.Participantes[0].membro_id, 'candidate');
  assert.equal(tabs.Participantes[0].autorizacao_ano_2_por, 'dev');
  assert.ok(tabs.Participantes[0].autorizacao_ano_2_em);
});

test('a partir de Discípulo o vínculo com ministério é permitido', async () => {
  for (const vocationalYear of ['DISCIPULO', 'POSTULANTE', 'CONSAGRADO']) {
    const { service, tabs, user } = fixture(vocationalYear);
    await service.addMember('music', { memberId: 'candidate', function: 'MEMBRO' }, user);
    assert.equal(tabs.Participantes[0].membro_id, 'candidate');
  }
});
