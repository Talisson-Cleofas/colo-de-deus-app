import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  MISSIONARY_AGENDA_STATUSES,
  MISSIONARY_AGENDA_TYPES,
  type MissionaryAgendaStatus,
  type MissionaryAgendaType,
} from './missionary-agenda.types';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const OPTIONAL_DATE_PATTERN = /^$|^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const OPTIONAL_TIME_PATTERN = /^$|^([01]\d|2[0-3]):[0-5]\d$/;
const STATE_PATTERN = /^[A-Z]{2}$/;
const ZIP_PATTERN = /^$|^\d{5}-?\d{3}$/;

export class CreateMissionaryAgendaDto {
  @IsString() @MinLength(3) @MaxLength(150) title!: string;
  @IsOptional() @IsString() @MaxLength(3000) description = '';
  @IsIn(MISSIONARY_AGENDA_TYPES) type!: MissionaryAgendaType;
  @IsIn(MISSIONARY_AGENDA_STATUSES) status: MissionaryAgendaStatus = 'RASCUNHO';
  @IsString()
  @Matches(DATE_PATTERN, { message: 'startDate deve usar o formato YYYY-MM-DD.' })
  startDate!: string;
  @IsOptional()
  @IsString()
  @Matches(OPTIONAL_DATE_PATTERN, { message: 'endDate deve estar vazio ou usar YYYY-MM-DD.' })
  endDate = '';
  @IsString()
  @Matches(TIME_PATTERN, { message: 'startTime deve usar o formato HH:mm.' })
  startTime!: string;
  @IsOptional()
  @IsString()
  @Matches(OPTIONAL_TIME_PATTERN, { message: 'endTime deve estar vazio ou usar HH:mm.' })
  endTime = '';
  @IsString() @MinLength(2) @MaxLength(180) location!: string;
  @IsOptional() @IsString() @MaxLength(300) address = '';
  @IsOptional() @IsString() @MaxLength(100) neighborhood = '';
  @IsString() @MinLength(2) @MaxLength(100) city!: string;
  @IsString()
  @Matches(STATE_PATTERN, { message: 'state deve conter uma UF válida com 2 letras.' })
  state!: string;
  @IsOptional()
  @IsString()
  @Matches(ZIP_PATTERN, { message: 'zipCode deve usar o formato 00000-000.' })
  zipCode = '';
  @IsString() @MinLength(1) responsibleId!: string;
  @IsOptional() @IsString() ministryId = '';
  @IsOptional() @IsInt() @Min(0) @Max(100000) participantLimit = 0;
  @IsOptional() @IsString() @MaxLength(300) meetingPoint = '';
  @IsOptional() @IsString() @MaxLength(300) transport = '';
  @IsOptional() @IsString() @MaxLength(3000) notes = '';
  @IsOptional() @IsArray() @IsString({ each: true }) accompanyingIds: string[] = [];
  @IsOptional() @IsArray() @IsString({ each: true }) intercessorIds: string[] = [];
}

export class UpdateMissionaryAgendaDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(150) title?: string;
  @IsOptional() @IsString() @MaxLength(3000) description?: string;
  @IsOptional() @IsIn(MISSIONARY_AGENDA_TYPES) type?: MissionaryAgendaType;
  @IsOptional() @IsIn(MISSIONARY_AGENDA_STATUSES) status?: MissionaryAgendaStatus;
  @IsOptional()
  @IsString()
  @Matches(DATE_PATTERN, { message: 'startDate deve usar o formato YYYY-MM-DD.' })
  startDate?: string;
  @IsOptional()
  @IsString()
  @Matches(OPTIONAL_DATE_PATTERN, { message: 'endDate deve estar vazio ou usar YYYY-MM-DD.' })
  endDate?: string;
  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN, { message: 'startTime deve usar o formato HH:mm.' })
  startTime?: string;
  @IsOptional()
  @IsString()
  @Matches(OPTIONAL_TIME_PATTERN, { message: 'endTime deve estar vazio ou usar HH:mm.' })
  endTime?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(180) location?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(100) neighborhood?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) city?: string;
  @IsOptional()
  @IsString()
  @Matches(STATE_PATTERN, { message: 'state deve conter uma UF válida com 2 letras.' })
  state?: string;
  @IsOptional()
  @IsString()
  @Matches(ZIP_PATTERN, { message: 'zipCode deve usar o formato 00000-000.' })
  zipCode?: string;
  @IsOptional() @IsString() @MinLength(1) responsibleId?: string;
  @IsOptional() @IsString() ministryId?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100000) participantLimit?: number;
  @IsOptional() @IsString() @MaxLength(300) meetingPoint?: string;
  @IsOptional() @IsString() @MaxLength(300) transport?: string;
  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) accompanyingIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) intercessorIds?: string[];
}

export class ApproveMissionaryAgendaDto {
  @IsOptional() @IsString() @MaxLength(1000) notes = '';
}

export class RejectMissionaryAgendaDto {
  @IsString() @MinLength(3) @MaxLength(1000) reason!: string;
}

export class SendMissionaryAgendaDto {
  @IsArray() @IsString({ each: true }) memberIds!: string[];
}
