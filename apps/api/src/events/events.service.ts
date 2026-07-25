import { Inject, BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { EVENT_REPOSITORY, type IEventRepository } from '../persistence/interfaces/event-repository.interface';
import { GeocodingService } from '../google-maps/geocoding.service';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import type { CreateEventDto, EventResponseDto, UpdateEventDto } from './event-response.dto';
import type { EventResponse, EventScope, MissionEvent } from './events.types';
@Injectable()
export class EventsService {
  constructor(@Inject(EVENT_REPOSITORY) private readonly sheets: IEventRepository, private readonly geocoding:GeocodingService, private readonly drive:GoogleDriveService) {}
  private uid(user:AuthenticatedUser){return user.memberId||user.id;}
  private validDateOnly(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;const [y,m,d]=value.split('-').map(Number);const parsed=new Date(Date.UTC(y,m-1,d));return parsed.getUTCFullYear()===y&&parsed.getUTCMonth()===m-1&&parsed.getUTCDate()===d;}
  private split(value:string){const raw=String(value||'').trim();if(!raw)return {date:'',time:''};const normalized=raw.includes(' ')?raw.replace(' ','T'):raw;const [date,time='']=normalized.split('T');if(!this.validDateOnly(date))return {date:'',time:''};return {date,time:/^([01]\d|2[0-3]):[0-5]\d/.test(time)?time.slice(0,5):''};}
  private combine(date:string,time:string){const cleanDate=String(date||'').trim(),cleanTime=String(time||'').trim();if(!this.validDateOnly(cleanDate))throw new BadRequestException('Informe uma data válida no formato YYYY-MM-DD.');if(cleanTime&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(cleanTime))throw new BadRequestException('Informe um horário válido no formato HH:mm.');return `${cleanDate}T${cleanTime||'00:00'}:00`;}
  private validatePeriod(startDate:string,endDate:string){if(endDate&&endDate<startDate)throw new BadRequestException('A data final não pode ser anterior à data inicial.');}
  private async context(){
    const [events,ministries,cells,cenacles,members]=await Promise.all([
      this.sheets.read('Eventos'),this.sheets.read('Ministérios'),this.sheets.read('Células'),this.sheets.read('Cenáculos'),this.sheets.listMembers()
    ]);
    return {events,ministries,cells,cenacles,members,
      ministryMap:new Map(ministries.map(r=>[r.id,r.nome||''])),cellMap:new Map(cells.map(r=>[r.id,r.nome||''])),cenacleMap:new Map(cenacles.map(r=>[r.id,r.nome||'']))};
  }
  private rowMinistryId(row:Record<string,string>,ctx:Awaited<ReturnType<EventsService['context']>>):string {
    if(row.ministerio_id)return row.ministerio_id;
    if(row.celula_id)return ctx.cells.find(c=>c.id===row.celula_id)?.ministerio_id||'';
    if(row.cenaculo_id){const cenacle=ctx.cenacles.find(c=>c.id===row.cenaculo_id);return cenacle?.ministerio_id||ctx.cells.find(c=>c.id===cenacle?.celula_id)?.ministerio_id||'';}
    return '';
  }
  private ownedMinistryIds(user:AuthenticatedUser,ctx:Awaited<ReturnType<EventsService['context']>>):Set<string>{
    const uid=this.uid(user);return new Set(ctx.ministries.filter(m=>m.lider_id===uid||m.vice_lider_id===uid||Boolean(user.ministry&&m.nome===user.ministry)).map(m=>m.id));
  }
  private scope(row:Record<string,string>):EventScope{
    if(row.cenaculo_id)return 'CENACULO'; if(row.celula_id)return 'CELULA'; if(row.ministerio_id)return 'MINISTERIO'; return 'GERAL';
  }
  private canManageRow(user:AuthenticatedUser,row:Record<string,string>,ctx:Awaited<ReturnType<EventsService['context']>>){
    if(user.profile==='MEMBER')return false;
    const uid=this.uid(user); if(['DEVELOPER','MISSION_LEADER','ADMIN'].includes(user.profile))return true;
    if(row.criado_por===uid)return true;
    if(row.ministerio_id){const m=ctx.ministries.find(x=>x.id===row.ministerio_id);if(m&&(m.lider_id===uid||m.vice_lider_id===uid))return true;}
    if(row.celula_id){const c=ctx.cells.find(x=>x.id===row.celula_id);if(c&&(c.lider_id===uid||c.vice_lider_id===uid))return true;}
    if(row.cenaculo_id){const c=ctx.cenacles.find(x=>x.id===row.cenaculo_id);if(c&&(c.responsavel_id===uid||c.vice_responsavel_id===uid))return true;}
    return false;
  }
  private mapEvent(row:Record<string,string>,ctx:Awaited<ReturnType<EventsService['context']>>,user?:AuthenticatedUser):MissionEvent{
    const start=this.split(row.inicio||row.data||''),end=this.split(row.fim||row.data_fim||'');
    return {id:row.id||'',title:row.titulo||'',description:row.descricao||'',startDate:start.date,endDate:end.date||start.date,startTime:start.time,endTime:end.time,
      location:row.local||'',address:row.endereco||'',category:row.tipo||'GERAL',scope:this.scope(row),ministryId:row.ministerio_id||'',ministry:ctx.ministryMap.get(row.ministerio_id||'')||'',cellId:row.celula_id||'',cellName:ctx.cellMap.get(row.celula_id||'')||'',cenacleId:row.cenaculo_id||'',cenacleName:ctx.cenacleMap.get(row.cenaculo_id||'')||'',capacity:Number(row.limite_participantes||0),registrationUrl:'',image:row.imagem||'',confirmationRequired:this.sheets.parseActive(row.confirmacao_obrigatoria||''),published:this.sheets.parseActive(row.publicado||''),featured:false,active:!row.deleted_at&&this.sheets.parseActive(row.ativo||'',true),createdBy:row.created_by||row.criado_por||'',createdAt:row.created_at||row.criado_em||'',updatedAt:row.updated_at||row.atualizado_em||'',canManage:user?this.canManageRow(user,row,ctx):false};
  }
  async list(filters:{month?:string;category?:string;scope?:string;search?:string},user:AuthenticatedUser){
    if(this.sheets.isDemo())return [];
    const ctx=await this.context();const search=filters.search?.trim().toLowerCase();ctx.events=ctx.events.filter(r=>!r.deleted_at);const owned=user.profile==='MINISTRY_LEADER'?this.ownedMinistryIds(user,ctx):null;const rows=owned?ctx.events.filter(r=>owned.has(this.rowMinistryId(r,ctx))):ctx.events;
    return rows.map(r=>({row:r,event:this.mapEvent(r,ctx,user)})).filter(({event})=>event.published||event.canManage)
      .map(x=>x.event).filter(e=>!filters.month||e.startDate.startsWith(filters.month)).filter(e=>!filters.category||e.category===filters.category)
      .filter(e=>!filters.scope||e.scope===filters.scope).filter(e=>!search||[e.title,e.description,e.location,e.category,e.ministry,e.cellName,e.cenacleName].some(v=>v.toLowerCase().includes(search)))
      .sort((a,b)=>`${a.startDate}T${a.startTime}`.localeCompare(`${b.startDate}T${b.startTime}`));
  }
  async findOne(id:string,user:AuthenticatedUser){const item=(await this.list({},user)).find(e=>e.id===id);if(!item)throw new NotFoundException('Evento não encontrado.');return item;}
  async categories(user:AuthenticatedUser){return [...new Set((await this.list({},user)).map(e=>e.category).filter(Boolean))].sort();}
  async options(user:AuthenticatedUser){
    if(user.profile==='MEMBER')return {canCreate:false,canCreateGeneral:false,ministries:[],cells:[],cenacles:[]};
    const ctx=await this.context(),uid=this.uid(user);const admin=['DEVELOPER','MISSION_LEADER','ADMIN'].includes(user.profile);
    const ministries=ctx.ministries.filter(r=>admin||r.lider_id===uid||r.vice_lider_id===uid).map(r=>({id:r.id,name:r.nome||''}));
    const ministryIds=new Set(ministries.map(m=>m.id));
    const cells=ctx.cells.filter(r=>admin||r.lider_id===uid||r.vice_lider_id===uid||ministryIds.has(r.ministerio_id)).map(r=>({id:r.id,name:r.nome||'',ministryId:r.ministerio_id||''}));
    const cellIds=new Set(cells.map(c=>c.id));
    const cenacles=ctx.cenacles.filter(r=>admin||r.responsavel_id===uid||r.vice_responsavel_id===uid||ministryIds.has(r.ministerio_id)||cellIds.has(r.celula_id)).map(r=>({id:r.id,name:r.nome||'',ministryId:r.ministerio_id||'',cellId:r.celula_id||''}));
    return {canCreate:admin||ministries.length>0||cells.length>0||cenacles.length>0,canCreateGeneral:admin,ministries,cells,cenacles};
  }
  private async assertScope(dto:CreateEventDto,user:AuthenticatedUser){
    const opts=await this.options(user);if(!opts.canCreate)throw new ForbiddenException('Seu perfil não possui responsabilidade para criar eventos.');
    if(dto.scope==='GERAL'&&!opts.canCreateGeneral)throw new ForbiddenException('Somente ADMIN pode criar eventos gerais.');
    if(dto.scope==='MINISTERIO'&&!opts.ministries.some(x=>x.id===dto.ministryId))throw new ForbiddenException('Você só pode criar evento para um ministério sob sua responsabilidade.');
    if(dto.scope==='CELULA'&&!opts.cells.some(x=>x.id===dto.cellId))throw new ForbiddenException('Você só pode criar evento para uma célula sob sua responsabilidade.');
    if(dto.scope==='CENACULO'&&!opts.cenacles.some(x=>x.id===dto.cenacleId))throw new ForbiddenException('Você só pode criar evento para um cenáculo sob sua responsabilidade.');
  }
  private async location(address:string){if(!address?.trim())return {latitude:'',longitude:'',google_place_id:'',localizacao_atualizada_em:''};try{const g=await this.geocoding.geocode(address);return {latitude:g.latitude,longitude:g.longitude,google_place_id:g.placeId,localizacao_atualizada_em:new Date().toISOString(),endereco:g.formattedAddress};}catch{return {latitude:'',longitude:'',google_place_id:'',localizacao_atualizada_em:''};}}
  async create(dto:CreateEventDto,user:AuthenticatedUser){
    if(user.profile==='MEMBER')throw new ForbiddenException('Membros possuem acesso somente para visualizar os detalhes dos eventos.');
    await this.assertScope(dto,user);this.validatePeriod(dto.startDate,dto.endDate||dto.startDate);const id=randomUUID(),now=new Date().toISOString();const geo=await this.location(dto.address);let folder='';try{folder=(await this.drive.ensureReferenceFolder('EVENT_FILE',id,dto.title)).id;}catch{}
    const payload={id,missao_id:'missao-brasilia',titulo:dto.title.trim(),descricao:dto.description.trim(),tipo:(dto.category||'GERAL').toUpperCase(),ministerio_id:dto.scope==='MINISTERIO'?dto.ministryId:'',celula_id:dto.scope==='CELULA'?dto.cellId:'',cenaculo_id:dto.scope==='CENACULO'?dto.cenacleId:'',local:dto.location,endereco:geo.endereco||dto.address,latitude:geo.latitude,longitude:geo.longitude,google_place_id:geo.google_place_id,localizacao_atualizada_em:geo.localizacao_atualizada_em,inicio:this.combine(dto.startDate,dto.startTime),fim:this.combine(dto.endDate||dto.startDate,dto.endTime),imagem:dto.image,imagem_drive_file_id:'',imagem_url:'',pasta_drive_id:folder,limite_participantes:dto.capacity,confirmacao_obrigatoria:dto.confirmationRequired?'TRUE':'FALSE',publicado:dto.published?'TRUE':'FALSE',criado_por:this.uid(user),criado_em:now,atualizado_em:now,ativo:'TRUE',deleted_at:'',deleted_by:'',created_at:now,created_by:this.uid(user),updated_at:now,updated_by:this.uid(user)};
    await this.sheets.appendRecord('Eventos',payload);return {event:await this.findOne(id,user),message:'Evento criado com geolocalização e pasta do Drive preparadas.'};
  }
  async update(id:string,dto:UpdateEventDto,user:AuthenticatedUser){
    if(user.profile==='MEMBER')throw new ForbiddenException('Membros não podem editar eventos.');
    const ctx=await this.context(),row=ctx.events.find(r=>r.id===id);if(!row)throw new NotFoundException('Evento não encontrado.');if(!this.canManageRow(user,row,ctx))throw new ForbiddenException('Você não pode editar este evento.');
    const merged={...this.mapEvent(row,ctx,user),...dto};await this.assertScope(merged as CreateEventDto,user);this.validatePeriod(merged.startDate,merged.endDate||merged.startDate);const now=new Date().toISOString();const changed=(merged.address||'').trim()!==(row.endereco||'').trim();const geo=changed?await this.location(merged.address||''):{latitude:row.latitude,longitude:row.longitude,google_place_id:row.google_place_id,localizacao_atualizada_em:row.localizacao_atualizada_em,endereco:row.endereco};
    await this.sheets.updateRecord('Eventos','id',id,{...row,titulo:merged.title.trim(),descricao:merged.description||'',tipo:(merged.category||'GERAL').toUpperCase(),ministerio_id:merged.scope==='MINISTERIO'?merged.ministryId:'',celula_id:merged.scope==='CELULA'?merged.cellId:'',cenaculo_id:merged.scope==='CENACULO'?merged.cenacleId:'',local:merged.location||'',endereco:geo.endereco||merged.address||'',latitude:geo.latitude,longitude:geo.longitude,google_place_id:geo.google_place_id,localizacao_atualizada_em:geo.localizacao_atualizada_em,inicio:this.combine(merged.startDate,merged.startTime),fim:this.combine(merged.endDate||merged.startDate,merged.endTime),imagem:merged.image||'',limite_participantes:merged.capacity||0,confirmacao_obrigatoria:merged.confirmationRequired?'TRUE':'FALSE',publicado:merged.published?'TRUE':'FALSE',atualizado_em:now,updated_at:now,updated_by:this.uid(user)});
    return {event:await this.findOne(id,user),message:'Evento atualizado com sucesso.'};
  }
  async remove(id:string,user:AuthenticatedUser){if(user.profile==='MEMBER')throw new ForbiddenException('Membros não podem excluir eventos.');const ctx=await this.context(),row=ctx.events.find(r=>r.id===id);if(!row)throw new NotFoundException('Evento não encontrado.');if(!this.canManageRow(user,row,ctx))throw new ForbiddenException('Você não pode excluir este evento.');await this.sheets.softDeleteRecord('Eventos',id,this.uid(user));return {success:true,message:'Evento movido para a lixeira.'};}
  async restore(id:string,user:AuthenticatedUser){if(user.profile==='MEMBER')throw new ForbiddenException('Membros não podem restaurar eventos.');const rows=await this.sheets.read('Eventos'),row=rows.find(r=>r.id===id);if(!row)throw new NotFoundException('Evento não encontrado.');const ctx=await this.context();if(!this.canManageRow(user,row,ctx))throw new ForbiddenException('Você não pode restaurar este evento.');await this.sheets.restoreRecord('Eventos',id,this.uid(user));return {success:true,message:'Evento restaurado com sucesso.'};}
  async trash(user:AuthenticatedUser){const ctx=await this.context();return ctx.events.filter(r=>Boolean(r.deleted_at)&&this.canManageRow(user,r,ctx)).map(r=>({...this.mapEvent(r,ctx,user),deletedAt:r.deleted_at,deletedBy:r.deleted_by}));}
  async setPublication(id:string,published:boolean,user:AuthenticatedUser){
    if(user.profile==='MEMBER')throw new ForbiddenException('Membros não podem publicar ou despublicar eventos.');
    const ctx=await this.context(),row=ctx.events.find(r=>r.id===id);if(!row)throw new NotFoundException('Evento não encontrado.');if(!this.canManageRow(user,row,ctx))throw new ForbiddenException('Você não pode publicar este evento.');
    await this.sheets.updateRecord('Eventos','id',id,{...row,publicado:published?'TRUE':'FALSE',atualizado_em:new Date().toISOString()});return {success:true,published};
  }
  private async recipientIds(event:MissionEvent,user:AuthenticatedUser){
    const ctx=await this.context();if(event.scope==='MINISTERIO'){const r=ctx.ministries.find(x=>x.id===event.ministryId);return [r?.lider_id,r?.vice_lider_id].filter(Boolean) as string[];}
    if(event.scope==='CELULA'){const r=ctx.cells.find(x=>x.id===event.cellId);return [r?.lider_id,r?.vice_lider_id].filter(Boolean) as string[];}
    if(event.scope==='CENACULO'){const r=ctx.cenacles.find(x=>x.id===event.cenacleId);return [r?.responsavel_id,r?.vice_responsavel_id].filter(Boolean) as string[];}
    return ctx.members.filter(m=>m.active&&m.profile==='ADMIN').map(m=>m.id);
  }
  async respond(eventId:string,dto:EventResponseDto,user:AuthenticatedUser){
    const event=await this.findOne(eventId,user);if(!event.published)throw new ForbiddenException('Este evento ainda não foi publicado.');if(dto.status==='JUSTIFIED'&&!dto.justification.trim())throw new ForbiddenException('Informe a justificativa da ausência.');
    const rows=await this.sheets.read('ConfirmacoesEventos'),existing=rows.find(r=>r.evento_id===eventId&&r.membro_id===this.uid(user));const now=new Date().toISOString(),recipients=await this.recipientIds(event,user);
    const payload={evento_id:eventId,membro_id:this.uid(user),status:dto.status==='CONFIRMED'?'CONFIRMADO':'NAO_COMPARECERA',justificativa:dto.justification.trim(),ministerio_id:event.ministryId,destinatarios:recipients.join(','),visualizado:'FALSE',respondido_por:'',respondido_em:'',situacao:'PENDENTE',atualizado_em:now};
    if(existing)await this.sheets.updateRecord('ConfirmacoesEventos','id',existing.id,{...existing,...payload});else await this.sheets.appendRecord('ConfirmacoesEventos',{id:randomUUID(),...payload,criado_em:now});
    return {message:dto.status==='CONFIRMED'?'Presença confirmada.':'Justificativa enviada aos responsáveis.'};
  }
  async inbox(user:AuthenticatedUser):Promise<EventResponse[]> {
    if(this.sheets.isDemo())return [];const ctx=await this.context(),rows=await this.sheets.read('ConfirmacoesEventos'),eventMap=new Map(ctx.events.map(r=>[r.id,this.mapEvent(r,ctx,user)])),memberMap=new Map(ctx.members.map(m=>[m.id,m]));
    return rows.filter(r=>{const e=eventMap.get(r.evento_id||'');return e&&(['DEVELOPER','MISSION_LEADER','ADMIN'].includes(user.profile)||e.canManage||r.membro_id===this.uid(user));}).map(r=>{const e=eventMap.get(r.evento_id||'')!,m=memberMap.get(r.membro_id||'');return {id:r.id||'',eventId:e.id,eventTitle:e.title,memberId:r.membro_id||'',memberName:m?.name||'',memberEmail:m?.email||'',memberMinistry:m?.ministry||'',status:r.status==='CONFIRMADO'?'CONFIRMED':'JUSTIFIED',justification:r.justificativa||'',recipientEmails:[],createdAt:r.criado_em||''};});
  }
}
