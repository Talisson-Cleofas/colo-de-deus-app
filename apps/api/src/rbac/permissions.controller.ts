import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsService, type MatrixInput, type PermissionInput } from './permissions.service';
@Controller('permissions')
@Roles('DEVELOPER','MISSION_LEADER','ADMIN')
export class PermissionsController{
 constructor(private readonly service:PermissionsService){}
 @Get() list(){return this.service.list();}
 @Post() @Roles('DEVELOPER') create(@Body() dto:PermissionInput){return this.service.create(dto);}
 @Patch(':id') @Roles('DEVELOPER') update(@Param('id') id:string,@Body() dto:PermissionInput){return this.service.update(id,dto);}
 @Patch(':id/status') @Roles('DEVELOPER') status(@Param('id') id:string,@Body() dto:{active:boolean}){return this.service.setActive(id,Boolean(dto.active));}
 @Delete(':id') @Roles('DEVELOPER') remove(@Param('id') id:string){return this.service.remove(id);}
 @Post('seed/default') @Roles('DEVELOPER') seed(){return this.service.seed();}
 @Get('matrix/all') matrix(){return this.service.matrix();}
 @Put('matrix') @Roles('DEVELOPER') save(@Body() dto:MatrixInput){return this.service.saveMatrix(dto);}
 @Put('matrix/bulk') @Roles('DEVELOPER') bulk(@Body() dto:{items:MatrixInput[]}){return this.service.saveMatrixBulk(dto.items||[]);}
}
