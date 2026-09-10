const test = require('node:test');
const assert = require('node:assert/strict');
const {
  effectiveAccessProfile,
  resolveAccessProfiles,
} = require('../dist/auth/profile-priority.js');
const { CommunitiesService } = require('../dist/communities/communities.service.js');
const { PermissionService } = require('../dist/rbac/permission.service.js');
const { Permission } = require('../dist/rbac/enums/permission.enum.js');

test('aplica sempre o perfil de maior prioridade quando há múltiplos perfis', () => {
  assert.equal(effectiveAccessProfile(['MEMBER', 'CELL_LEADER']), 'CELL_LEADER');
  assert.equal(effectiveAccessProfile(['CELL_LEADER', 'MINISTRY_LEADER']), 'MINISTRY_LEADER');
  assert.equal(
    effectiveAccessProfile(['CELL_LEADER', 'MINISTRY_LEADER', 'MISSION_LEADER']),
    'MISSION_LEADER',
  );
  assert.equal(effectiveAccessProfile(['CELL_LEADER', 'MISSION_LEADER', 'DEVELOPER']), 'DEVELOPER');
  assert.deepEqual(resolveAccessProfiles('MEMBER,CELL_LEADER,MINISTRY_LEADER'), [
    'MINISTRY_LEADER',
    'CELL_LEADER',
    'MEMBER',
  ]);
});

test('limita matriz antiga do líder de célula às permissões da própria célula', async () => {
  const permissionCatalog = [
    Permission.CELLS_UPDATE,
    Permission.ATTENDANCE_CREATE,
    Permission.CENACLES_UPDATE,
    Permission.EVENTS_CREATE,
    Permission.NOTIFICATIONS_CREATE,
  ].map((code) => ({ code, active: true }));
  const matrix = permissionCatalog.map(({ code }) => ({
    profileCode: 'CELL_LEADER',
    permissionCode: code,
    allowed: true,
    scope: 'ALL',
    active: true,
  }));
  const service = new PermissionService(
    { isDemo: () => false },
    {},
    { matrix: async () => matrix, list: async () => permissionCatalog },
    { remember: async (_key, _ttl, load) => load() },
    {},
  );

  const result = await service.forProfile('CELL_LEADER');

  assert.equal(result.permissions.includes(Permission.CELLS_UPDATE), true);
  assert.equal(result.permissions.includes(Permission.ATTENDANCE_CREATE), true);
  assert.equal(result.permissions.includes(Permission.CENACLES_UPDATE), false);
  assert.equal(result.permissions.includes(Permission.EVENTS_CREATE), false);
  assert.equal(result.permissions.includes(Permission.NOTIFICATIONS_CREATE), false);
});

test('líder exclusivamente de célula edita só a própria célula, nunca o cenáculo', async () => {
  const cells = [
    { id: 'cell-own', nome: 'Célula Própria', lider_id: 'leader-1', ativo: 'TRUE' },
    { id: 'cell-other', nome: 'Outra Célula', lider_id: 'leader-2', ativo: 'TRUE' },
  ];
  const cenacles = [
    {
      id: 'cenacle-own-cell',
      nome: 'Cenáculo ligado à célula',
      celula_id: 'cell-own',
      responsavel_id: 'leader-1',
      ativo: 'TRUE',
    },
  ];
  const repository = {
    isDemo: () => false,
    parseActive: (value) => String(value).toUpperCase() !== 'FALSE',
    listMembers: async () => [],
    read: async (sheet) => {
      if (sheet === 'Células') return cells;
      if (sheet === 'Cenáculos') return cenacles;
      return [];
    },
  };
  const service = new CommunitiesService(
    repository,
    {},
    {},
    {},
    {
      isCellsMinistryLeader: async () => false,
      cellIds: async () => new Set(['cell-own']),
    },
  );
  const user = { id: 'leader-1', memberId: 'leader-1', profile: 'CELL_LEADER' };

  const listedCells = await service.list('CELL', user, 'ALL');
  const listedCenacles = await service.list('CENACLE', user, 'ALL');

  assert.equal(listedCells.find((item) => item.id === 'cell-own').canEdit, true);
  assert.equal(listedCells.find((item) => item.id === 'cell-other').canEdit, false);
  assert.equal(listedCenacles[0].canEdit, false);
  assert.equal(listedCenacles[0].canManageParticipants, false);
});
