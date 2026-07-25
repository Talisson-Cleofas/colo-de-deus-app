import { CloudUploadOutlined, DeleteOutline, PhotoCameraOutlined } from '@mui/icons-material';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../services/api';

type UploadedFile = { id:string; name:string; mimeType:string; webViewLink:string; downloadUrl?:string };

type Props = {
  referenceId?: string;
  category?: 'MEMBER_PHOTO'|'CELL_FILE'|'CENACLE_FILE'|'EVENT_FILE'|'SOMA_RECEIPT'|'LECTIO_PDF'|'REPORT'|'GENERIC';
  imagesOnly?: boolean;
  label?: string;
  onUploaded?: (file:UploadedFile)=>void;
};

export function FileUploader({referenceId='',category='GENERIC',imagesOnly=false,label='Enviar do dispositivo',onUploaded}:Props){
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState('');
  const [message,setMessage]=useState('');
  const [uploading,setUploading]=useState(false);

  useEffect(()=>{
    if(!file?.type.startsWith('image/')){setPreview('');return;}
    const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);
  },[file]);

  const upload=async()=>{
    if(!file||uploading)return;
    setUploading(true);setMessage('');
    try{
      const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.onerror=reject;reader.readAsDataURL(file)});
      const {data}=await api.post<UploadedFile>('/drive/upload',{fileName:file.name,mimeType:file.type,contentBase64:base64,referenceId,category});
      setMessage('Arquivo enviado com sucesso.');onUploaded?.(data);setFile(null);
    }catch(e){setMessage(apiErrorMessage(e))}finally{setUploading(false)}
  };

  return <Stack gap={1.25}>
    <Button component="label" variant="outlined" startIcon={<PhotoCameraOutlined/>}>
      {label}
      <input hidden type="file" accept={imagesOnly?'image/jpeg,image/png,image/webp':'image/jpeg,image/png,image/webp,application/pdf'} capture={imagesOnly?'environment':undefined} onChange={e=>setFile(e.target.files?.[0]||null)}/>
    </Button>
    {file&&<Box sx={{border:'1px solid',borderColor:'divider',borderRadius:2,p:1.5}}>
      {preview&&<Box component="img" src={preview} alt="Pré-visualização" sx={{display:'block',width:'100%',maxHeight:260,objectFit:'cover',borderRadius:1.5,mb:1}}/>}
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Typography variant="body2" noWrap>{file.name}</Typography>
        <Button size="small" color="error" startIcon={<DeleteOutline/>} onClick={()=>setFile(null)}>Remover</Button>
      </Stack>
    </Box>}
    <Button variant="contained" startIcon={uploading?<CircularProgress size={18}/>:<CloudUploadOutlined/>} disabled={!file||uploading} onClick={()=>void upload()}>{uploading?'Enviando...':'Enviar arquivo'}</Button>
    {message&&<Alert severity={message.includes('sucesso')?'success':'error'}>{message}</Alert>}
  </Stack>
}
