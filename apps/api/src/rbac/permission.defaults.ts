import { Permission } from './enums/permission.enum';
import { PermissionScope } from './enums/permission-scope.enum';
import { ProfileCode } from './enums/profile.enum';
import type { ProfilePermission, RbacPermission, RbacProfile } from './interfaces/rbac.interfaces';

export const DEFAULT_PROFILES: RbacProfile[] = [
  {
    code: ProfileCode.DEVELOPER,
    name: 'Desenvolvedor',
    description: 'Administração técnica total da plataforma.',
    level: 100,
    active: true,
  },
  {
    code: ProfileCode.MISSION_LEADER,
    name: 'Líder Missão',
    description: 'Responsável pela administração funcional da missão.',
    level: 90,
    active: true,
  },
  {
    code: ProfileCode.MINISTRY_LEADER,
    name: 'Líder de Ministério',
    description: 'Gestão no escopo do ministério.',
    level: 60,
    active: true,
  },
  {
    code: ProfileCode.CELL_LEADER,
    name: 'Líder de Célula',
    description: 'Gestão no escopo da célula.',
    level: 40,
    active: true,
  },
  {
    code: ProfileCode.MEMBER,
    name: 'Membro',
    description: 'Acesso pessoal e consultas gerais.',
    level: 10,
    active: true,
  },
];

export const DEFAULT_PERMISSIONS: RbacPermission[] = Object.values(Permission).map((code) => {
  const [resource, action] = code.split(':');
  return { code, resource, action, description: `${action} em ${resource}`, active: true };
});

const all = Object.values(Permission);
const read = all.filter((item) => item.endsWith(':READ'));
const manageFunctional = all.filter(
  (item) =>
    !item.startsWith('TECHNICAL_ADMIN:') &&
    !item.startsWith('INTEGRATIONS:') &&
    !item.startsWith('LOGS:') &&
    !item.startsWith('BACKUP:'),
);
const leader = [
  Permission.DASHBOARD_READ,
  Permission.MEMBERS_READ,
  Permission.MEMBERS_UPDATE,
  Permission.MINISTRIES_READ,
  Permission.CELLS_READ,
  Permission.CELLS_CREATE,
  Permission.CELLS_UPDATE,
  Permission.CELLS_DELETE,
  Permission.ATTENDANCE_READ,
  Permission.ATTENDANCE_CREATE,
  Permission.CENACLES_READ,
  Permission.CENACLES_CREATE,
  Permission.CENACLES_UPDATE,
  Permission.CENACLES_DELETE,
  Permission.EVENTS_READ,
  Permission.EVENTS_CREATE,
  Permission.EVENTS_UPDATE,
  Permission.EVENTS_DELETE,
  Permission.MISSIONARY_AGENDA_READ,
  Permission.MISSIONARY_AGENDA_CREATE,
  Permission.MISSIONARY_AGENDA_UPDATE,
  Permission.LECTIO_READ,
  Permission.SOMA_READ,
  Permission.SOMA_WRITE,
  Permission.FINANCIAL_REPORT_READ,
  Permission.NOTIFICATIONS_READ,
  Permission.NOTIFICATIONS_CREATE,
  Permission.NOTIFICATIONS_SEND,
  Permission.REPORTS_READ,
];
const member = [
  Permission.DASHBOARD_READ,
  Permission.MEMBERS_READ,
  Permission.MEMBERS_UPDATE,
  Permission.MINISTRIES_READ,
  Permission.CELLS_READ,
  Permission.CENACLES_READ,
  Permission.EVENTS_READ,
  Permission.LECTIO_READ,
  Permission.SOMA_READ,
];

export const DEFAULT_PROFILE_PERMISSIONS: ProfilePermission[] = [
  ...all.map((permissionCode) => ({
    profileCode: ProfileCode.DEVELOPER,
    permissionCode,
    allowed: true,
    scope: PermissionScope.ALL,
  })),
  ...manageFunctional.map((permissionCode) => ({
    profileCode: ProfileCode.MISSION_LEADER,
    permissionCode,
    allowed: true,
    scope: PermissionScope.ALL,
  })),
  ...read
    .filter((p) => !manageFunctional.includes(p))
    .map((permissionCode) => ({
      profileCode: ProfileCode.MISSION_LEADER,
      permissionCode,
      allowed: true,
      scope: PermissionScope.ALL,
    })),
  ...leader.map((permissionCode) => ({
    profileCode: ProfileCode.MINISTRY_LEADER,
    permissionCode,
    allowed: true,
    scope: PermissionScope.MINISTRY,
  })),
  ...leader.map((permissionCode) => ({
    profileCode: ProfileCode.CELL_LEADER,
    permissionCode,
    allowed: true,
    scope: PermissionScope.CELL,
  })),
  ...member.map((permissionCode) => ({
    profileCode: ProfileCode.MEMBER,
    permissionCode,
    allowed: true,
    scope: PermissionScope.OWN,
  })),
];
