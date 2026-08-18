const test = require('node:test');
const assert = require('node:assert/strict');
const { CommunitiesService } = require('../dist/communities/communities.service.js');

test('exibe líder e pré-líder externos sem criar membros fictícios', async () => {
  const cells = [
    {
      id: 'cell-1',
      nome: 'Célula Exemplo',
      lider_id: '',
      vice_lider_id: '',
      lider_nome: 'Líder Externo',
      lider_contato: '(00) 00000-0000',
      vice_lider_nome: 'Pré-líder Externo',
      vice_lider_contato: '(00) 00000-0001',
      modalidade: 'Presencial',
      ativo: 'TRUE',
    },
  ];
  const repository = {
    isDemo: () => false,
    parseActive: (value) => value !== 'FALSE',
    listMembers: async () => [],
    read: async (sheet) => {
      if (sheet === 'Células') return cells;
      return [];
    },
  };
  const service = new CommunitiesService(
    repository,
    {},
    {},
    {},
    { isCellsMinistryLeader: async () => false, cellIds: async () => new Set() },
  );

  const [cell] = await service.list('CELL', {
    id: 'developer',
    memberId: 'developer',
    profile: 'DEVELOPER',
  });

  assert.equal(cell.leader.name, 'Líder Externo');
  assert.equal(cell.leader.phone, '(00) 00000-0000');
  assert.equal(cell.leader.external, true);
  assert.equal(cell.coLeaders[0].name, 'Pré-líder Externo');
  assert.equal(cell.coLeaders[0].external, true);
  assert.equal(cell.modality, 'Presencial');
});

test('permite ao líder da própria célula adicionar pessoa externa', async () => {
  const cells = [
    {
      id: 'cell-1',
      nome: 'Célula Modelo',
      lider_id: 'leader-1',
      vice_lider_id: '',
      modalidade: 'Presencial',
      ativo: 'TRUE',
    },
  ];
  const participants = [];
  const repository = {
    isDemo: () => false,
    parseActive: (value, defaultValue = false) =>
      value === '' ? defaultValue : String(value).toUpperCase() !== 'FALSE',
    listMembers: async () => [
      {
        id: 'leader-1',
        name: 'Líder Cadastrado',
        email: 'lider@example.test',
        phone: '',
        photo: '',
        role: 'CELL_LEADER',
        active: true,
      },
    ],
    read: async (sheet) => {
      if (sheet === 'Células') return cells;
      if (sheet === 'Participantes') return participants;
      return [];
    },
    appendRecord: async (sheet, row) => {
      assert.equal(sheet, 'Participantes');
      participants.push(row);
    },
  };
  const service = new CommunitiesService(
    repository,
    {},
    {},
    {},
    {
      isCellsMinistryLeader: async () => false,
      cellIds: async () => new Set(['cell-1']),
    },
  );

  const result = await service.addParticipant(
    'cell-1',
    {
      memberId: '',
      externalName: 'Pessoa Convidada',
      externalContact: '(00) 90000-0000',
      function: 'PARTICIPANTE',
    },
    { id: 'leader-1', memberId: 'leader-1', profile: 'CELL_LEADER' },
  );

  assert.equal(participants.length, 1);
  assert.equal(participants[0].membro_id, '');
  assert.equal(participants[0].externo_nome, 'Pessoa Convidada');
  assert.equal(result.participants[0].external, true);
  assert.equal(result.participants[0].phone, '(00) 90000-0000');
});

test('bloqueia pessoa externa para líder de ministério que não lidera Células', async () => {
  const repository = {
    isDemo: () => false,
    parseActive: (value) => String(value).toUpperCase() !== 'FALSE',
    listMembers: async () => [],
    read: async (sheet) => {
      if (sheet === 'Células')
        return [{ id: 'cell-1', nome: 'Célula Modelo', ministerio_id: 'ministry-1', ativo: 'TRUE' }];
      if (sheet === 'Ministérios')
        return [{ id: 'ministry-1', lider_id: 'ministry-leader', nome: 'Outro Ministério' }];
      return [];
    },
  };
  const service = new CommunitiesService(
    repository,
    {},
    {},
    {},
    { isCellsMinistryLeader: async () => false, cellIds: async () => new Set() },
  );

  await assert.rejects(
    service.addParticipant(
      'cell-1',
      {
        memberId: '',
        externalName: 'Pessoa Convidada',
        externalContact: '',
        function: 'PARTICIPANTE',
      },
      { id: 'ministry-leader', memberId: 'ministry-leader', profile: 'MINISTRY_LEADER' },
    ),
    /Somente o líder do Ministério de Células/,
  );
});
