import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { ReportsService } from './reports.service';
import type { ReportExportFormat, ReportScopeType } from './reports.types';

@ApiTags('Relatórios')
@Roles('ADMIN','MINISTRY_LEADER','CELL_LEADER','MEMBER')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}
  private query(q: Record<string,string|undefined>) { return { startDate:q.startDate,endDate:q.endDate,compareStartDate:q.compareStartDate,compareEndDate:q.compareEndDate,memberId:q.memberId,structureType:q.structureType as ReportScopeType|undefined,structureId:q.structureId,search:q.search,page:Number(q.page),pageSize:Number(q.pageSize),lowFrequencyThreshold:Number(q.lowFrequencyThreshold) }; }
  @Get('options') options(@CurrentUser() user:AuthenticatedUser){return this.service.options(user)}
  @Get('operational') operational(@Query() q:Record<string,string|undefined>,@CurrentUser() user:AuthenticatedUser){return this.service.operational(this.query(q),user)}
  @Get('advanced') advanced(@Query() q:Record<string,string|undefined>,@CurrentUser() user:AuthenticatedUser){return this.service.advanced(this.query(q),user)}
  @Get('history') history(@CurrentUser() user:AuthenticatedUser){return this.service.history(user)}
  @Get('export') async exportReport(@Query() q:Record<string,string|undefined>,@Query('format') format:ReportExportFormat,@CurrentUser() user:AuthenticatedUser,@Res() res:Response){const result=await this.service.export(this.query(q),format||'pdf',user);res.setHeader('Content-Type',result.mime);res.setHeader('Content-Disposition',`attachment; filename="${result.fileName}"`);res.send(result.buffer)}
}
