import { EventOutlined, GroupsOutlined, LocationOnOutlined, OpenInNewOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, List, ListItemButton, ListItemIcon, ListItemText, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { api, apiErrorMessage } from '../services/api';
import type { MissionEvent } from '../types';
import type { Community } from '../types/community';

type Place={id:string;title:string;subtitle:string;address:string;kind:'EVENT'|'CELL'|'CENACLE';latitude?:number;longitude?:number};
const mapsUrl=(p:Place)=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.latitude&&p.longitude?`${p.latitude},${p.longitude}`:p.address)}`;
const embedUrl=(p:Place)=>`https://maps.google.com/maps?q=${encodeURIComponent(p.latitude&&p.longitude?`${p.latitude},${p.longitude}`:p.address)}&z=14&output=embed`;

export function MapPage(){
 const [events,setEvents]=useState<MissionEvent[]>([]),[communities,setCommunities]=useState<Community[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[tab,setTab]=useState(0),[selectedId,setSelectedId]=useState('');
 useEffect(()=>{Promise.all([api.get<MissionEvent[]>('/events'),api.get<Community[]>('/communities')]).then(([e,c])=>{setEvents(e.data);setCommunities(c.data)}).catch(e=>setError(apiErrorMessage(e))).finally(()=>setLoading(false))},[]);
 const places=useMemo<Place[]>(()=>{
  const ev=events.filter(e=>e.address||e.location).map(e=>({id:`event-${e.id}`,title:e.title,subtitle:e.category||'Evento',address:[e.location,e.address].filter(Boolean).join(', '),kind:'EVENT' as const}));
  const cs=communities.filter(c=>c.address||Number.isFinite(c.latitude)).map(c=>({id:`community-${c.id}`,title:c.name,subtitle:c.type==='CELL'?'Célula':'Cenáculo',address:[c.address,c.neighborhood,c.city,c.state].filter(Boolean).join(', '),kind:c.type,latitude:c.latitude,longitude:c.longitude}));
  return tab===1?ev:tab===2?cs.filter(p=>p.kind==='CELL'):tab===3?cs.filter(p=>p.kind==='CENACLE'):[...ev,...cs];
 },[events,communities,tab]);
 useEffect(()=>{if(!places.some(p=>p.id===selectedId))setSelectedId(places[0]?.id||'')},[places,selectedId]);
 const selected=places.find(p=>p.id===selectedId)||places[0];
 if(loading)return <Box py={10} textAlign="center"><CircularProgress/></Box>;
 return <Box><Typography variant="h4">Mapa da missão</Typography><Typography color="text.secondary" mt={.5} mb={2}>Visualize eventos, células e cenáculos e abra a rota no Google Maps.</Typography>{error&&<Alert severity="error" sx={{mb:2}}>{error}</Alert>}
 <Card sx={{mb:2}}><Tabs value={tab} onChange={(_,v)=>setTab(v)} variant="scrollable"><Tab label="Todos"/><Tab label="Eventos"/><Tab label="Células"/><Tab label="Cenáculos"/></Tabs></Card>
 {!selected?<Alert severity="info">Nenhuma localização cadastrada.</Alert>:<Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',lg:'360px minmax(0,1fr)'},gap:2}}>
  <Card sx={{maxHeight:650,overflow:'auto'}}><List>{places.map(p=><ListItemButton key={p.id} selected={p.id===selected.id} onClick={()=>setSelectedId(p.id)}><ListItemIcon>{p.kind==='EVENT'?<EventOutlined color="primary"/>:p.kind==='CELL'?<GroupsOutlined color="primary"/>:<LocationOnOutlined color="primary"/>}</ListItemIcon><ListItemText primary={p.title} secondary={p.address}/><Chip size="small" label={p.subtitle}/></ListItemButton>)}</List></Card>
  <Card sx={{overflow:'hidden'}}><Box component="iframe" title={`Mapa de ${selected.title}`} src={embedUrl(selected)} sx={{border:0,width:'100%',height:{xs:420,md:540}}} loading="lazy"/><CardContent><Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" gap={2}><Box><Typography variant="h6">{selected.title}</Typography><Typography color="text.secondary">{selected.address}</Typography></Box><Button component="a" href={mapsUrl(selected)} target="_blank" rel="noreferrer" variant="contained" startIcon={<OpenInNewOutlined/>}>Abrir rota</Button></Stack></CardContent></Card>
 </Box>}</Box>
}
