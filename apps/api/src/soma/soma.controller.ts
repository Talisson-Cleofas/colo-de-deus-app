import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { SomaService } from './soma.service';
import { RequirePermissions } from '../rbac/decorators/permissions.decorator';
import { RequireMinistryModule } from '../rbac/decorators/ministry-module.decorator';
import { Permission } from '../rbac/enums/permission.enum';
import { Throttle } from '@nestjs/throttler';
import {
  CheckoutInputDto,
  CreateSubscriptionDto,
  CreateContributionDto,
  MercadoPagoWebhookDto,
  UpdateSomaSettingsDto,
} from './soma.dto';

@ApiTags('Soma+')
@Controller('soma')
export class SomaController {
  constructor(private readonly service: SomaService) {}
  @Get('settings') settings() {
    return this.service.settings();
  }
  @Patch('settings')
  @RequirePermissions(Permission.SOMA_WRITE)
  @RequireMinistryModule('FINANCAS')
  updateSettings(@Body() body: UpdateSomaSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.updateSettings(body, user);
  }
  @Get('subscription/current') subscription(@CurrentUser() user: AuthenticatedUser) {
    return this.service.subscription(user);
  }
  @Post('subscription/checkout')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  createSubscription(@Body() body: CreateSubscriptionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createSubscription(body, user);
  }
  @Post('subscription/refresh')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  refreshSubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.service.refreshSubscription(user);
  }
  @Post('subscription/cancel')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  cancelSubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.service.cancelSubscription(user);
  }
  @Get('contributions') list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user);
  }
  @Post('contributions') create(
    @Body() body: CreateContributionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(body, user);
  }
  @Post('checkout') checkout(
    @Body() body: CheckoutInputDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createCheckout(body, user);
  }
  @Get('payments/my') myPayments(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMyPayments(user);
  }
  @Get('payments/report') paymentReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query('month') month?: string,
  ) {
    return this.service.paymentReport(user, month);
  }
  @Get('financial/report')
  @RequirePermissions(Permission.FINANCIAL_REPORT_READ)
  @RequireMinistryModule('FINANCAS')
  financialReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('method') method?: string,
  ) {
    return this.service.financialReport(user, { from, to, status, method });
  }
  @Get('financial/export/:format')
  @RequirePermissions(Permission.FINANCIAL_REPORT_READ)
  @RequireMinistryModule('FINANCAS')
  async export(
    @Param('format') format: 'csv' | 'xls',
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ) {
    const file = await this.service.exportReport(user, format, { from, to });
    res.setHeader(
      'Content-Type',
      format === 'xls' ? 'application/vnd.ms-excel' : 'text/csv; charset=utf-8',
    );
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-financeiro.${format}"`);
    res.send(file);
  }
  @Get('summary') summary(@Query('month') month?: string) {
    return this.service.summary(month);
  }
  @Get('receipts/:paymentId') async receipt(
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const pdf = await this.service.receipt(paymentId, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="recibo-${paymentId}.pdf"`);
    res.send(pdf);
  }
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get('receipts/:paymentId/validate')
  validateReceipt(@Param('paymentId') paymentId: string, @Query('hash') hash: string) {
    return this.service.validateReceipt(paymentId, hash);
  }
  @Post('reconciliation/run') reconcile(@CurrentUser() user: AuthenticatedUser) {
    if (!['ADMIN', 'DEVELOPER', 'MISSION_LEADER'].includes(user.profile))
      return { success: false, reason: 'Acesso restrito' };
    return this.service.reconcilePreviousDay();
  }
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Post('webhooks/mercadopago')
  @HttpCode(202)
  @Header('Cache-Control', 'no-store')
  webhook(
    @Body() body: MercadoPagoWebhookDto,
    @Headers('x-signature') signature: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Query('data.id') queryDataId: string | undefined,
    @Query('type') queryType: string | undefined,
    @Req() req: Request,
  ) {
    return this.service.receiveMercadoPagoWebhook({
      body,
      signature,
      requestId,
      queryDataId,
      queryType,
      ip: req.ip,
    });
  }
}
