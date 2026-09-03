import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateEvaluationDto {
  @IsString() @MinLength(3) @MaxLength(120) title!: string;
  @IsInt() @Min(2020) @Max(2100) year!: number;
}

export class AnswerEvaluationDto {
  @IsString() @MaxLength(180) targetId!: string;
  @IsArray() @ArrayMinSize(4) @ArrayMaxSize(4)
  @IsInt({ each: true }) @Min(1, { each: true }) @Max(5, { each: true }) scores!: number[];
  @IsString() @MaxLength(2000) strengths!: string;
  @IsString() @MaxLength(2000) improvements!: string;
  @IsString() @MaxLength(3000) reflection!: string;
}
