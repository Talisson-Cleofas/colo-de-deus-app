import { IsArray, IsBoolean, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateNotificationDto {
  @IsString() @MinLength(3) title!: string;
  @IsString() @MinLength(3) message!: string;
  @IsIn(['INFO','EVENTO','LECTIO','SOMA','MEMBRO','SISTEMA','JUSTIFICATIVA','ANIVERSARIO']) type!: string;
  @IsIn(['TODOS','INDIVIDUAL','MINISTERIO','CELULA','CENACULO','PERFIL']) audience!: string;
  @IsOptional() @IsString() audienceId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) recipientIds?: string[];
  @IsOptional() @IsString() origin?: string;
  @IsOptional() @IsString() referenceType?: string;
  @IsOptional() @IsString() referenceId?: string;
  @IsOptional() @IsString() link?: string;
}

export class UpdateNotificationPreferencesDto {
  @IsOptional() @IsBoolean() events?: boolean;
  @IsOptional() @IsBoolean() confirmations?: boolean;
  @IsOptional() @IsBoolean() justifications?: boolean;
  @IsOptional() @IsBoolean() memberships?: boolean;
  @IsOptional() @IsBoolean() leadership?: boolean;
  @IsOptional() @IsBoolean() birthdays?: boolean;
  @IsOptional() @IsBoolean() birthdayAdvance?: boolean;
  @IsOptional() @IsBoolean() app?: boolean;
  @IsOptional() @IsBoolean() push?: boolean;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) sendTime?: string;
  @IsOptional() @IsString() firebaseToken?: string;
}
