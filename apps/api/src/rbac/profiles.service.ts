import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { GoogleSheetsService } from '../google/google-sheets.service';
import { DEFAULT_PROFILES } from './permission.defaults';
import type { RbacProfile } from './interfaces/rbac.interfaces';

export type ProfileInput = { code?: string; name?: string; description?: string; level?: number; active?: boolean };

@Injectable()
export class ProfilesService {
  private demoProfiles: RbacProfile[] = DEFAULT_PROFILES.map((p, i) => ({...p,id:`profile-${i+1}`}));
  constructor(private readonly sheets: GoogleSheetsService) {}
  private now(){ return new Date().toISOString(); }
  private code(value:string){ return value.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,''); }
  private value(r:Record<string,string>, ...aliases:string[]){
    for(const alias of aliases){
      const direct=r[alias];
      if(direct!==undefined && String(direct).trim()!=='') return String(direct).trim();
      const key=Object.keys(r).find(k=>k.trim().toLowerCase()===alias.toLowerCase());
      if(key && String(r[key]??'').trim()!=='') return String(r[key]).trim();
    }
    return '';
  }
  private map(r:Record<string,string>):RbacProfile{
    const rawCode=this.value(r,'codigo','code','perfil_codigo','profile_code');
    const code=this.code(rawCode);
    const fallback=DEFAULT_PROFILES.find(p=>p.code===code);
    const rawLevel=this.value(r,'nivel','level');
    return {
      id:this.value(r,'id') || undefined,
      code:code || String(fallback?.code||''),
      name:this.value(r,'nome','name','titulo','title') || fallback?.name || code,
      description:this.value(r,'descricao','description','descrição') || fallback?.description || '',
      level:Number(rawLevel || fallback?.level || 0),
      active:this.sheets.parseActive(this.value(r,'ativo','active','status'),true),
      createdAt:this.value(r,'criado_em','created_at','createdAt'),
      updatedAt:this.value(r,'atualizado_em','updated_at','updatedAt'),
    };
  }
  async seed(){
    if(this.sheets.isDemo()) return this.demoProfiles;
    const rows=await this.sheets.read('Perfis'); const existing=new Set(rows.map(r=>this.map(r).code).filter(Boolean)); const now=this.now();
    for(const p of DEFAULT_PROFILES) if(!existing.has(p.code)) await this.sheets.appendRecord('Perfis',{id:randomUUID(),codigo:p.code,nome:p.name,descricao:p.description,nivel:p.level,ativo:'TRUE',criado_em:now,atualizado_em:now});
    return this.list(false);
  }
  async list(seed=true):Promise<RbacProfile[]>{
    if(this.sheets.isDemo()) return [...this.demoProfiles].sort((a,b)=>b.level-a.level);
    let rows=await this.sheets.read('Perfis'); if(seed && !rows.length){await this.seed();rows=await this.sheets.read('Perfis');}
    return rows.map(r=>this.map(r)).filter(p=>p.code&&p.code!=='ADMIN').sort((a,b)=>b.level-a.level);
  }
  async create(dto:ProfileInput){
    const code=this.code(dto.code||dto.name||''); if(!code||!dto.name?.trim()) throw new BadRequestException('Código e nome são obrigatórios.');
    const all=await this.list(); if(all.some(p=>p.code===code)) throw new BadRequestException('Já existe um perfil com este código.');
    const item:RbacProfile={id:randomUUID(),code,name:dto.name.trim(),description:dto.description?.trim()||'',level:Number(dto.level||0),active:dto.active!==false,createdAt:this.now(),updatedAt:this.now()};
    if(this.sheets.isDemo()){this.demoProfiles.push(item);return item;}
    await this.sheets.appendRecord('Perfis',{id:item.id!,codigo:item.code,nome:item.name,descricao:item.description,nivel:item.level,ativo:item.active?'TRUE':'FALSE',criado_em:item.createdAt!,atualizado_em:item.updatedAt!}); return item;
  }
  async update(id:string,dto:ProfileInput){
    const all=await this.list(); const old=all.find(p=>p.id===id); if(!old) throw new NotFoundException('Perfil não encontrado.');
    const code=dto.code?this.code(dto.code):String(old.code); if(all.some(p=>p.id!==id&&p.code===code)) throw new BadRequestException('Já existe um perfil com este código.');
    const item={...old,code,name:dto.name?.trim()||old.name,description:dto.description===undefined?old.description:dto.description.trim(),level:dto.level===undefined?old.level:Number(dto.level),active:dto.active===undefined?old.active:dto.active,updatedAt:this.now()};
    if(this.sheets.isDemo()){this.demoProfiles=this.demoProfiles.map(p=>p.id===id?item:p);return item;}
    await this.sheets.updateRecord('Perfis','id',id,{id,codigo:item.code,nome:item.name,descricao:item.description,nivel:item.level,ativo:item.active?'TRUE':'FALSE',criado_em:item.createdAt||'',atualizado_em:item.updatedAt||''}); return item;
  }
  async setActive(id:string,active:boolean){return this.update(id,{active});}
  async remove(id:string){
    const all=await this.list(); const old=all.find(p=>p.id===id); if(!old) throw new NotFoundException('Perfil não encontrado.');
    const members=await this.sheets.read('Membros'); if(members.some(m=>m.perfil===old.code&&this.sheets.parseActive(m.ativo||'TRUE',true))) throw new BadRequestException('Não é possível excluir um perfil atribuído a membros ativos. Desative-o primeiro.');
    if(this.sheets.isDemo()){this.demoProfiles=this.demoProfiles.filter(p=>p.id!==id);return {deleted:true};}
    const rows=await this.sheets.read('Perfis'); await this.sheets.replaceRecords('Perfis',rows.filter(r=>r.id!==id)); return {deleted:true};
  }
}
