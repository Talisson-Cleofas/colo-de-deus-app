import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AUDIT_REPOSITORY, type IAuditRepository } from '../persistence/interfaces/audit-repository.interface';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import type { AuditAction, AuditFilters, AuditRecord } from './audit.types';
@Injectable()
export class AuditService {
  constructor(@Inject(AUDIT_REPOSITORY) private readonly sheets: IAuditRepository){}
  async record(input:{action:AuditAction;module:string;entity?:string;recordId?:string;user?:Partial<AuthenticatedUser>|null;description?:string;previousData?:unknown;newData?:unknown;ip?:string;userAgent?:string}){
    const now=new Date().toISOString();
    const row:AuditRecord={id:randomUUID(),action:input.action,module:input.module,entity:input.entity||'',recordId:input.recordId||'',userId:input.user?.memberId||input.user?.id||input.user?.uid||'',userName:input.user?.name||'',userEmail:input.user?.email||'',profile:input.user?.profile||'',description:input.description||'',previousData:this.stringify(input.previousData),newData:this.stringify(input.newData),ip:input.ip||'',userAgent:input.userAgent||'',createdAt:now};
    await this.sheets.appendRecord('Auditoria', {id:row.id,acao:row.action,modulo:row.module,entidade:row.entity,registro_id:row.recordId,usuario_id:row.userId,usuario_nome:row.userName,usuario_email:row.userEmail,perfil:row.profile,descricao:row.description,dados_anteriores:row.previousData,dados_novos:row.newData,ip:row.ip,user_agent:row.userAgent,criado_em:row.createdAt});
    return row;
  }
  async list(filters:AuditFilters){
    const rows=await this.sheets.read('Auditoria');
    const normalize=(v:string)=>v.trim().toLowerCase();
    return rows.map(r=>({id:r.id,action:r.acao,module:r.modulo,entity:r.entidade,recordId:r.registro_id,userId:r.usuario_id,userName:r.usuario_nome,userEmail:r.usuario_email,profile:r.perfil,description:r.descricao,previousData:r.dados_anteriores,newData:r.dados_novos,ip:r.ip,userAgent:r.user_agent,createdAt:r.criado_em})).filter(r=>{
      if(filters.action&&r.action!==filters.action)return false;
      if(filters.module&&r.module!==filters.module)return false;
      if(filters.user&&!normalize(`${r.userName} ${r.userEmail} ${r.userId}`).includes(normalize(filters.user)))return false;
      if(filters.startDate&&r.createdAt<`${filters.startDate}T00:00:00`)return false;
      if(filters.endDate&&r.createdAt>`${filters.endDate}T23:59:59.999`)return false;
      if(filters.q&&!normalize(`${r.description} ${r.entity} ${r.recordId} ${r.module}`).includes(normalize(filters.q)))return false;
      return true;
    }).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  }
  private stringify(value:unknown){if(value===undefined||value===null)return '';try{const text=JSON.stringify(value);return text.length>5000?`${text.slice(0,5000)}…`:text;}catch{return String(value);}}
}
