import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
export class GeocodeAddressDto {
  @IsString() @IsNotEmpty() @MaxLength(500) address!: string;
}
