import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SendBirthdayMessageDto {
  @IsString() @MinLength(3) @MaxLength(500) message!: string;
  @IsOptional() @IsIn(['ALL', 'LEADERS']) audience?: 'ALL' | 'LEADERS';
}
