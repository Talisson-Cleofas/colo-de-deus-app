import { Module } from '@nestjs/common';
import { IntegrationConfigService } from './integration-config.service';
import { IntegrationsController } from './integrations.controller';
@Module({ controllers:[IntegrationsController], providers:[IntegrationConfigService], exports:[IntegrationConfigService] })
export class IntegrationsModule {}
