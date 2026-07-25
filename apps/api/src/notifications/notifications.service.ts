import { Inject, ForbiddenException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import type { SheetRecord } from '../google/google-sheets.service';
import { NOTIFICATION_REPOSITORY, type INotificationRepository } from '../persistence/interfaces/notification-repository.interface';
import { SettingsService } from '../settings/settings.service';
import { CreateNotificationDto, UpdateNotificationPreferencesDto } from './notifications.dto';
import { NotificationDateNormalizer } from './notification-date-normalizer.service';
import type { NotificationPreferences } from './notifications.types';
import { NotificationReadEngine } from './notification-read-engine.service';
const truthy=(v:string|undefined)=>['TRUE','1','SIM','YES'].includes((v||'').trim().toUpperCase());
const bool=(v:boolean|undefined,d=true)=>v===undefined?d:v;
@Injectable()
export class NotificationsService implements OnModuleInit,OnModuleDestroy {
 private timer?:NodeJS.Timeout;
 constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly sheets: INotificationRepository, private readonly settings:SettingsService, private readonly dates:NotificationDateNormalizer, private readonly readEngine:NotificationReadEngine){}
 onModuleInit(){if(!this.sheets.isDemo())this.timer=setInterval(()=>void this.processAutomations(),60*60*1000);}
 onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
 private uid(user:AuthenticatedUser){return user.memberId||user.id||user.uid;}
 private canCreate(user:AuthenticatedUser){return ['DEVELOPER','ADMIN','MINISTRY_LEADER','CELL_LEADER'].includes(user.profile);}
 private async rows(tab:string){if(this.sheets.isDemo())return [];return this.sheets.read(tab);}
 private async context(){const [members,ministries,cells,cenacles]=await Promise.all([this.rows('Membros'),this.rows('Ministérios'),this.rows('Células'),this.rows('Cenáculos')]);return {members,ministries,cells,cenacles};}
 async state(user:AuthenticatedUser){return this.readEngine.state(user,await this.preferences(user));}
 async list(user:AuthenticatedUser){return this.state(user);}
 async create(dto:CreateNotificationDto,user:AuthenticatedUser){if(!this.canCreate(user))throw new ForbiddenException('Você não possui permissão para enviar notificações.');return this.createRecord(dto,{id:this.uid(user),name:user.name});}
 async createSystem(dto:CreateNotificationDto){return this.createRecord(dto,{id:'SYSTEM',name:'Sistema'});}
 private async createRecord(dto:CreateNotificationDto,sender:{id:string;name:string}){const id=randomUUID(),now=new Date().toISOString(),recipients=(dto.recipientIds||[]).join(',');const record={id,titulo:dto.title.trim(),mensagem:dto.message.trim(),tipo:dto.type,publico:dto.audience,publico_id:dto.audienceId||'',origem:dto.origin||'Automática',referencia_tipo:dto.referenceType||'',referencia_id:dto.referenceId||'',link:dto.link||'',destinatarios:recipients,destinatario_id:dto.audience==='INDIVIDUAL'?recipients:'',enviado_por:sender.id,enviado_por_nome:sender.name,icone:'notifications',prioridade:'MEDIA',canal:'APP',data_envio:now,agendada_para:'',expira_em:'',ativo:'TRUE',criado_em:now,atualizado_em:now};if(!this.sheets.isDemo()){await this.sheets.appendRecord('Notificações',record);for(const memberId of dto.recipientIds||[])await this.logDelivery(id,memberId,'APP','ENVIADA',1,'');}return {notification:record,message:'Notificação enviada com sucesso.'};}
 async preferences(user:AuthenticatedUser):Promise<NotificationPreferences>{const row=(await this.rows('NotificacoesPreferencias')).find(r=>r.membro_id===this.uid(user));return {events:row?truthy(row.eventos):true,confirmations:row?truthy(row.confirmacoes):true,justifications:row?truthy(row.justificativas):true,memberships:row?truthy(row.vinculos):true,leadership:row?truthy(row.lideranca):true,birthdays:row?truthy(row.aniversarios):true,birthdayAdvance:row?truthy(row.aniversario_antecipado):true,app:row?truthy(row.app):true,push:row?truthy(row.push):false,sendTime:row?.horario_envio||'08:00',firebaseToken:row?.firebase_token||''};}
 async updatePreferences(dto:UpdateNotificationPreferencesDto,user:AuthenticatedUser){const rows=await this.rows('NotificacoesPreferencias'),existing=rows.find(r=>r.membro_id===this.uid(user)),current=await this.preferences(user),next={...current,...dto},now=new Date().toISOString(),record={id:existing?.id||randomUUID(),membro_id:this.uid(user),eventos:bool(next.events)?'TRUE':'FALSE',confirmacoes:bool(next.confirmations)?'TRUE':'FALSE',justificativas:bool(next.justifications)?'TRUE':'FALSE',vinculos:bool(next.memberships)?'TRUE':'FALSE',lideranca:bool(next.leadership)?'TRUE':'FALSE',aniversarios:bool(next.birthdays)?'TRUE':'FALSE',aniversario_antecipado:bool(next.birthdayAdvance)?'TRUE':'FALSE',app:bool(next.app)?'TRUE':'FALSE',push:bool(next.push,false)?'TRUE':'FALSE',horario_envio:next.sendTime||'08:00',firebase_token:next.firebaseToken||'',ativo:'TRUE',criado_em:existing?.criado_em||now,atualizado_em:now};if(!this.sheets.isDemo()){if(existing)await this.sheets.updateRecord('NotificacoesPreferencias','id',existing.id,record);else await this.sheets.appendRecord('NotificacoesPreferencias',record);}return {preferences:next,message:'Preferências atualizadas.'};}
 async markRead(id:string,user:AuthenticatedUser,read=true){
  const current=await this.state(user);
  if(!current.notifications.some(item=>item.id===id))throw new NotFoundException('Notificação não encontrada.');
  if(!this.sheets.isDemo()){
   const memberId=this.readEngine.memberId(user),rows=await this.sheets.read('NotificacoesLeituras');
   const existing=rows.find(row=>row.notificacao_id===id&&row.membro_id===memberId),now=new Date().toISOString();
   const payload={notificacao_id:id,membro_id:memberId,lida:read?'TRUE':'FALSE',data_leitura:read?now:'',lida_em:read?now:'',atualizado_em:now};
   if(existing)await this.sheets.updateRecord('NotificacoesLeituras','id',existing.id,{...existing,...payload});
   else await this.sheets.appendRecord('NotificacoesLeituras',{id:randomUUID(),...payload,criado_em:now});
  }
  const state=await this.state(user);
  return {success:true,notificationId:id,unreadCount:state.unreadCount,state};
 }
 async markAll(user:AuthenticatedUser){
  const current=await this.state(user),pending=current.notifications.filter(item=>!item.read);
  if(!this.sheets.isDemo()){
   const memberId=this.readEngine.memberId(user),rows=await this.sheets.read('NotificacoesLeituras'),now=new Date().toISOString();
   for(const item of pending){
    const existing=rows.find(row=>row.notificacao_id===item.id&&row.membro_id===memberId);
    const payload={notificacao_id:item.id,membro_id:memberId,lida:'TRUE',data_leitura:now,lida_em:now,atualizado_em:now};
    if(existing)await this.sheets.updateRecord('NotificacoesLeituras','id',existing.id,{...existing,...payload});
    else await this.sheets.appendRecord('NotificacoesLeituras',{id:randomUUID(),...payload,criado_em:now});
   }
  }
  const state=await this.state(user);
  return {success:true,updated:pending.length,unreadCount:state.unreadCount,state};
 }
 async remove(id:string,user:AuthenticatedUser){const rows=await this.rows('Notificações'),row=rows.find(r=>r.id===id);if(!row)throw new NotFoundException('Notificação não encontrada.');if(!['DEVELOPER','MISSION_LEADER','ADMIN'].includes(user.profile)&&row.enviado_por!==this.uid(user))throw new ForbiddenException('Você não pode excluir esta notificação.');if(!this.sheets.isDemo())await this.sheets.updateRecord('Notificações','id',id,{...row,ativo:'FALSE',atualizado_em:new Date().toISOString()});return {success:true};}
 async options(user:AuthenticatedUser){const ctx=await this.context(),uid=this.uid(user);const members=ctx.members.filter(m=>!m.ativo||truthy(m.ativo)).map(m=>({id:m.id,name:m.nome,email:m.email,profile:m.perfil,ministry:m.ministerio,cell:m.celula}));return {members:['DEVELOPER','MISSION_LEADER','ADMIN'].includes(user.profile)?members:members.filter(m=>m.ministry===user.ministry||m.cell===user.cell||m.id===uid),ministries:ctx.ministries.map(m=>({id:m.id,name:m.nome})),cells:ctx.cells.map(c=>({id:c.id,name:c.nome,ministryId:c.ministerio_id})),cenacles:ctx.cenacles.map(c=>({id:c.id,name:c.nome,ministryId:c.ministerio_id,cellId:c.celula_id})),profiles:['DEVELOPER','MISSION_LEADER','MINISTRY_LEADER','CELL_LEADER','MEMBER']};}
 private async logDelivery(notificationId:string,memberId:string,channel:string,status:string,attempt:number,error:string){const now=new Date().toISOString();await this.sheets.appendRecord('NotificacoesEntregas',{id:randomUUID(),notificacao_id:notificationId,membro_id:memberId,canal:channel,status,tentativa:String(attempt),erro:error,enviado_em:status==='ENVIADA'?now:'',criado_em:now,atualizado_em:now});}
 async deliveryHistory(user:AuthenticatedUser){if(!['DEVELOPER','MISSION_LEADER','ADMIN'].includes(user.profile))throw new ForbiddenException('Acesso restrito.');const items=(await this.rows('NotificacoesEntregas')).map(r=>this.dates.normalizeFields(r,['criado_em','atualizado_em','enviado_em'])).sort((a,b)=>(this.dates.timestamp(b.criado_em)??Number.NEGATIVE_INFINITY)-(this.dates.timestamp(a.criado_em)??Number.NEGATIVE_INFINITY));return {items};}
 async processAutomations(){
  if(this.sheets.isDemo())return {processed:0,executedAt:new Date().toISOString()};
  const settings=await this.settings.get();
  if(!settings.birthdaysEnabled||!settings.birthdayNotificationsEnabled)return {processed:0,disabled:true,executedAt:new Date().toISOString()};
  const [members,existing]=await Promise.all([this.sheets.read('Membros'),this.sheets.read('Notificações')]);
  const today=new Date();
  const reminderDays=Math.max(0,Math.min(30,settings.birthdayReminderDays));
  const target=new Date(today.getFullYear(),today.getMonth(),today.getDate()+reminderDays);
  const leaders=members.filter(m=>['DEVELOPER','ADMIN','MINISTRY_LEADER','CELL_LEADER'].includes((m.perfil||'').trim().toUpperCase())).map(m=>m.id).filter(Boolean);
  const parse=(value:string)=>{const text=(value||'').trim();const iso=text.match(/^\d{4}-(\d{1,2})-(\d{1,2})/);if(iso)return {month:Number(iso[1]),day:Number(iso[2])};const br=text.match(/^(\d{1,2})\/(\d{1,2})\/\d{4}/);return br?{month:Number(br[2]),day:Number(br[1])}:null;};
  const same=(birth:{month:number;day:number}|null,date:Date)=>!!birth&&birth.month===date.getMonth()+1&&birth.day===date.getDate();
  const format=(template:string,member:SheetRecord,days:number)=>template.replaceAll('{nome}',member.nome||'Membro').replaceAll('{dias}',String(days));
  let processed=0;
  for(const member of members.filter(x=>!x.ativo||truthy(x.ativo))){
   const birth=parse(member.data_nascimento||'');
   if(!birth)continue;
   if(same(birth,today)){
    const key=`birthday-day-${today.toISOString().slice(0,10)}-${member.id}`;
    if(!existing.some(n=>n.referencia_id===key)){
     const audience=settings.birthdayNotificationAudience==='LEADERS'?'INDIVIDUAL':'TODOS';
     await this.createSystem({title:`Hoje é aniversário de ${member.nome||'um membro'}! 🎉`,message:format(settings.birthdayDefaultMessage,member,0),type:'ANIVERSARIO',audience,recipientIds:audience==='INDIVIDUAL'?leaders:undefined,origin:'Aniversários',referenceType:'MEMBRO',referenceId:key,link:`/membros/${member.id}`});processed++;
    }
   }
   if(reminderDays>0&&same(birth,target)){
    const key=`birthday-reminder-${target.toISOString().slice(0,10)}-${member.id}`;
    if(!existing.some(n=>n.referencia_id===key)){
     await this.createSystem({title:`Aniversário em ${reminderDays} dia(s)`,message:format(settings.birthdayLeaderReminderMessage,member,reminderDays),type:'ANIVERSARIO',audience:'INDIVIDUAL',recipientIds:leaders,origin:'Aniversários',referenceType:'MEMBRO',referenceId:key,link:`/membros/${member.id}`});processed++;
    }
   }
  }
  return {processed,executedAt:new Date().toISOString()};
 }
}
