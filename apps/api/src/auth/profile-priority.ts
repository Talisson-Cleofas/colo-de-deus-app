import type { AccessProfile } from './types/auth-user.type';

const PROFILE_PRIORITY: Record<AccessProfile, number> = {
  DEVELOPER: 100,
  MISSION_LEADER: 90,
  ADMIN: 90,
  MINISTRY_LEADER: 60,
  CELL_LEADER: 40,
  MEMBER: 10,
};

export function normalizeAccessProfile(value: string): AccessProfile {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (['DEVELOPER', 'DESENVOLVEDOR'].includes(normalized)) return 'DEVELOPER';
  if (normalized === 'ADMIN') return 'ADMIN';
  if (['MISSION_LEADER', 'LIDER_MISSAO', 'LIDER MISSAO', 'LIDER DE MISSAO'].includes(normalized))
    return 'MISSION_LEADER';
  if (['LIDER_MINISTERIO', 'LIDER DE MINISTERIO', 'MINISTRY_LEADER'].includes(normalized))
    return 'MINISTRY_LEADER';
  if (['LIDER', 'LEADER', 'LIDER_CELULA', 'LIDER DE CELULA', 'CELL_LEADER'].includes(normalized))
    return 'CELL_LEADER';
  return 'MEMBER';
}

export function resolveAccessProfiles(value: string | string[] | undefined): AccessProfile[] {
  const raw = Array.isArray(value) ? value : String(value || '').split(/[,;|]/);
  const profiles = [...new Set(raw.filter(Boolean).map(normalizeAccessProfile))];
  if (!profiles.length) profiles.push('MEMBER');
  return profiles.sort((a, b) => PROFILE_PRIORITY[b] - PROFILE_PRIORITY[a]);
}

export function effectiveAccessProfile(value: string | string[] | undefined): AccessProfile {
  return resolveAccessProfiles(value)[0];
}
