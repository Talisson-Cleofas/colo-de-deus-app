import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminUpdateMemberDto {
  @IsOptional() @IsString() @MaxLength(80)
  profile?: string;
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
