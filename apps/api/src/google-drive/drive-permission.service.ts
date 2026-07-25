import { ForbiddenException, Injectable } from '@nestjs/common';
@Injectable() export class DrivePermissionService{ensureCanDelete(profile?:string){if(profile&&profile!=='ADMIN')throw new ForbiddenException('Somente administradores podem excluir arquivos.');}}
