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
