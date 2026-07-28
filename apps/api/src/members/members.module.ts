import { Module } from '@nestjs/common';
import { GoogleMapsModule } from '../google-maps/google-maps.module';
import { MembersController } from './members.controller';
import { MemberProfileService } from './member-profile.service';

@Module({ imports: [GoogleMapsModule], controllers: [MembersController], providers: [MemberProfileService] })
export class MembersModule {}
