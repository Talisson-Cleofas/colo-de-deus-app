import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { drive_v3 } from 'googleapis';
import { GoogleSheetsService } from '../google/google-sheets.service';

@Injectable()
export class DriveFolderService {
  constructor(private readonly sheets:GoogleSheetsService){}
  sanitize(name:string){return name.replace(/[\\/:*?"<>|]/g,'-').replace(/\s+/g,' ').trim();}

  async getOrCreate(drive:drive_v3.Drive,parentId:string,module:string,referenceType:string,referenceId:string,name:string){
    const rows=await this.sheets.read('PastasDrive');
    const existing=rows.find(r=>r.modulo===module&&r.referencia_tipo===referenceType&&r.referencia_id===referenceId&&this.sheets.parseActive(r.ativo||'',true));
    if(existing?.drive_folder_id) return {id:existing.drive_folder_id,name:existing.nome,path:existing.caminho,reused:true};
    const safe=this.sanitize(name||`${module}-${referenceId}`);
    let result;
    try{
      result=await drive.files.create({requestBody:{name:safe,mimeType:'application/vnd.google-apps.folder',parents:[parentId]},fields:'id,name,parents'});
    }catch{throw new ServiceUnavailableException('Não foi possível criar a pasta no Google Drive.');}
    const folderId=result.data.id||''; const now=new Date().toISOString();
    await this.sheets.appendRecord('PastasDrive',{id:randomUUID(),modulo:module,referencia_tipo:referenceType,referencia_id:referenceId,drive_folder_id:folderId,drive_parent_folder_id:parentId,nome:result.data.name||safe,caminho:`/${safe}`,ativo:'TRUE',criado_em:now,atualizado_em:now});
    return {id:folderId,name:result.data.name||safe,path:`/${safe}`,reused:false};
  }
}
