import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { CnbbLectioProvider } from './cnbb-lectio.provider';
import { CancaoNovaLectioProvider } from './cancao-nova-lectio.provider';
import { LectioController } from './lectio.controller';
import { LectioProviderManager } from './lectio-provider-manager';
import { LectioMigrationService } from './lectio-migration.service';
import { LectioService } from './lectio.service';
import { LectioAutoSyncService } from './lectio-auto-sync.service';
import { SemanticLectioParser } from './semantic-lectio.parser';
import { SemanticStateMachineParser } from './semantic-state-machine.parser';

@Module({
  imports: [IntegrationsModule],
  controllers: [LectioController],
  providers: [LectioService, LectioAutoSyncService, SemanticStateMachineParser, SemanticLectioParser, CnbbLectioProvider, CancaoNovaLectioProvider, LectioProviderManager, LectioMigrationService],
  exports: [LectioService],
})
export class LectioModule {}
