const test = require('node:test');
const assert = require('node:assert/strict');
const { ConfigService } = require('@nestjs/config');
const { DEFAULT_PROFILE_PERMISSIONS } = require('../dist/rbac/permission.defaults');
const { Permission } = require('../dist/rbac/enums/permission.enum');
const { PermissionService } = require('../dist/rbac/permission.service');
const { memberProfileAccess } = require('../dist/members/member-profile.policy');
const { SomaService } = require('../dist/soma/soma.service');

const allowed = (profile, permission) =>
  DEFAULT_PROFILE_PERMISSIONS.some(
    (row) => row.profileCode === profile && row.permissionCode === permission && row.allowed,
  );

const matrix = [
  ['Membros', Permission.MEMBERS_READ, true, true, true, true, true],
  ['Células', Permission.CELLS_READ, true, true, true, true, true],
  ['Cenáculos', Permission.CENACLES_READ, true, true, true, true, true],
  ['Agenda Geral', Permission.EVENTS_READ, true, true, true, true, true],
  ['Agenda Missionária', Permission.MISSIONARY_AGENDA_READ, true, true, true, true, true],
  ['Administração', Permission.SETTINGS_READ, true, true, false, false, false],
  ['Soma+', Permission.SOMA_READ, true, true, true, true, true],
  ['Notificações', Permission.NOTIFICATIONS_CREATE, true, true, true, true, false],
  ['Auditoria', Permission.LOGS_READ, true, true, false, false, false],
  ['RBAC', Permission.SETTINGS_MANAGE, true, true, false, false, false],
  ['Lectio', Permission.LECTIO_READ, true, true, true, true, true],
];

test('matriz RBAC padrão cobre os recursos críticos por perfil global', () => {
  for (const [resource, permission, developer, missionLeader, ministryLeader, cellLeader, member] of matrix) {
    assert.equal(allowed('DEVELOPER', permission), developer, `${resource}/DEVELOPER`);
    assert.equal(allowed('MISSION_LEADER', permission), missionLeader, `${resource}/MISSION_LEADER`);
    assert.equal(allowed('MINISTRY_LEADER', permission), ministryLeader, `${resource}/MINISTRY_LEADER`);
    assert.equal(allowed('CELL_LEADER', permission), cellLeader, `${resource}/CELL_LEADER`);
    assert.equal(allowed('MEMBER', permission), member, `${resource}/MEMBER`);
  }
});

test('ADMIN usa a política funcional de líder de missão sem ganhar administração técnica', async () => {
  const service = new PermissionService(
    { isDemo: () => true },
    {},
    {},
    { remember: async (_key, _ttl, loader) => loader() },
    { modulesForUser: async () => [] },
  );
  const permissions = await service.forProfile('ADMIN');
  assert.equal(permissions.profile, 'MISSION_LEADER');
  assert.equal(permissions.permissions.includes(Permission.SETTINGS_MANAGE), true);
  assert.equal(permissions.permissions.includes(Permission.TECHNICAL_ADMIN_MANAGE), false);
});

test('permissão de leitura de Membros não libera dados financeiros de outro membro', () => {
  const target = { id: 'member-b', active: true, ministry: 'Missões', cell: 'cell-b' };
  const scopedLeader = {
    uid: 'leader-a', id: 'leader-a', memberId: 'leader-a', profile: 'CELL_LEADER',
    ministry: 'Missões', cell: 'cell-a',
  };
  const access = memberProfileAccess(scopedLeader, target);
  assert.equal(access.canViewPublicProfile, true);
  assert.equal(access.canViewCareData, false);
  assert.equal(access.canViewFinancial, false);
  assert.equal(access.canViewHistory, false);
});

test('recibo de contribuição de outra pessoa é bloqueado mesmo com ID conhecido', async () => {
  const sheets = {
    isDemo: () => false,
    read: async (tab) => tab === 'Pagamentos' ? [{
      id: 'row-1', payment_id: 'payment-owner', member_id: 'member-owner',
      member_name: 'Titular', amount: '25', status: 'approved', receipt_hash: 'hash',
    }] : [],
  };
  const service = new SomaService(
    new ConfigService({}), sheets, {}, {}, {}, { pdf: () => Buffer.from('pdf') },
  );
  await assert.rejects(
    () => service.receipt('payment-owner', {
      uid: 'member-other', id: 'member-other', memberId: 'member-other', profile: 'MEMBER',
    }),
    /indisponível/i,
  );
});
