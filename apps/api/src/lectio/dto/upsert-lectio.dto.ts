import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertLectioDto {
  @IsOptional() @IsString() id?: string;
  @IsDateString() date!: string;
  @IsString() @MaxLength(240) title!: string;
  @IsOptional() @IsString() celebration?: string;
  @IsOptional() @IsString() liturgicalTime?: string;
  @IsOptional() @IsString() liturgicalColor?: string;
  @IsOptional() @IsString() firstReadingReference?: string;
  @IsOptional() @IsString() firstReadingTitle?: string;
  @IsOptional() @IsString() firstReadingText?: string;
  @IsOptional() @IsString() psalmReference?: string;
  @IsOptional() @IsString() psalmResponse?: string;
  @IsOptional() @IsString() psalmText?: string;
  @IsOptional() @IsString() secondReadingReference?: string;
  @IsOptional() @IsString() secondReadingTitle?: string;
  @IsOptional() @IsString() secondReadingText?: string;
  @IsOptional() @IsString() acclamationReference?: string;
  @IsOptional() @IsString() acclamationText?: string;
  @IsOptional() @IsString() gospelReference?: string;
  @IsOptional() @IsString() gospelTitle?: string;
  @IsOptional() @IsString() gospelText?: string;
  @IsOptional() @IsString() entranceAntiphon?: string;
  @IsOptional() @IsString() communionAntiphon?: string;
  @IsOptional() @IsString() reflection?: string;
  @IsOptional() @IsString() prayer?: string;
  @IsOptional() @IsIn(['CNBB', 'CANCAO_NOVA', 'MANUAL']) source?: 'CNBB' | 'CANCAO_NOVA' | 'MANUAL';
  @IsOptional() @IsIn(['SINCRONIZADA', 'FONTE_ALTERNATIVA', 'REVISADA', 'MANUAL', 'ERRO']) status?: 'SINCRONIZADA' | 'FONTE_ALTERNATIVA' | 'REVISADA' | 'MANUAL' | 'ERRO';
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() protected?: boolean;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() active?: boolean;
}
