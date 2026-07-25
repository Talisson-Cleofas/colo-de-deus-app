import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class EventResponseDto {
  @IsIn(['CONFIRMED', 'JUSTIFIED']) status!: 'CONFIRMED' | 'JUSTIFIED';
  @IsOptional() @IsString() @MaxLength(1000) justification = '';
}

export class CreateEventDto {
  @IsString() title!: string;
  @IsOptional() @IsString() description = '';
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate deve usar o formato YYYY-MM-DD.' }) startDate!: string;
  @IsOptional() @IsString() @Matches(/^$|^\d{4}-\d{2}-\d{2}$/, { message: 'endDate deve estar vazio ou usar o formato YYYY-MM-DD.' }) endDate = '';
  @IsOptional() @IsString() @Matches(/^$|^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime deve estar vazio ou usar HH:mm.' }) startTime = '';
  @IsOptional() @IsString() @Matches(/^$|^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime deve estar vazio ou usar HH:mm.' }) endTime = '';
  @IsOptional() @IsString() location = '';
  @IsOptional() @IsString() address = '';
  @IsOptional() @IsString() category = '';
  @IsOptional() @IsIn(['GERAL','MINISTERIO','CELULA','CENACULO']) scope: 'GERAL'|'MINISTERIO'|'CELULA'|'CENACULO' = 'GERAL';
  @IsOptional() @IsString() ministryId = '';
  @IsOptional() @IsString() cellId = '';
  @IsOptional() @IsString() cenacleId = '';
  @IsOptional() @IsNumber() @Min(0) capacity = 0;
  @IsOptional() @IsString() registrationUrl = '';
  @IsOptional() @IsString() image = '';
  @IsOptional() @IsBoolean() confirmationRequired = true;
  @IsOptional() @IsBoolean() published = false;
}

export class UpdateEventDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate deve usar o formato YYYY-MM-DD.' }) startDate?: string;
  @IsOptional() @IsString() @Matches(/^$|^\d{4}-\d{2}-\d{2}$/, { message: 'endDate deve estar vazio ou usar o formato YYYY-MM-DD.' }) endDate?: string;
  @IsOptional() @IsString() @Matches(/^$|^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime deve estar vazio ou usar HH:mm.' }) startTime?: string;
  @IsOptional() @IsString() @Matches(/^$|^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime deve estar vazio ou usar HH:mm.' }) endTime?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsIn(['GERAL','MINISTERIO','CELULA','CENACULO']) scope?: 'GERAL'|'MINISTERIO'|'CELULA'|'CENACULO';
  @IsOptional() @IsString() ministryId?: string;
  @IsOptional() @IsString() cellId?: string;
  @IsOptional() @IsString() cenacleId?: string;
  @IsOptional() @IsNumber() @Min(0) capacity?: number;
  @IsOptional() @IsString() registrationUrl?: string;
  @IsOptional() @IsString() image?: string;
  @IsOptional() @IsBoolean() confirmationRequired?: boolean;
  @IsOptional() @IsBoolean() published?: boolean;
}
