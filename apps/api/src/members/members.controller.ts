import { Inject, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';
import type { MemberRow } from '../google/google-sheets.service';
import { MEMBER_REPOSITORY, type IMemberRepository } from '../persistence/interfaces/member-repository.interface';
import { CreateMemberDto } from './create-member.dto';
import { UpdateMemberDto } from './update-member.dto';
import { AdminUpdateMemberDto } from './admin-update-member.dto';
import { MemberProfileService } from './member-profile.service';
import { MinistryScopeService } from '../rbac/ministry-scope.service';
import { MapsSyncService } from '../google-maps/maps-sync.service';
import { ProfilesService } from '../rbac/profiles.service';
@ApiTags('members')
@Controller('members')
export class MembersController {
  constructor(@Inject(MEMBER_REPOSITORY) private readonly sheets: IMemberRepository, private readonly profiles: MemberProfileService, private readonly ministryScope: MinistryScopeService, private readonly mapsSync: MapsSyncService, private readonly accessProfiles: ProfilesService) {}
  private visibleTo(user: AuthenticatedUser, member: MemberRow): boolean {
    if (['ADMIN', 'MISSION_LEADER', 'DEVELOPER'].includes(user.profile)) return true;
    if (user.profile === 'MINISTRY_LEADER') return Boolean(user.ministry && member.ministry === user.ministry);
    if (user.profile === 'CELL_LEADER') return Boolean(user.cell && member.cell === user.cell);
    // Membros comuns podem consultar o diretório de membros, mas a edição continua restrita ao próprio cadastro.
    if (user.profile === 'MEMBER') return true;
    return member.id === user.memberId || member.id === user.id;
  }
  private async scopedMembers(user: AuthenticatedUser, includeInactive = false): Promise<MemberRow[]> {
    const members = await this.sheets.listMembers(includeInactive);
    if (user.profile !== 'MINISTRY_LEADER') return members.filter((member) => this.visibleTo(user, member));
    const allowed = await this.ministryScope.memberIds(user);
    return members.filter((member) => allowed.has(member.id));
  }
  @Post()
  @Roles('ADMIN','MISSION_LEADER','DEVELOPER')
  @ApiOperation({ summary: 'Cadastrar um membro no Google Sheets' })
  async create(@Body() dto: CreateMemberDto, @CurrentUser() user: AuthenticatedUser) {
    await this.accessProfiles.assertAssignable(user.profile, dto.profile);
    const member = await this.sheets.createMember(dto);
    await this.mapsSync.syncMember(member.id, true);
    return { member, message: 'Membro cadastrado com sucesso.' };
  }
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateMemberDto, @CurrentUser() user: AuthenticatedUser) {
    const target = (await this.sheets.listMembers(true)).find((member) => member.id === id);
    if (!target) throw new NotFoundException('Membro não encontrado.');
    const isSelf = target.id === user.memberId || target.id === user.id;
    if (!['ADMIN', 'MISSION_LEADER', 'DEVELOPER'].includes(user.profile) && !isSelf) {
      throw new NotFoundException('Membro não encontrado ou sem permissão para edição.');
    }
    if (dto.profile && ['ADMIN', 'MISSION_LEADER', 'DEVELOPER'].includes(user.profile)) {
      await this.accessProfiles.assertAssignable(user.profile, dto.profile);
    }
    const safeDto = ['ADMIN', 'MISSION_LEADER', 'DEVELOPER'].includes(user.profile) ? dto : {
      name: dto.name, photo: dto.photo, phone: dto.phone, bio: dto.bio, instagram: dto.instagram,
      birthDate: dto.birthDate, city: dto.city, state: dto.state, address: dto.address, neighborhood: dto.neighborhood, zipCode: dto.zipCode, latitude: dto.latitude, longitude: dto.longitude, googlePlaceId: dto.googlePlaceId, gifts: dto.gifts, formator: dto.formator,
    };
    const member = await this.sheets.updateMember(id, safeDto);
    const addressChanged = ['address', 'neighborhood', 'city', 'state', 'zipCode'].some((key) => key in safeDto);
    if (addressChanged) await this.mapsSync.syncMember(id, true);
    return { member, message: 'Cadastro atualizado com sucesso.' };
  }
  @Patch(':id/status')
  @Roles('ADMIN','MISSION_LEADER','DEVELOPER')
  async status(@Param('id') id: string, @Body('active') active: boolean) {
    const member = await this.sheets.setMemberActive(id, Boolean(active));
    return { member, message: active ? 'Membro reativado com sucesso.' : 'Membro desativado com sucesso.' };
  }
  @Get('map')
  async map() {
    return { status: 'SUCCESS', members: await this.mapsSync.list() };
  }

  @Get('me/profile')
  async myProfile(@CurrentUser() user: AuthenticatedUser) {
    const memberId = user.memberId || user.id;
    const [members, ministries, cells, cenacles, participants] = await Promise.all([
      this.sheets.listMembers(true),
      this.sheets.read('Ministérios'),
      this.sheets.read('Células'),
      this.sheets.read('Cenáculos'),
      this.sheets.read('Participantes'),
    ]);
    const member = members.find((item) => item.id === memberId || item.email === user.email.trim().toLowerCase());
    if (!member) throw new NotFoundException('Perfil do membro não encontrado.');
    const active = (value: string) => !value || this.sheets.parseActive(value, true);
    const memberById = new Map(members.map((item) => [item.id, item]));
    const activeLinks = participants.filter((row) => row.membro_id === member.id && active(row.ativo || ''));
    const ministryMap = new Map<string, { id:string; name:string; role:string; leader:string }>();
    for (const row of ministries.filter((item) => active(item.ativo || ''))) {
      const participant = activeLinks.find((link) => link.tipo === 'MINISTERIO' && link.referencia_id === row.id);
      let role = participant?.funcao || '';
      if (row.lider_id === member.id) role = 'LIDER';
      else if (row.vice_lider_id === member.id) role = 'VICE_LIDER';
      if (participant || row.lider_id === member.id || row.vice_lider_id === member.id || row.nome === member.ministry) {
        ministryMap.set(row.id, { id:row.id, name:row.nome, role:role || member.role || 'MEMBRO', leader:memberById.get(row.lider_id)?.name || '' });
      }
    }
    const cellMap = new Map<string, { id:string; name:string; day:string; time:string; role:string; leader:string }>();
    for (const row of cells.filter((item) => active(item.ativo || ''))) {
      const participant = activeLinks.find((link) => link.tipo === 'CELULA' && link.referencia_id === row.id);
      let role = participant?.funcao || '';
      if (row.lider_id === member.id) role = 'LIDER';
      else if (row.vice_lider_id === member.id) role = 'VICE_LIDER';
      if (participant || row.lider_id === member.id || row.vice_lider_id === member.id || row.nome === member.cell) {
        cellMap.set(row.id, { id:row.id, name:row.nome, day:row.dia_semana || '', time:row.horario || '', role, leader:memberById.get(row.lider_id)?.name || '' });
      }
    }
    const cenacleMap = new Map<string, { id:string; name:string; recurrence:string; role:string; leader:string }>();
    for (const row of cenacles.filter((item) => active(item.ativo || ''))) {
      const participant = activeLinks.find((link) => link.tipo === 'CENACULO' && link.referencia_id === row.id);
      let role = participant?.funcao || '';
      if (row.responsavel_id === member.id) role = 'RESPONSAVEL';
      else if (row.vice_responsavel_id === member.id) role = 'VICE_RESPONSAVEL';
      if (participant || row.responsavel_id === member.id || row.vice_responsavel_id === member.id) {
        cenacleMap.set(row.id, { id:row.id, name:row.nome, recurrence:row.recorrente || '', role, leader:memberById.get(row.responsavel_id)?.name || '' });
      }
    }
    const profileMinistries = [...ministryMap.values()];
    const profileCells = [...cellMap.values()];
    const profileCenacles = [...cenacleMap.values()];
    // No acompanhamento, nunca exibir o próprio membro como seu líder.
    // Para vínculos em outros ministérios, exibir os respectivos líderes sem duplicação.
    const leaders = profileMinistries
      .filter((link) => link.leader && link.role !== 'LIDER')
      .map((link) => ({ structureId: link.id, structureName: link.name, name: link.leader }))
      .filter((item, index, items) => items.findIndex((other) => other.name === item.name && other.structureId === item.structureId) === index);
    const primaryLeader = leaders[0]?.name || '';
    return { member, links: { ministries: profileMinistries, cells: profileCells, cenacles: profileCenacles, leader: primaryLeader, leaders, formator: member.formator } };
  }
  @Patch('me/profile')
  async updateMyProfile(@Body() dto: UpdateMemberDto, @CurrentUser() user: AuthenticatedUser) {
    const members = await this.sheets.listMembers(true);
    const target = members.find((member) =>
      member.id === user.memberId || member.id === user.id || member.email === user.email.trim().toLowerCase(),
    );
    if (!target) throw new NotFoundException('Perfil do membro não encontrado.');
    const member = await this.sheets.updateMember(target.id, {
      name: dto.name,
      photo: dto.photo,
      phone: dto.phone,
      bio: dto.bio,
      instagram: dto.instagram,
      birthDate: dto.birthDate,
      city: dto.city,
      state: dto.state,
      address: dto.address,
      neighborhood: dto.neighborhood,
      zipCode: dto.zipCode,
      latitude: dto.latitude,
      longitude: dto.longitude,
      googlePlaceId: dto.googlePlaceId,
      gifts: dto.gifts,
      formator: dto.formator,
    });
    return { member, message: 'Perfil atualizado com sucesso.' };
  }
  @Get()
  @ApiQuery({ name:'q', required:false })
  @ApiQuery({ name:'ministry', required:false })
  @ApiQuery({ name:'cell', required:false })
  @ApiQuery({ name:'role', required:false })
  @ApiQuery({ name:'profile', required:false })
  @ApiQuery({ name:'status', required:false })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('q') q='', @Query('ministry') ministry='', @Query('cell') cell='', @Query('role') role='',
    @Query('profile') profile='', @Query('status') status='active',
  ) {
    const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const term=normalize(q.trim());
    const members=(await this.scopedMembers(user)).filter((m)=>{
      const haystack=normalize([m.name,m.email,m.ministry,m.cell,m.role,m.city,m.formator].join(' '));
      const statusMatch=status==='all'||(status==='active'&&m.active)||(status==='inactive'&&!m.active);
      return statusMatch&&(!term||haystack.includes(term))&&(!ministry||m.ministry===ministry)&&(!cell||m.cell===cell)&&(!role||m.role===role)&&(!profile||m.profile===profile);
    });
    return { members, total:members.length };
  }
  @Get('trash')
  async trash(@CurrentUser() user:AuthenticatedUser){if(!['DEVELOPER','MISSION_LEADER','ADMIN'].includes(user.profile))return {members:[],total:0};const rows=(await this.sheets.read('Membros')).filter(r=>Boolean(r.deleted_at));return {members:rows.map(r=>({id:r.id,name:r.nome,email:r.email,deletedAt:r.deleted_at,deletedBy:r.deleted_by})),total:rows.length};}
  @Delete(':id')
  async remove(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser){if(!['DEVELOPER','MISSION_LEADER','ADMIN'].includes(user.profile))throw new NotFoundException('Membro não encontrado.');await this.sheets.softDeleteRecord('Membros',id,user.memberId||user.id);return {success:true,message:'Membro movido para a lixeira.'};}
  @Post(':id/restore')
  async restore(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser){if(!['DEVELOPER','MISSION_LEADER','ADMIN'].includes(user.profile))throw new NotFoundException('Membro não encontrado.');await this.sheets.restoreRecord('Membros',id,user.memberId||user.id);return {success:true,message:'Membro restaurado com sucesso.'};}
  @Get('facets')
  async facets(@CurrentUser() user: AuthenticatedUser) {
    const members=await this.scopedMembers(user);
    const unique=(values:string[])=>[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    return { ministries:unique(members.map((m)=>m.ministry)), cells:unique(members.map((m)=>m.cell)), roles:unique(members.map((m)=>m.role)) };
  }
  @Get('ministries')
  async ministries(@CurrentUser() user: AuthenticatedUser) {
    const members=(await this.scopedMembers(user)).filter((m)=>m.active);
    const map=new Map<string, typeof members>();
    for(const member of members){const key=member.ministry||'Sem ministério';map.set(key,[...(map.get(key)??[]),member]);}
    return [...map.entries()].map(([name,people])=>({name,count:people.length,leaders:people.filter((p)=>/coordenador|líder|lider/i.test(p.role)),members:people})).sort((a,b)=>b.count-a.count);
  }
  @Get(':id/profile-complete')
  async completeProfile(@Param('id') id:string, @CurrentUser() user:AuthenticatedUser) { return this.profiles.complete(id,user); }
  @Get(':id/public-profile')
  async publicProfile(@Param('id') id:string, @CurrentUser() user:AuthenticatedUser) { return this.profiles.publicProfile(id,user); }
  @Patch(':id/admin')
  @Roles('ADMIN','MISSION_LEADER','DEVELOPER')
  async adminUpdate(@Param('id') id:string, @Body() dto:AdminUpdateMemberDto, @CurrentUser() user:AuthenticatedUser) {
    if (dto.profile) await this.accessProfiles.assertAssignable(user.profile, dto.profile);
    return this.profiles.adminUpdate(id,dto,user);
  }
  @Get(':id')
  async detail(@Param('id') id:string, @CurrentUser() user: AuthenticatedUser) {
    const member=(await this.scopedMembers(user)).find((m)=>m.id===id);
    if(!member) throw new NotFoundException('Membro não encontrado.');
    return member;
  }
}
