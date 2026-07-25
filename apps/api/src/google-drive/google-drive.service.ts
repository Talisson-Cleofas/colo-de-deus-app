import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { google } from 'googleapis';
import { GoogleSheetsService } from '../google/google-sheets.service';
import { FilesService } from '../files/files.service';
import type { FileCategory, FileMetadataDto } from '../files/files.types';
import { UploadDriveFileDto } from './dto/upload-drive-file.dto';
import { DriveUploadService } from './drive-upload.service';
import { DriveFolderService } from './drive-folder.service';

@Injectable()
export class GoogleDriveService {
 constructor(private readonly config:ConfigService,private readonly files:FilesService,private readonly uploader:DriveUploadService,private readonly folders:DriveFolderService,private readonly sheets:GoogleSheetsService){}
 status(){const enabled=this.config.get<string>('GOOGLE_DRIVE_ENABLED','false')==='true';const folder=Boolean(this.config.get<string>('GOOGLE_DRIVE_ROOT_FOLDER_ID')?.trim());const credentials=Boolean((this.config.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL')||this.config.get<string>('FIREBASE_CLIENT_EMAIL'))&&(this.config.get<string>('GOOGLE_PRIVATE_KEY')||this.config.get<string>('FIREBASE_PRIVATE_KEY')));const configured=folder&&credentials;return {enabled,configured,connected:false,message:enabled&&configured?'Google Drive configurado; teste de conexão disponível.':'Google Drive ainda não configurado.'};}
 private client(){const email=(this.config.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL')||this.config.get<string>('FIREBASE_CLIENT_EMAIL'))?.trim();const key=(this.config.get<string>('GOOGLE_PRIVATE_KEY')||this.config.get<string>('FIREBASE_PRIVATE_KEY'))?.replace(/\\n/g,'\n');if(!email||!key)throw new ServiceUnavailableException('Credenciais do Google Drive não configuradas.');return google.drive({version:'v3',auth:new google.auth.JWT({email,key,scopes:['https://www.googleapis.com/auth/drive']})});}
 private ensure(){const status=this.status();if(!status.enabled||!status.configured)throw new ServiceUnavailableException('Google Drive ainda não configurado.');return {drive:this.client(),folderId:this.config.get<string>('GOOGLE_DRIVE_ROOT_FOLDER_ID')!.trim()};}
 async test(){const {drive,folderId}=this.ensure();const r=await drive.files.get({fileId:folderId,fields:'id,name,mimeType,webViewLink'});return {...this.status(),connected:true,folder:r.data};}
 async list(){return this.files.list();}
 async get(id:string,userId='system'){const item=await this.files.find(id);if(!item)throw new NotFoundException('Arquivo não encontrado.');await this.files.log(id,'VISUALIZAR',userId,{});return item;}

 private metadata(category:FileCategory){
   const map:Record<FileCategory,{module:string;referenceType:string;folderPrefix:string;tab?:'Membros'|'Células'|'Cenáculos'|'Eventos'|'Soma'|'Lectio';idField?:string;fileField?:string;urlField?:string;folderField?:string}>={
    MEMBER_PHOTO:{module:'MEMBROS',referenceType:'MEMBRO',folderPrefix:'Membro',tab:'Membros',idField:'id',fileField:'foto_drive_file_id',urlField:'foto_url'},
    CELL_FILE:{module:'CELULAS',referenceType:'CELULA',folderPrefix:'Celula',tab:'Células',idField:'id',folderField:'pasta_drive_id'},
    CENACLE_FILE:{module:'CENACULOS',referenceType:'CENACULO',folderPrefix:'Cenaculo',tab:'Cenáculos',idField:'id',folderField:'pasta_drive_id'},
    EVENT_FILE:{module:'EVENTOS',referenceType:'EVENTO',folderPrefix:'Evento',tab:'Eventos',idField:'id',fileField:'imagem_drive_file_id',urlField:'imagem_url',folderField:'pasta_drive_id'},
    SOMA_RECEIPT:{module:'SOMA',referenceType:'CONTRIBUICAO',folderPrefix:'Comprovante',tab:'Soma',idField:'id',fileField:'comprovante_drive_file_id',urlField:'comprovante_url'},
    LECTIO_PDF:{module:'LECTIO',referenceType:'LECTIO',folderPrefix:'Lectio',tab:'Lectio',idField:'id',fileField:'pdf_drive_file_id',urlField:'pdf_url'},
    REPORT:{module:'RELATORIOS',referenceType:'RELATORIO',folderPrefix:'Relatorio'},GENERIC:{module:'GERAL',referenceType:'REGISTRO',folderPrefix:'Arquivo'},
   }; return map[category];
 }

 async ensureReferenceFolder(category:FileCategory,referenceId:string,displayName=''){
   const {drive,folderId}=this.ensure(); const meta=this.metadata(category);
   return this.folders.getOrCreate(drive,folderId,meta.module,meta.referenceType,referenceId,`${meta.folderPrefix} - ${displayName||referenceId}`);
 }

 async upload(dto:UploadDriveFileDto,uploadedBy='system'):Promise<FileMetadataDto>{
   const category=(dto.category||'GENERIC') as FileCategory;const buffer=Buffer.from(dto.contentBase64,'base64');this.uploader.validate(dto.fileName,dto.mimeType,buffer,category);
   const {drive,folderId:root}=this.ensure();const meta=this.metadata(category);let folderId=root;
   if(dto.referenceId){folderId=(await this.folders.getOrCreate(drive,root,meta.module,meta.referenceType,dto.referenceId,`${meta.folderPrefix} - ${dto.referenceId}`)).id;}
   const remote=await this.uploader.upload(drive,folderId,dto.fileName,dto.mimeType,buffer);
   const record:FileMetadataDto={id:randomUUID(),driveFileId:remote.id||'',name:remote.name||dto.fileName,originalName:dto.fileName,storedName:remote.name||dto.fileName,mimeType:remote.mimeType||dto.mimeType,size:Number(remote.size||buffer.length),checksum:createHash('sha256').update(buffer).digest('hex'),folderId,category,referenceId:dto.referenceId||'',webViewLink:remote.webViewLink||'',downloadUrl:remote.webContentLink||'',public:false,uploadedBy,createdAt:remote.createdTime||new Date().toISOString(),updatedAt:new Date().toISOString(),deleted:false};
   const saved=await this.files.save(record);
   if(dto.referenceId&&meta.tab&&meta.idField){const rows=await this.sheets.read(meta.tab);const row=rows.find(r=>r[meta.idField!]===dto.referenceId);if(row){const patch:Record<string,string>={...row,atualizado_em:new Date().toISOString()};if(meta.fileField)patch[meta.fileField]=saved.driveFileId;if(meta.urlField)patch[meta.urlField]=saved.webViewLink;if(meta.folderField)patch[meta.folderField]=folderId;if(meta.tab==='Eventos'&&saved.mimeType.startsWith('image/'))patch.imagem=saved.webViewLink;if(meta.tab==='Membros'&&saved.mimeType.startsWith('image/'))patch.foto=saved.webViewLink;await this.sheets.updateRecord(meta.tab,meta.idField,dto.referenceId,patch);}}
   return saved;
 }
 async delete(id:string){const item=await this.files.softDelete(id);if(!item)throw new NotFoundException('Arquivo não encontrado.');return item;}
}
