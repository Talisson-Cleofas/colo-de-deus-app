import { SetMetadata } from '@nestjs/common';
import type { AccessProfile } from '../types/auth-user.type';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AccessProfile[]) => SetMetadata(ROLES_KEY, roles);
