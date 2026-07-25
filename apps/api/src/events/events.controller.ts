import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import { CreateEventDto, EventResponseDto, UpdateEventDto } from './event-response.dto';
import { EventsService } from './events.service';

@ApiTags('Agenda e Eventos')
@Controller('events')
export class EventsController {
  constructor(private readonly service:EventsService){}
  @Get() list(@CurrentUser() user:AuthenticatedUser,@Query('month') month?:string,@Query('category') category?:string,@Query('scope') scope?:string,@Query('q') search?:string){return this.service.list({month,category,scope,search},user);}
  @Get('categories') categories(@CurrentUser() user:AuthenticatedUser){return this.service.categories(user);}
  @Get('management/options') options(@CurrentUser() user:AuthenticatedUser){return this.service.options(user);}
  @Get('trash') trash(@CurrentUser() user:AuthenticatedUser){return this.service.trash(user);}
  @Get('responses/inbox') inbox(@CurrentUser() user:AuthenticatedUser){return this.service.inbox(user);}
  @Post() create(@Body() dto:CreateEventDto,@CurrentUser() user:AuthenticatedUser){return this.service.create(dto,user);}
  @Delete(':id') remove(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser){return this.service.remove(id,user);}
  @Post(':id/restore') restore(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser){return this.service.restore(id,user);}
  @Patch(':id') update(@Param('id') id:string,@Body() dto:UpdateEventDto,@CurrentUser() user:AuthenticatedUser){return this.service.update(id,dto,user);}
  @Patch(':id/publication') publication(@Param('id') id:string,@Body() body:{published:boolean},@CurrentUser() user:AuthenticatedUser){return this.service.setPublication(id,body.published,user);}
  @Post(':id/response') respond(@Param('id') id:string,@Body() dto:EventResponseDto,@CurrentUser() user:AuthenticatedUser){return this.service.respond(id,dto,user);}
  @Get(':id') findOne(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser){return this.service.findOne(id,user);}
}
