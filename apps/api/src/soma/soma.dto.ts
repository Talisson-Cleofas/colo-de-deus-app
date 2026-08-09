import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateSomaSettingsDto {
  @IsOptional() @IsString() @MaxLength(120) campaignName?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(180) pixKey?: string;
  @IsOptional() @IsString() @MaxLength(40) pixKeyType?: string;
  @IsOptional() @IsString() @MaxLength(180) beneficiary?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100000000) goal?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() @MaxLength(120) pixBank?: string;
  @IsOptional() @IsString() @MaxLength(40) pixAgency?: string;
  @IsOptional() @IsString() @MaxLength(80) pixAccount?: string;
  @IsOptional() @IsString() @MaxLength(30) pixCnpj?: string;
  @IsOptional() @IsString() @MaxLength(500) subscriptionUrl?: string;
  @IsOptional() @IsString() @MaxLength(500) pixQrCodeUrl?: string;
}

export class CreateContributionDto {
  @Type(() => Number) @IsNumber() @Min(1) @Max(1000000) amount!: number;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}$/) referenceMonth?: string;
  @IsOptional() @IsIn(['PIX', 'CARTAO', 'TED', 'DINHEIRO']) method?: string;
  @IsOptional() @IsString() @MaxLength(500) receiptUrl?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class CheckoutInputDto {
  @IsOptional() @IsString() @MaxLength(100) memberId?: string;
  @IsOptional() @IsString() @MaxLength(180) name?: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @Type(() => Number) @IsNumber() @Min(1) @Max(1000000) amount!: number;
  @IsOptional() @Matches(/^\d{4}-\d{2}$/) competence?: string;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
}

export class CreateSubscriptionDto {
  @Type(() => Number) @IsNumber() @Min(1) @Max(1000000) amount!: number;
  @IsOptional() @IsString() @MaxLength(120) reason?: string;
}

class MercadoPagoWebhookDataDto {
  @IsOptional() id?: string | number;
}

export class MercadoPagoWebhookDto {
  @IsOptional() id?: number | string;
  @IsOptional() @IsString() @MaxLength(100) type?: string;
  @IsOptional() @IsString() @MaxLength(160) action?: string;
  @IsOptional() @IsBoolean() live_mode?: boolean;
  @IsOptional() @IsDateString() date_created?: string;
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MercadoPagoWebhookDataDto)
  data?: MercadoPagoWebhookDataDto;
}
