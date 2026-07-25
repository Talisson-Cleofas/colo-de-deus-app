import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateMemberDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photo = '';

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  role = 'Membro';

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ministry = '';

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  cell = '';

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone = '';

  @IsIn(['DEVELOPER', 'ADMIN', 'MINISTRY_LEADER', 'CELL_LEADER', 'MEMBER'])
  profile: 'DEVELOPER' | 'MISSION_LEADER' | 'ADMIN' | 'MINISTRY_LEADER' | 'CELL_LEADER' | 'MEMBER' = 'MEMBER';

  @Type(() => Boolean)
  @IsBoolean()
  active = true;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio = '';

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  instagram = '';

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  birthDate = '';

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city = '';

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state = '';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gifts: string[] = [];

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  formator = '';
}
