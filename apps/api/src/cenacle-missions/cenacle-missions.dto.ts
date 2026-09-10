import { Transform, Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class SaveCenacleMissionDto {
  @IsString() @MinLength(3) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsString() date!: string;
  @IsString() time!: string;
  @IsString() @MinLength(2) location!: string;
  @IsOptional() @IsString() ministryId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) participantIds?: string[];
  @IsOptional() @IsString() status?: string;
}

export class SaveCenacleMissionFeedbackDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating!: number;
  @Transform(({ value }) => String(value || '').trim())
  @IsOptional()
  @IsString()
  strengths?: string;
  @Transform(({ value }) => String(value || '').trim())
  @IsOptional()
  @IsString()
  improvements?: string;
}
