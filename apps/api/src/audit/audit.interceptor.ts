import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
@Injectable()
export class AuditInterceptor implements NestInterceptor{
 constructor(private readonly audit:AuditService){}
 intercept(context:ExecutionContext,next:CallHandler):Observable<unknown>{
  const req=context.switchToHttp().getRequest<any>(); const method=String(req.method||'GET').toUpperCase(); const path=String(req.originalUrl||req.url||'');
  return next.handle().pipe(tap({next:(response)=>{void this.capture(req,method,path,response);}}));
 }
 private async capture(req:any,method:string,path:string,response:any){
  if(path.includes('/audit')||method==='GET'||method==='OPTIONS')return;
  const clean=path.split('?')[0].replace(/^\/api\//,''); const parts=clean.split('/').filter(Boolean); const module=(parts[0]||'SYSTEM').toUpperCase();
  let action:'LOGIN'|'CREATE'|'UPDATE'|'DELETE'|'RESTORE'|'PERMISSION'|'CHANGE' = method==='POST'?'CREATE':method==='DELETE'?'DELETE':'UPDATE';
  if(clean==='auth/google')action='LOGIN'; else if(clean.includes('/restore'))action='RESTORE'; else if(module==='PERMISSIONS'||module==='RBAC'||clean.includes('permissions'))action='PERMISSION'; else if(!['POST','PATCH','PUT','DELETE'].includes(method))action='CHANGE';
  const responseUser=clean==='auth/google'?response?.user:null; const user=req.user||responseUser;
  const recordId=req.params?.id||response?.id||response?.data?.id||'';
  try{await this.audit.record({action,module,entity:parts[0]||'',recordId,user,description:`${method} ${clean}`,newData:this.sanitize(req.body),ip:req.ip,userAgent:req.headers?.['user-agent']});}catch{/* auditoria não pode interromper a operação principal */}
 }
 private sanitize(body:any){if(!body)return body;const clone={...body};for(const key of ['idToken','token','password','senha','privateKey'])if(key in clone)clone[key]='[PROTEGIDO]';return clone;}
}
