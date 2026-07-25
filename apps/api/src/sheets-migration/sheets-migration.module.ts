import { Module } from '@nestjs/common';
import { MapsDriveSheetsMigrationService } from './maps-drive-sheets-migration.service';
import { SheetsMigrationController } from './sheets-migration.controller';
@Module({ controllers: [SheetsMigrationController], providers: [MapsDriveSheetsMigrationService], exports: [MapsDriveSheetsMigrationService] })
export class SheetsMigrationModule {}
