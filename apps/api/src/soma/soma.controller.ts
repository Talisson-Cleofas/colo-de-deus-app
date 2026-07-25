import { Body, Controller, Get, Header, Headers, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { SomaService } from './soma.service';
import type { CheckoutInput, MercadoPagoWebhookBody } from './soma.types';

@ApiTags('Soma+')
@Controller('soma')
export class SomaController {
 constructor(private readonly service:SomaService){}
 @Get('settings') settings(){return this.service.settings()}
 @Patch('settings') updateSettings(@Body() body:Record<string,unknown>,@CurrentUser() user:AuthenticatedUser){return this.service.updateSettings(body,user)}
 @Get('subscription/current') subscription(@CurrentUser() user:AuthenticatedUser){return this.service.subscription(user)}
 @Get('contributions') list(@CurrentUser() user:AuthenticatedUser){return this.service.list(user)}
 @Post('contributions') create(@Body() body:Record<string,unknown>){return this.service.create(body)}
 @Post('checkout') checkout(@Body() body:CheckoutInput,@CurrentUser() user:AuthenticatedUser){return this.service.createCheckout(body,user)}
 @Get('payments/my') myPayments(@CurrentUser() user:AuthenticatedUser){return this.service.listMyPayments(user)}
 @Get('payments/report') paymentReport(@CurrentUser() user:AuthenticatedUser,@Query('month') month?:string){return this.service.paymentReport(user,month)}
 @Get('financial/report') financialReport(@CurrentUser() user:AuthenticatedUser,@Query('from') from?:string,@Query('to') to?:string,@Query('status') status?:string,@Query('method') method?:string){return this.service.financialReport(user,{from,to,status,method})}
 @Get('financial/export/:format') async export(@Param('format') format:'csv'|'xls',@CurrentUser() user:AuthenticatedUser,@Query('from') from:string|undefined,@Query('to') to:string|undefined,@Res() res:Response){const file=await this.service.exportReport(user,format,{from,to});res.setHeader('Content-Type',format==='xls'?'application/vnd.ms-excel':'text/csv; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="relatorio-financeiro.${format}"`);res.send(file)}
 @Get('summary') summary(@Query('month') month?:string){return this.service.summary(month)}
 @Get('receipts/:paymentId') async receipt(@Param('paymentId') paymentId:string,@CurrentUser() user:AuthenticatedUser,@Res() res:Response){const pdf=await this.service.receipt(paymentId,user);res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="recibo-${paymentId}.pdf"`);res.send(pdf)}
 @Public() @Get('receipts/:paymentId/validate') validateReceipt(@Param('paymentId') paymentId:string,@Query('hash') hash:string){return this.service.validateReceipt(paymentId,hash)}
 @Post('reconciliation/run') reconcile(@CurrentUser() user:AuthenticatedUser){if(!['ADMIN','DEVELOPER','MISSION_LEADER'].includes(user.profile))return{success:false,reason:'Acesso restrito'};return this.service.reconcilePreviousDay()}
 @Public() @Post('webhooks/mercadopago') @Header('Cache-Control','no-store') webhook(@Body() body:MercadoPagoWebhookBody,@Headers('x-signature') signature:string|undefined,@Headers('x-request-id') requestId:string|undefined,@Query('data.id') queryDataId:string|undefined,@Query('type') queryType:string|undefined,@Req() req:Request){return this.service.receiveMercadoPagoWebhook({body,signature,requestId,queryDataId,queryType,headers:req.headers,ip:req.ip})}
}
