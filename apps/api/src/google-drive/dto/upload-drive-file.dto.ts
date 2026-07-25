import { IsBase64, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
export class UploadDriveFileDto{
 @IsString() @IsNotEmpty() @MaxLength(200) fileName!:string;
 @IsString() @IsNotEmpty() mimeType!:string;
 @IsBase64() contentBase64!:string;
 @IsString() @IsOptional() referenceId?:string;
 @IsString() @IsOptional() @IsIn(['MEMBER_PHOTO','CELL_FILE','CENACLE_FILE','EVENT_FILE','SOMA_RECEIPT','LECTIO_PDF','REPORT','GENERIC']) category?:string;
}
