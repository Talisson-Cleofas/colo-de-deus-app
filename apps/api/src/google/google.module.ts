import { Global, Module } from '@nestjs/common';
import { GoogleSheetsService } from './google-sheets.service';
import { StructureSyncService } from './structure-sync.service';

@Global()
@Module({ providers: [GoogleSheetsService, StructureSyncService], exports: [GoogleSheetsService, StructureSyncService] })
export class GoogleModule {}
