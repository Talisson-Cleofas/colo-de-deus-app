import { IsBoolean, IsEmail, IsHexColor, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateGeneralSettingsDto {
  @IsOptional() @IsString() @MaxLength(120) missionName?: string;
  @IsOptional() @IsString() @MaxLength(120) communityName?: string;
  @IsOptional() @IsString() @MaxLength(500) primaryLogo?: string;
  @IsOptional() @IsString() @MaxLength(500) whiteLogo?: string;
  @IsOptional() @IsString() @MaxLength(500) coverImage?: string;
  @IsOptional() @IsHexColor() primaryColor?: string;
  @IsOptional() @IsHexColor() secondaryColor?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(2) state?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(250) website?: string;
  @IsOptional() @IsString() @MaxLength(120) instagram?: string;
  @IsOptional() @IsBoolean() birthdaysEnabled?: boolean;
  @IsOptional() @IsBoolean() showBirthdayAge?: boolean;
  @IsOptional() @IsBoolean() birthdayNotificationsEnabled?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(30) birthdayReminderDays?: number;
  @IsOptional() @IsIn(['ALL', 'LEADERS']) birthdayNotificationAudience?: 'ALL' | 'LEADERS';
  @IsOptional() @IsString() @MaxLength(500) birthdayDefaultMessage?: string;
  @IsOptional() @IsString() @MaxLength(500) birthdayLeaderReminderMessage?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) absenceLimit?: number;
  @IsOptional() @IsBoolean() justificationsEnabled?: boolean;
  @IsOptional() @IsBoolean() eventConfirmationRequired?: boolean;
  @IsOptional() @IsIn(['GENERAL', 'MINISTRY', 'CELL', 'CENACLE']) eventDefaultScope?: 'GENERAL' | 'MINISTRY' | 'CELL' | 'CENACLE';
  @IsOptional() @IsInt() @Min(15) @Max(1440) eventDefaultDurationMinutes?: number;
  @IsOptional() @IsInt() @Min(0) @Max(30) eventReminderDays?: number;
}
