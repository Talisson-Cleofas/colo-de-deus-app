export type FileCategory='MEMBER_PHOTO'|'CELL_FILE'|'CENACLE_FILE'|'EVENT_FILE'|'SOMA_RECEIPT'|'LECTIO_PDF'|'REPORT'|'GENERIC';
export type FileMetadataDto={
  id:string;driveFileId:string;name:string;originalName?:string;storedName?:string;mimeType:string;size:number;checksum?:string;
  category:FileCategory;referenceId:string;folderId?:string;webViewLink:string;downloadUrl?:string;public?:boolean;
  uploadedBy:string;createdAt:string;updatedAt?:string;deleted:boolean;deletedAt?:string;
};
