import { IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminUpdateMemberDto {
  @IsOptional() @IsIn(['DEVELOPER','ADMIN','MINISTRY_LEADER','CELL_LEADER','MEMBER'])
  profile?: 'ADMIN'|'MINISTRY_LEADER'|'CELL_LEADER'|'MEMBER';
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() @MaxLength(100) role?: string;
  @IsOptional() @IsString() @MaxLength(120) formator?: string;
  @IsOptional() @IsString() ministryId?: string;
  @IsOptional() @IsString() cellId?: string;
  @IsOptional() @IsArray() @IsString({ each:true }) cenacleIds?: string[];
  @IsOptional() @IsArray() @IsString({ each:true }) leadMinistryIds?: string[];
  @IsOptional() @IsArray() @IsString({ each:true }) leadCellIds?: string[];
  @IsOptional() @IsArray() @IsString({ each:true }) leadCenacleIds?: string[];
}
