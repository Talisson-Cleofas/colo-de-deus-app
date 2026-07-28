import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { GoogleSheetsService } from '../google/google-sheets.service';
import { PermissionScope } from './enums/permission-scope.enum';
import { DEFAULT_PERMISSIONS, DEFAULT_PROFILE_PERMISSIONS } from './permission.defaults';

export type PermissionInput = { code?: string; resource?: string; action?: string; description?: string; active?: boolean };
export type MatrixInput = { profileCode: string; permissionCode: string; allowed: boolean; scope?: PermissionScope | string };
export type PermissionItem = { id?: string; code: string; resource: string; action: string; description: string; active: boolean; createdAt?: string; updatedAt?: string };

@Injectable()
export class PermissionsService {
  private demoPermissions: PermissionItem[] = DEFAULT_PERMISSIONS.map((p,i)=>({...p,id:`permission-${i+1}`}));
  private demoMatrix = DEFAULT_PROFILE_PERMISSIONS.map((p,i)=>({...p,id:`profile-permission-${i+1}`,active:true}));
  constructor(private readonly sheets:GoogleSheetsService){}
  private now(){return new Date().toISOString();}
  private normalizePart(v:string){return v.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'');}
  normalizeCode(value:string){const clean=value.trim(); if(clean.includes(':')){const [r,a]=clean.split(':');return `${this.normalizePart(r)}:${this.normalizePart(a)}`;} if(clean.includes('.')){const [r,a]=clean.split('.');return `${this.normalizePart(r)}:${this.normalizePart(a)}`;} return this.normalizePart(clean);}
  displayCode(code:string){return code.toLowerCase().replace(':','.').replace(/_/g,'-');}
  private value(r:Record<string,string>, ...aliases:string[]){
    for(const alias of aliases){
      const direct=r[alias];
      if(direct!==undefined && String(direct).trim()!=='') return String(direct).trim();
      const key=Object.keys(r).find(k=>k.trim().toLowerCase()===alias.toLowerCase());
      if(key && String(r[key]??'').trim()!=='') return String(r[key]).trim();
    }
    return '';
  }
  private map(r:Record<string,string>):PermissionItem{
    const rawCode=this.value(r,'codigo','code','permissao_codigo','permission_code');
    const resourceRaw=this.value(r,'recurso','resource');
    const actionRaw=this.value(r,'acao','action');
    const normalized=rawCode?this.normalizeCode(rawCode):(resourceRaw&&actionRaw?`${this.normalizePart(resourceRaw)}:${this.normalizePart(actionRaw)}`:'');
    const [resourceFromCode='',actionFromCode='']=normalized.split(':');
    return {
      id:this.value(r,'id') || undefined,
      code:normalized,
      resource:this.normalizePart(resourceRaw||resourceFromCode),
      action:this.normalizePart(actionRaw||actionFromCode),
      description:this.value(r,'descricao','description','descrição'),
      active:this.sheets.parseActive(this.value(r,'ativo','active','status'),true),
      createdAt:this.value(r,'criado_em','created_at','createdAt'),
      updatedAt:this.value(r,'atualizado_em','updated_at','updatedAt'),
    };
  }

  async seed(){
    if(this.sheets.isDemo()) return this.demoPermissions;
    const rows=await this.sheets.read('Permissoes'); const existing=new Set(rows.map(r=>this.map(r).code).filter(Boolean)); const now=this.now();
    for(const p of DEFAULT_PERMISSIONS) if(!existing.has(String(p.code))) await this.sheets.appendRecord('Permissoes',{id:randomUUID(),codigo:p.code,recurso:p.resource,acao:p.action,descricao:p.description,ativo:'TRUE',criado_em:now,atualizado_em:now});
    await this.seedMatrix(); return this.list(false);
  }
  async seedMatrix(){
    if(this.sheets.isDemo()) return this.demoMatrix;
    const rows=await this.sheets.read('PerfisPermissoes'); const keys=new Set(rows.map(r=>`${this.normalizePart(this.value(r,'perfil_codigo','profile_code','profileCode'))}|${this.normalizeCode(this.value(r,'permissao_codigo','permission_code','permissionCode'))}`)); const now=this.now();
    for(const x of DEFAULT_PROFILE_PERMISSIONS){const key=`${x.profileCode}|${x.permissionCode}`;if(!keys.has(key))await this.sheets.appendRecord('PerfisPermissoes',{id:randomUUID(),perfil_codigo:x.profileCode,permissao_codigo:x.permissionCode,permitido:x.allowed?'TRUE':'FALSE',escopo:x.scope,ativo:'TRUE',criado_em:now,atualizado_em:now});}
  }
  async list(seed=true){if(this.sheets.isDemo())return [...this.demoPermissions].sort((a,b)=>a.code.localeCompare(b.code));let rows=await this.sheets.read('Permissoes');let parsed=rows.map(r=>this.map(r)).filter(p=>p.code&&p.resource&&p.action);if(seed&&parsed.length<Object.values(DEFAULT_PERMISSIONS).length){await this.seed();rows=await this.sheets.read('Permissoes');parsed=rows.map(r=>this.map(r)).filter(p=>p.code&&p.resource&&p.action);}if(!parsed.length)return [...this.demoPermissions].sort((a,b)=>a.code.localeCompare(b.code));return parsed.sort((a,b)=>a.code.localeCompare(b.code));}
  async create(dto:PermissionInput){const resource=this.normalizePart(dto.resource||dto.code?.split(/[.:]/)[0]||'');const action=this.normalizePart(dto.action||dto.code?.split(/[.:]/)[1]||'');if(!resource||!action)throw new BadRequestException('Recurso e ação são obrigatórios.');const code=`${resource}:${action}`;const all=await this.list();if(all.some(p=>p.code===code))throw new BadRequestException('Essa permissão já existe.');const now=this.now();const item:PermissionItem={id:randomUUID(),code,resource,action,description:dto.description?.trim()||`${action.toLowerCase()} em ${resource.toLowerCase()}`,active:dto.active!==false,createdAt:now,updatedAt:now};if(this.sheets.isDemo()){this.demoPermissions.push(item);return item;}await this.sheets.appendRecord('Permissoes',{id:item.id!,codigo:item.code,recurso:item.resource,acao:item.action,descricao:item.description,ativo:item.active?'TRUE':'FALSE',criado_em:now,atualizado_em:now});return item;}
  async update(id:string,dto:PermissionInput){const all=await this.list();const old=all.find(p=>p.id===id);if(!old)throw new NotFoundException('Permissão não encontrada.');const resource=dto.resource?this.normalizePart(dto.resource):old.resource;const action=dto.action?this.normalizePart(dto.action):old.action;const code=`${resource}:${action}`;if(all.some(p=>p.id!==id&&p.code===code))throw new BadRequestException('Essa permissão já existe.');const item={...old,code,resource,action,description:dto.description===undefined?old.description:dto.description.trim(),active:dto.active===undefined?old.active:dto.active,updatedAt:this.now()};if(this.sheets.isDemo()){this.demoPermissions=this.demoPermissions.map(p=>p.id===id?item:p);return item;}await this.sheets.updateRecord('Permissoes','id',id,{id,codigo:item.code,recurso:item.resource,acao:item.action,descricao:item.description,ativo:item.active?'TRUE':'FALSE',criado_em:item.createdAt||'',atualizado_em:item.updatedAt||''});if(old.code!==item.code){const links=await this.sheets.read('PerfisPermissoes');for(const link of links.filter(r=>this.normalizeCode(r.permissao_codigo)===old.code))await this.sheets.updateRecord('PerfisPermissoes','id',link.id,{...link,permissao_codigo:item.code,atualizado_em:this.now()});}return item;}
  async setActive(id:string,active:boolean){return this.update(id,{active});}
  async remove(id:string){const all=await this.list();const old=all.find(p=>p.id===id);if(!old)throw new NotFoundException('Permissão não encontrada.');if(this.sheets.isDemo()){this.demoPermissions=this.demoPermissions.filter(p=>p.id!==id);this.demoMatrix=this.demoMatrix.filter(x=>x.permissionCode!==old.code);return {deleted:true};}const links=await this.sheets.read('PerfisPermissoes');await this.sheets.replaceRecords('PerfisPermissoes',links.filter(r=>this.normalizeCode(r.permissao_codigo)!==old.code));const rows=await this.sheets.read('Permissoes');await this.sheets.replaceRecords('Permissoes',rows.filter(r=>r.id!==id));return {deleted:true};}
  async matrix(){if(this.sheets.isDemo())return this.demoMatrix;await this.seedMatrix();return (await this.sheets.read('PerfisPermissoes')).map(r=>({id:this.value(r,'id')||undefined,profileCode:this.normalizePart(this.value(r,'perfil_codigo','profile_code','profileCode')),permissionCode:this.normalizeCode(this.value(r,'permissao_codigo','permission_code','permissionCode')),allowed:this.sheets.parseActive(this.value(r,'permitido','allowed'),false),scope:(this.value(r,'escopo','scope')||'OWN') as PermissionScope,active:this.sheets.parseActive(this.value(r,'ativo','active'),true)})).filter(x=>x.profileCode&&x.permissionCode.includes(':')); }
  async saveMatrix(dto:MatrixInput){const profileCode=this.normalizePart(dto.profileCode);const permissionCode=this.normalizeCode(dto.permissionCode);if(!profileCode||!permissionCode.includes(':'))throw new BadRequestException('Perfil e permissão são obrigatórios.');const scope=String(dto.scope||'OWN').toUpperCase() as PermissionScope;const all=await this.matrix();const old=all.find(x=>x.profileCode===profileCode&&x.permissionCode===permissionCode);const now=this.now();const item={id:old?.id||randomUUID(),profileCode,permissionCode,allowed:Boolean(dto.allowed),scope,active:true};if(this.sheets.isDemo()){this.demoMatrix=this.demoMatrix.filter(x=>!(x.profileCode===profileCode&&x.permissionCode===permissionCode));this.demoMatrix.push(item as any);return item;}const record={id:item.id,perfil_codigo:profileCode,permissao_codigo:permissionCode,permitido:item.allowed?'TRUE':'FALSE',escopo:scope,ativo:'TRUE',criado_em:(old as any)?.createdAt||now,atualizado_em:now};if(old?.id)await this.sheets.updateRecord('PerfisPermissoes','id',old.id,record);else await this.sheets.appendRecord('PerfisPermissoes',record);return item;}
  async saveMatrixBulk(items:MatrixInput[]){for(const item of items)await this.saveMatrix(item);return {updated:items.length};}
  async forProfile(profileCode:string){const profile=this.normalizePart(profileCode);const [permissions,links]=await Promise.all([this.list(),this.matrix()]);const byCode=new Map(links.filter(x=>x.profileCode===profile).map(x=>[x.permissionCode,x]));return permissions.map(permission=>({...permission,allowed:Boolean(byCode.get(permission.code)?.allowed),scope:byCode.get(permission.code)?.scope||'OWN',linkActive:byCode.get(permission.code)?.active!==false}));}
}
