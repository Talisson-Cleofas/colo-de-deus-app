import { Module } from '@nestjs/common';
import { TechnicalAdminController } from './technical-admin.controller';
import { TechnicalAdminService } from './technical-admin.service';
@Module({ controllers: [TechnicalAdminController], providers: [TechnicalAdminService] })
export class TechnicalAdminModule {}
