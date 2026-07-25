import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, Max, Min } from 'class-validator';

export class UpdateLectioSettingsDto {
  @IsIn(['CNBB', 'CANCAO_NOVA']) primarySource!: 'CNBB' | 'CANCAO_NOVA';
  @IsIn(['CNBB', 'CANCAO_NOVA']) fallbackSource!: 'CNBB' | 'CANCAO_NOVA';
  @Transform(({ value }) => value === true || value === 'true') @IsBoolean() cnbbEnabled!: boolean;
  @Transform(({ value }) => value === true || value === 'true') @IsBoolean() cancaoNovaEnabled!: boolean;
  @Type(() => Number) @IsInt() @Min(1) @Max(30) retentionDays!: number;
  @Transform(({ value }) => value === true || value === 'true') @IsBoolean() deleteOldRecords!: boolean;
}
