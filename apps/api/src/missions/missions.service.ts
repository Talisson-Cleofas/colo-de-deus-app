import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GoogleSheetsService } from '../google/google-sheets.service';
import type { CreateMissionDto, UpdateMissionDto } from './mission.dto';
import type { MissionRecord } from './missions.types';

const DEFAULT_MISSION_ID = 'missao-brasilia';
const DEFAULT_MINISTRIES = ['Música','Missões','Eventos','Finanças','Células','Cenáculo','Comunicação','Intercessão'];

@Injectable()
export class MissionsService implements OnModuleInit {
  private readonly logger = new Logger(MissionsService.name);
  constructor(private readonly sheets: GoogleSheetsService) {}
  async onModuleInit() { try { await this.ensureDefaultStructure(); } catch (error) { this.logger.warn(`Seed organizacional pendente: ${error instanceof Error ? error.message : error}`); } }
  private parse(row: Record<string,string>, ministriesCount = 0): MissionRecord {
    return { id:row.id||'', name:row.nome||'', acronym:row.sigla||'', description:row.descricao||'', city:row.cidade||'', state:row.estado||'', country:row.pais||'Brasil', responsibleId:row.responsavel_id||'', active:this.sheets.parseActive(row.ativo||'',true), createdAt:row.criado_em||'', updatedAt:row.atualizado_em||'', ministriesCount };
  }
  private demoMission(): MissionRecord { return { id:DEFAULT_MISSION_ID,name:'Missão Brasília',acronym:'BSB',description:'Missão Brasília da Comunidade Católica Colo de Deus',city:'Brasília',state:'DF',country:'Brasil',responsibleId:'',active:true,createdAt:'',updatedAt:'',ministriesCount:DEFAULT_MINISTRIES.length }; }
  async ensureDefaultStructure() {
    if (this.sheets.isDemo()) return { missionCreated:false, ministriesCreated:0, demo:true };
    const now=new Date().toISOString(); const missions=await this.sheets.read('Missao');
    if(!missions.some(r=>r.id===DEFAULT_MISSION_ID)) await this.sheets.appendRecord('Missao',{id:DEFAULT_MISSION_ID,nome:'Missão Brasília',sigla:'BSB',descricao:'Missão Brasília da Comunidade Católica Colo de Deus',cidade:'Brasília',estado:'DF',pais:'Brasil',responsavel_id:'',ativo:'TRUE',criado_em:now,atualizado_em:now});
    const ministries=await this.sheets.read('Ministérios'); let created=0;
    for (const [index,name] of DEFAULT_MINISTRIES.entries()) { if(!ministries.some(r=>(r.nome||'').trim().toLowerCase()===name.toLowerCase())) { await this.sheets.appendRecord('Ministérios',{id:randomUUID(),missao_id:DEFAULT_MISSION_ID,nome:name,descricao:`Ministério de ${name}`,lider_id:'',vice_lider_id:'',cor:'#9e6939',icone:'',tipo:name.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''),ordem:index+1,ativo:'TRUE',observacoes:'Criado automaticamente pela Sprint 4.5.2',criado_em:now,atualizado_em:now}); created++; } }
    const backfilled = await this.backfillMissionHierarchy();
    return { missionCreated:!missions.some(r=>r.id===DEFAULT_MISSION_ID), ministriesCreated:created, backfilled, demo:false };
  }
  private async backfillMissionHierarchy() {
    let updated=0;
    for (const sheet of ['Usuarios','Eventos','Células','Cenáculos'] as const) {
      const rows=await this.sheets.read(sheet);
      for (const row of rows) {
        if (!row.id || row.missao_id) continue;
        await this.sheets.updateRecord(sheet,'id',row.id,{...row,missao_id:DEFAULT_MISSION_ID,atualizado_em:new Date().toISOString()});
        updated++;
      }
    }
    return updated;
  }
  async list(): Promise<MissionRecord[]> { const rows=await this.sheets.read('Missao'); if(!rows.length&&this.sheets.isDemo()) return [this.demoMission()]; const ministries=await this.sheets.read('Ministérios'); return rows.map(r=>this.parse(r,ministries.filter(m=>m.missao_id===r.id).length)).filter(m=>m.id&&m.name); }
  async get(id:string) { const item=(await this.list()).find(m=>m.id===id); if(!item) throw new NotFoundException('Missão não encontrada.'); return item; }
  async create(dto:CreateMissionDto) { const now=new Date().toISOString(), id=randomUUID(); await this.sheets.appendRecord('Missao',{id,nome:dto.name.trim(),sigla:dto.acronym?.trim()||'',descricao:dto.description?.trim()||'',cidade:dto.city?.trim()||'',estado:dto.state?.trim()||'',pais:dto.country?.trim()||'Brasil',responsavel_id:dto.responsibleId||'',ativo:'TRUE',criado_em:now,atualizado_em:now}); return this.get(id); }
  async update(id:string,dto:UpdateMissionDto) { const rows=await this.sheets.read('Missao'), row=rows.find(r=>r.id===id); if(!row) throw new NotFoundException('Missão não encontrada.'); await this.sheets.updateRecord('Missao','id',id,{...row,nome:dto.name?.trim()??row.nome,sigla:dto.acronym?.trim()??row.sigla,descricao:dto.description?.trim()??row.descricao,cidade:dto.city?.trim()??row.cidade,estado:dto.state?.trim()??row.estado,pais:dto.country?.trim()??row.pais,responsavel_id:dto.responsibleId??row.responsavel_id,ativo:dto.active===undefined?row.ativo:(dto.active?'TRUE':'FALSE'),atualizado_em:new Date().toISOString()}); return this.get(id); }
}
