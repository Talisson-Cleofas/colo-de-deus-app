import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { IntegrationConfigService } from './integration-config.service';
import { UpsertIntegrationDto } from './dto/upsert-integration.dto';
@Controller('integrations') @Roles('ADMIN')
export class IntegrationsController {
  constructor(private readonly service: IntegrationConfigService) {}
  @Get() list(@Query('module') module?: string) { return this.service.list(module); }
  @Patch() upsert(@Body() dto: UpsertIntegrationDto) { return this.service.upsert(dto.module,dto.key,dto.value,dto); }
}
