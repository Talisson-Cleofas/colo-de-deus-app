import { IsBoolean, IsOptional, IsString } from 'class-validator';
export class UpsertIntegrationDto {
  @IsString() module!: string;
  @IsString() key!: string;
  @IsString() value!: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
