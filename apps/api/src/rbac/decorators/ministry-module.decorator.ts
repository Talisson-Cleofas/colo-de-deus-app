import { SetMetadata } from '@nestjs/common';
import type { MinistryModuleCode } from '../ministry-permission.map';

export const MINISTRY_MODULE_KEY = 'rbac:ministry-module';
export const RequireMinistryModule = (...modules: MinistryModuleCode[]) => SetMetadata(MINISTRY_MODULE_KEY, modules);
