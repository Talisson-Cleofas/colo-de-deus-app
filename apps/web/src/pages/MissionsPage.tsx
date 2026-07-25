import { AddOutlined, AccountTreeOutlined, EditOutlined, SyncOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, apiErrorMessage } from '../services/api';
import type { Mission } from '../types';

type MissionForm={name:string;acronym:string;description:string;city:string;state:string;country:string};
const empty:MissionForm={name:'',acronym:'',description:'',city:'',state:'',country:'Brasil'};

export function MissionsPage(){
  const {hasRole}=useAuth(); const canManage=hasRole('ADMIN','DEVELOPER');
  const [items,setItems]=useState<Mission[]>([]); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);
  const [error,setError]=useState(''); const [open,setOpen]=useState(false); const [editing,setEditing]=useState<Mission|null>(null); const [form,setForm]=useState<MissionForm>(empty);
  const load=useCallback(async()=>{setLoading(true);setError('');try{setItems((await api.get<Mission[]>('/missions')).data);}catch(e){setError(apiErrorMessage(e));}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  const startCreate=()=>{setEditing(null);setForm(empty);setOpen(true);};
  const startEdit=(m:Mission)=>{setEditing(m);setForm({name:m.name,acronym:m.acronym,description:m.description,city:m.city,state:m.state,country:m.country});setOpen(true);};
  const save=async()=>{if(!form.name.trim())return;setSaving(true);setError('');try{if(editing)await api.patch(`/missions/${editing.id}`,form);else await api.post('/missions',form);setOpen(false);await load();}catch(e){setError(apiErrorMessage(e));}finally{setSaving(false);}};
  const seed=async()=>{setSaving(true);setError('');try{await api.post('/missions/seed/default');await load();}catch(e){setError(apiErrorMessage(e));}finally{setSaving(false);}};
  return <Box>
    <Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" gap={2} mb={3}><Box><Typography variant="h4">Missões</Typography><Typography color="text.secondary">Estrutura territorial e organizacional da Comunidade Colo de Deus.</Typography></Box>{canManage&&<Stack direction="row" gap={1}><Button variant="outlined" startIcon={<SyncOutlined/>} onClick={()=>void seed()} disabled={saving}>Aplicar seed</Button><Button variant="contained" startIcon={<AddOutlined/>} onClick={startCreate}>Nova missão</Button></Stack>}</Stack>
    {error&&<Alert severity="error" sx={{mb:2}}>{error}</Alert>}
    {loading?<Box textAlign="center" py={10}><CircularProgress/></Box>:<Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',md:'repeat(2,1fr)',xl:'repeat(3,1fr)'},gap:2}}>{items.map(m=><Card key={m.id} sx={{p:3}}><Stack direction="row" justifyContent="space-between"><Box sx={{width:52,height:52,borderRadius:2,bgcolor:'rgba(158,105,57,.18)',display:'grid',placeItems:'center'}}><AccountTreeOutlined color="primary"/></Box>{canManage&&<IconButton onClick={()=>startEdit(m)}><EditOutlined/></IconButton>}</Stack><Stack direction="row" gap={1} alignItems="center" mt={2}><Typography variant="h5">{m.name}</Typography>{m.acronym&&<Chip size="small" label={m.acronym}/>}</Stack><Typography color="text.secondary" minHeight={48} mt={1}>{m.description||'Sem descrição.'}</Typography><Typography mt={2}>{[m.city,m.state,m.country].filter(Boolean).join(' • ')}</Typography><Chip sx={{mt:2}} label={`${m.ministriesCount} ministérios`} variant="outlined"/></Card>)}</Box>}
    <Dialog open={open} onClose={()=>!saving&&setOpen(false)} fullWidth maxWidth="sm"><DialogTitle>{editing?'Editar missão':'Nova missão'}</DialogTitle><DialogContent><Stack gap={2} mt={1}><TextField required label="Nome" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><TextField label="Sigla" value={form.acronym} onChange={e=>setForm({...form,acronym:e.target.value})}/><TextField label="Descrição" multiline minRows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><Stack direction={{xs:'column',sm:'row'}} gap={2}><TextField fullWidth label="Cidade" value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/><TextField fullWidth label="Estado" value={form.state} onChange={e=>setForm({...form,state:e.target.value})}/></Stack><TextField label="País" value={form.country} onChange={e=>setForm({...form,country:e.target.value})}/></Stack></DialogContent><DialogActions><Button onClick={()=>setOpen(false)}>Cancelar</Button><Button variant="contained" onClick={()=>void save()} disabled={saving||!form.name.trim()}>Salvar</Button></DialogActions></Dialog>
  </Box>;
}
