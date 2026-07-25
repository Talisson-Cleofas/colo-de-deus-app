import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProfilesService, type ProfileInput } from './profiles.service';
@Controller('profiles')
@Roles('DEVELOPER','MISSION_LEADER','ADMIN')
export class ProfilesController {
 constructor(private readonly service:ProfilesService){}
 @Get() list(){return this.service.list();}
 @Post() @Roles('DEVELOPER') create(@Body() dto:ProfileInput){return this.service.create(dto);}
 @Patch(':id') @Roles('DEVELOPER') update(@Param('id') id:string,@Body() dto:ProfileInput){return this.service.update(id,dto);}
 @Patch(':id/status') @Roles('DEVELOPER') status(@Param('id') id:string,@Body() dto:{active:boolean}){return this.service.setActive(id,Boolean(dto.active));}
 @Delete(':id') @Roles('DEVELOPER') remove(@Param('id') id:string){return this.service.remove(id);}
 @Post('seed/default') @Roles('DEVELOPER') seed(){return this.service.seed();}
}
