import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MemberProfileService } from './member-profile.service';
@Module({ controllers: [MembersController], providers:[MemberProfileService] })
export class MembersModule {}
