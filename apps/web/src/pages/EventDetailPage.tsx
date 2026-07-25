import { AccessTimeOutlined, ArrowBack, CheckCircleOutline, EventAvailableOutlined, LocationOnOutlined, OpenInNewOutlined, PeopleAltOutlined, ReportProblemOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileUploader } from '../components/drive/FileUploader';
import { api, apiErrorMessage } from '../services/api';
import type { MissionEvent } from '../types';
import { formatDateSafe } from '../utils/date';

export function EventDetailPage() {
  const {id}=useParams();
  const navigate=useNavigate();
  const [event,setEvent]=useState<MissionEvent|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [open,setOpen]=useState(false);
  const [justification,setJustification]=useState('');
  const [saving,setSaving]=useState(false);

  const load=()=>{if(!id)return;setLoading(true);api.get<MissionEvent>(`/events/${id}`).then(({data})=>setEvent(data)).catch(()=>setError('Evento não encontrado.')).finally(()=>setLoading(false))};
  useEffect(()=>{load()},[id]);

  const respond=async(status:'CONFIRMED'|'JUSTIFIED')=>{if(!id)return;setSaving(true);setError('');try{const {data}=await api.post(`/events/${id}/response`,{status,justification:status==='JUSTIFIED'?justification:''});setMessage(data.message);setOpen(false);setJustification('')}catch(e){setError(apiErrorMessage(e))}finally{setSaving(false)}};

  if(loading)return <Box py={10} textAlign="center"><CircularProgress/></Box>;
  if(error&&!event)return <Alert severity="error">{error}</Alert>;
  if(!event)return null;

  const date=formatDateSafe(event.startDate,{dateStyle:'full'},'Data não informada');
  const mapQuery=[event.location,event.address].filter(Boolean).join(', ');
  const embedUrl=`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`;
  const navigationUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  return <Box maxWidth={1050}>
    <Button startIcon={<ArrowBack/>} onClick={()=>navigate(-1)} sx={{mb:2}}>Voltar</Button>
    {message&&<Alert severity="success" sx={{mb:2}} onClose={()=>setMessage('')}>{message}</Alert>}
    {error&&<Alert severity="error" sx={{mb:2}} onClose={()=>setError('')}>{error}</Alert>}
    <Card>
      {event.image&&<Box component="img" src={event.image} alt={event.title} sx={{width:'100%',maxHeight:420,objectFit:'cover',display:'block'}}/>}
      <CardContent sx={{p:{xs:3,md:5}}}>
        <Stack direction="row" gap={1} mb={2}><Chip label={event.category} color="primary"/>{event.featured&&<Chip label="Destaque" variant="outlined"/>}</Stack>
        <Typography variant="h3" fontSize={{xs:32,md:48}}>{event.title}</Typography>
        <Typography color="text.secondary" lineHeight={1.8} mt={2} fontSize={17}>{event.description}</Typography>
        <Divider sx={{my:4}}/>
        <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'repeat(2,1fr)'},gap:2}}>
          <Stack direction="row" gap={1.5}><EventAvailableOutlined color="primary"/><Box><Typography fontWeight={800}>Data</Typography><Typography color="text.secondary" textTransform="capitalize">{date}</Typography></Box></Stack>
          <Stack direction="row" gap={1.5}><AccessTimeOutlined color="primary"/><Box><Typography fontWeight={800}>Horário</Typography><Typography color="text.secondary">{event.startTime || 'Horário a definir'}{event.endTime ? ` às ${event.endTime}` : ''}</Typography></Box></Stack>
          <Stack direction="row" gap={1.5}><LocationOnOutlined color="primary"/><Box><Typography fontWeight={800}>Local</Typography><Typography color="text.secondary">{event.location}<br/>{event.address}</Typography></Box></Stack>
          <Stack direction="row" gap={1.5}><PeopleAltOutlined color="primary"/><Box><Typography fontWeight={800}>Capacidade</Typography><Typography color="text.secondary">{event.capacity?`${event.capacity} pessoas`:'Sem limite informado'}</Typography></Box></Stack>
        </Box>

        {mapQuery&&<><Divider sx={{my:4}}/><Typography variant="h5" mb={2}>Localização no mapa</Typography><Card variant="outlined" sx={{overflow:'hidden'}}><Box component="iframe" title={`Mapa de ${event.title}`} src={embedUrl} sx={{border:0,width:'100%',height:{xs:340,md:440}}} loading="lazy"/><CardContent><Button component="a" href={navigationUrl} target="_blank" rel="noreferrer" variant="outlined" startIcon={<OpenInNewOutlined/>}>Abrir rota no Google Maps</Button></CardContent></Card></>}

        {event.canManage&&<><Divider sx={{my:4}}/><Typography variant="h5" mb={1}>Imagem do evento</Typography><Typography color="text.secondary" mb={2}>Selecione uma foto da galeria ou tire uma foto com a câmera do dispositivo.</Typography><Box maxWidth={460}><FileUploader referenceId={event.id} category="EVENT_FILE" imagesOnly label="Selecionar imagem do dispositivo" onUploaded={()=>{setMessage('Imagem do evento atualizada.');load()}}/></Box></>}

        <Divider sx={{my:4}}/>
        <Typography variant="h6" mb={1}>Sua participação</Typography>
        <Typography color="text.secondary" mb={2}>Confirme sua presença ou envie uma justificativa quando não puder comparecer.</Typography>
        <Stack direction={{xs:'column',sm:'row'}} gap={1.5}><Button variant="contained" startIcon={<CheckCircleOutline/>} onClick={()=>void respond('CONFIRMED')} disabled={saving}>Confirmar presença</Button><Button variant="outlined" startIcon={<ReportProblemOutlined/>} onClick={()=>setOpen(true)}>Não poderei ir / Justificar</Button></Stack>
      </CardContent>
    </Card>
    <Dialog open={open} onClose={()=>setOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Justificar ausência</DialogTitle><DialogContent><TextField autoFocus fullWidth multiline minRows={4} label="Motivo da ausência" value={justification} onChange={e=>setJustification(e.target.value)} sx={{mt:1}} helperText="A justificativa será enviada aos líderes dos seus ministérios. Se você não estiver em um ministério, será enviada aos administradores."/></DialogContent><DialogActions><Button onClick={()=>setOpen(false)}>Cancelar</Button><Button variant="contained" disabled={saving||!justification.trim()} onClick={()=>void respond('JUSTIFIED')}>Enviar justificativa</Button></DialogActions></Dialog>
  </Box>;
}
