import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCommunityDto {
  @IsString() name!: string;
  @IsIn(['CELL', 'CENACLE']) type!: 'CELL' | 'CENACLE';
  @IsOptional() @IsString() description = '';
  @IsOptional() @IsString() leaderId = '';
  @IsOptional() @IsString() leaderName = '';
  @IsOptional() @IsString() leaderContact = '';
  @IsOptional() @IsString() viceLeaderId = '';
  @IsOptional() @IsString() viceLeaderName = '';
  @IsOptional() @IsString() viceLeaderContact = '';
  @IsOptional() @IsString() modality = '';
  @IsOptional() @IsString() ministryId = '';
  @IsOptional() @IsString() cellId = '';
  @IsOptional() @IsString() weekday = '';
  @IsOptional() @IsString() startDate = '';
  @IsOptional() @IsString() endDate = '';
  @IsOptional() @IsString() recurrence = '';
  @IsOptional() @IsString() time = '';
  @IsOptional() @IsString() endTime = '';
  @IsOptional() @IsString() address = '';
  @IsOptional() @IsString() neighborhood = '';
  @IsOptional() @IsString() city = '';
  @IsOptional() @IsString() state = '';
  @IsOptional() @IsNumber() latitude = 0;
  @IsOptional() @IsNumber() longitude = 0;
  @IsOptional() @IsBoolean() active = true;
}
export class UpdateCommunityDto extends CreateCommunityDto {}
export class AddCommunityParticipantDto {
  @IsOptional() @IsString() memberId = '';
  @IsOptional() @IsString() externalName = '';
  @IsOptional() @IsString() externalContact = '';
  @IsOptional() @IsString() function = 'PARTICIPANTE';
}
