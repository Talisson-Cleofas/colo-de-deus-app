import { Body, Controller, Delete, Get, Param, Post, Res } from '@nestjs/common';import { ApiTags } from '@nestjs/swagger';import { UploadDriveFileDto } from './dto/upload-drive-file.dto';import { GoogleDriveService } from './google-drive.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import type { Response } from 'express';
@ApiTags('Google Drive') @Controller('drive') export class GoogleDriveController{
 constructor(private readonly service:GoogleDriveService){}
 @Get('status') status(){return this.service.status();}
 @Get('status/test') test(){return this.service.test();}
 @Post('upload') upload(@Body() dto:UploadDriveFileDto){return this.service.upload(dto);}
 @Get('files') @Roles('MINISTRY_LEADER','MISSION_LEADER','DEVELOPER','ADMIN') list(){return this.service.list();}
 @Get('files/:id') @Roles('MINISTRY_LEADER','MISSION_LEADER','DEVELOPER','ADMIN') get(@Param('id') id:string){return this.service.get(id);}
 @Get('financial-reports') listFinancialReports(@CurrentUser() user:AuthenticatedUser){return this.service.listFinancialReports(user);}
 @Post('financial-reports') uploadFinancialReport(@Body() dto:UploadDriveFileDto,@CurrentUser() user:AuthenticatedUser){return this.service.uploadFinancialReport(dto,user);}
 @Get('financial-reports/:id/download') async downloadFinancialReport(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser,@Res() res:Response){
  const {item,stream}=await this.service.downloadFinancialReport(id,user);
  res.setHeader('Content-Type',item.mimeType||'application/octet-stream');
  res.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(item.originalName||item.name)}`);
  stream.pipe(res);
 }
 @Delete('files/:id') delete(@Param('id') id:string){return this.service.delete(id);}
 @Post('members/:memberId/photo') memberPhoto(@Param('memberId') id:string,@Body() dto:UploadDriveFileDto){return this.service.upload({...dto,referenceId:id,category:'MEMBER_PHOTO'});}
 @Post('cells/:cellId/files') cell(@Param('cellId') id:string,@Body() dto:UploadDriveFileDto){return this.service.upload({...dto,referenceId:id,category:'CELL_FILE'});}
 @Post('cenacles/:cenacleId/files') cenacle(@Param('cenacleId') id:string,@Body() dto:UploadDriveFileDto){return this.service.upload({...dto,referenceId:id,category:'CENACLE_FILE'});}
 @Post('events/:eventId/files') event(@Param('eventId') id:string,@Body() dto:UploadDriveFileDto){return this.service.upload({...dto,referenceId:id,category:'EVENT_FILE'});}
 @Post('soma/:contributionId/receipt') receipt(@Param('contributionId') id:string,@Body() dto:UploadDriveFileDto){return this.service.upload({...dto,referenceId:id,category:'SOMA_RECEIPT'});}
 @Post('lectio/:lectioId/pdf') lectio(@Param('lectioId') id:string,@Body() dto:UploadDriveFileDto){return this.service.upload({...dto,referenceId:id,category:'LECTIO_PDF'});}
}
