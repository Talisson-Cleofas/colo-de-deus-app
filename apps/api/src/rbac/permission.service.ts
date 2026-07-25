import { Injectable } from '@nestjs/common';
import { GoogleSheetsService } from '../google/google-sheets.service';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { Permission } from './enums/permission.enum';
import { PermissionScope } from './enums/permission-scope.enum';
import { ProfileCode } from './enums/profile.enum';
import type { ProfilePermission, UserPermissions } from './interfaces/rbac.interfaces';
import { ProfilesService } from './profiles.service';
import { PermissionsService } from './permissions.service';
import { DEFAULT_PROFILE_PERMISSIONS } from './permission.defaults';
import { MemoryCacheService } from '../performance/memory-cache.service';

@Injectable()
export class PermissionService {
  constructor(private readonly sheets: GoogleSheetsService, private readonly profiles: ProfilesService, private readonly permissionCrud: PermissionsService, private readonly cache: MemoryCacheService) {}

  normalizeProfile(value: string): ProfileCode {
    const code = value.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if (['DEVELOPER','DESENVOLVEDOR'].includes(code)) return ProfileCode.DEVELOPER;
    if (['MISSION_LEADER','LIDER_MISSAO','LIDER MISSAO','ADMIN'].includes(code)) return ProfileCode.MISSION_LEADER;
    if (['MINISTRY_LEADER','LIDER_MINISTERIO','LIDER DE MINISTERIO'].includes(code)) return ProfileCode.MINISTRY_LEADER;
    if (['CELL_LEADER','LIDER','LEADER','LIDER_CELULA','LIDER DE CELULA'].includes(code)) return ProfileCode.CELL_LEADER;
    return ProfileCode.MEMBER;
  }

  private defaults(profile: ProfileCode): UserPermissions {
    const rows = DEFAULT_PROFILE_PERMISSIONS.filter((row)=>row.profileCode===profile && row.allowed);
    return { profile, permissions: rows.map((row)=>row.permissionCode), scopes: Object.fromEntries(rows.map((row)=>[row.permissionCode,row.scope])) };
  }

  async forProfile(profileInput: string): Promise<UserPermissions> {
    const profile = this.normalizeProfile(profileInput);
    if (this.sheets.isDemo()) return this.defaults(profile);
    return this.cache.remember(`rbac:profile:${profile}`, 5 * 60_000, async () => {
      const [rows, permissionCatalog] = await Promise.all([this.permissionCrud.matrix(), this.permissionCrud.list()]);
      const activeCodes = new Set(permissionCatalog.filter((p)=>p.active).map((p)=>p.code));
      const parsed: ProfilePermission[] = rows.filter((r)=>r.profileCode===profile && r.active!==false && activeCodes.has(r.permissionCode)).map((r)=>({
        profileCode: profile,
        permissionCode: r.permissionCode as Permission,
        allowed: r.allowed,
        scope: r.scope as PermissionScope,
      }));
      return parsed.length ? { profile, permissions: parsed.filter(r=>r.allowed).map(r=>r.permissionCode), scopes: Object.fromEntries(parsed.filter(r=>r.allowed).map(r=>[r.permissionCode,r.scope])) } : this.defaults(profile);
    }, ['rbac'], 30 * 60_000);
  }

  async forUser(user: AuthenticatedUser): Promise<UserPermissions> { return this.forProfile(user.profile); }
  async has(user: AuthenticatedUser, ...required: Permission[]): Promise<boolean> {
    const granted = await this.forUser(user);
    return required.every((permission)=>granted.permissions.includes(permission));
  }
  async catalog() { const [profiles, permissions, profilePermissions] = await Promise.all([this.profiles.list(), this.permissionCrud.list(), this.permissionCrud.matrix()]); return { profiles, permissions, profilePermissions }; }
}
