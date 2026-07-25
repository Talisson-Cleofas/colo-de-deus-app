import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMinistryDto {
  @IsOptional() @IsString() missionId?: string;
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsOptional() @IsString() @MaxLength(600) description?: string;
  @IsOptional() @IsEmail() leaderEmail?: string;
  @IsOptional() @IsEmail() viceLeaderEmail?: string;
  @IsOptional() @IsString() @MaxLength(30) color?: string;
  @IsOptional() @IsString() @MaxLength(80) icon?: string;
  @IsOptional() @IsString() @MaxLength(60) type?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class UpdateMinistryDto {
  @IsOptional() @IsString() missionId?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(600) description?: string;
  @IsOptional() @IsEmail() leaderEmail?: string;
  @IsOptional() @IsEmail() viceLeaderEmail?: string;
  @IsOptional() @IsString() @MaxLength(30) color?: string;
  @IsOptional() @IsString() @MaxLength(80) icon?: string;
  @IsOptional() @IsString() @MaxLength(60) type?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class AddMinistryMemberDto {
  @IsString() @MinLength(1) memberId!: string;
  @IsOptional() @IsIn(['LIDER', 'VICE_LIDER', 'MEMBRO']) function?: 'LIDER' | 'VICE_LIDER' | 'MEMBRO';
}

export class RegisterMinistryAttendanceDto {
  @IsString() @MinLength(1) memberId!: string;
  @IsString() @MinLength(8) date!: string;
  @IsBoolean() present!: boolean;
  @IsOptional() @IsString() @MaxLength(1200) justification?: string;
}
