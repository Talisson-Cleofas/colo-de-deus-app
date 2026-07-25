import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateLectioSettingsDto } from './dto/update-lectio-settings.dto';
import { UpsertLectioDto } from './dto/upsert-lectio.dto';
import { LectioService } from './lectio.service';

@ApiTags('Lectio Divina')
@Controller('lectio')
export class LectioController {
  constructor(private readonly service: LectioService) {}

  @Get() @ApiOperation({ summary: 'Lista as Lectios mantidas no período de retenção' })
  list() { return this.service.list(); }

  @Get('today') @ApiOperation({ summary: 'Obtém a Lectio da data informada ou de hoje' })
  today(@Query('date') date?: string) { return this.service.today(date); }

  @Get('settings') @Roles('ADMIN')
  settings() { return this.service.getSettings(); }

  @Patch('settings') @Roles('ADMIN')
  updateSettings(@Body() dto: UpdateLectioSettingsDto) { return this.service.updateSettings(dto); }

  @Get('sync-logs') @Roles('ADMIN')
  logs() { return this.service.logs(); }

  @Get('providers/status') @Roles('ADMIN')
  providerStatus() { return this.service.providerStatus(); }

  @Post('sync') @Roles('ADMIN')
  @ApiOperation({ summary: 'Sincroniza usando fonte principal e fallback configurados' })
  sync(@Query('date') date?: string, @Query('force') force?: string) { return this.service.sync(date, force === 'true'); }

  @Post('sync/cnbb') @Roles('ADMIN')
  @ApiOperation({ summary: 'Importa a liturgia da CNBB e atualiza a aba Lectio' })
  syncCnbb(@Query('date') date?: string) { return this.service.syncCnbb(date); }

  @Post('retention/run') @Roles('ADMIN')
  retention() { return this.service.applyRetention('EXECUCAO_MANUAL'); }

  @Post() @Roles('ADMIN')
  create(@Body() dto: UpsertLectioDto) { return this.service.create(dto); }

  @Patch(':id') @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpsertLectioDto) { return this.service.update(id, dto); }

  @Get(':id') @ApiOperation({ summary: 'Obtém uma Lectio pelo ID' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }
}
