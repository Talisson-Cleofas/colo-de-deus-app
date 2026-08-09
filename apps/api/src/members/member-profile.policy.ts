import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import type { MemberRow } from '../google/google-sheets.service';

const ADMIN_PROFILES = new Set(['DEVELOPER', 'MISSION_LEADER', 'ADMIN']);

function userId(user: AuthenticatedUser): string {
  return user.memberId || user.id || user.uid;
}

export type MemberProfileAccess = {
  isAdministrator: boolean;
  isSelf: boolean;
  canViewPublicProfile: boolean;
  canViewCareData: boolean;
  canViewFinancial: boolean;
  canViewHistory: boolean;
};

export function memberProfileAccess(
  user: AuthenticatedUser,
  member: MemberRow,
): MemberProfileAccess {
  const isAdministrator = ADMIN_PROFILES.has(user.profile);
  const isSelf = userId(user) === member.id;
  const leadsMinistry =
    user.profile === 'MINISTRY_LEADER' &&
    Boolean(user.ministry && member.ministry === user.ministry);
  const leadsCell =
    user.profile === 'CELL_LEADER' && Boolean(user.cell && member.cell === user.cell);

  return {
    isAdministrator,
    isSelf,
    canViewPublicProfile: member.active || isAdministrator || isSelf,
    canViewCareData: isAdministrator || isSelf || leadsMinistry || leadsCell,
    canViewFinancial: isAdministrator || isSelf,
    canViewHistory: isAdministrator || isSelf,
  };
}
