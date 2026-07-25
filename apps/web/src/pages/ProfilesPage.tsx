import { AddOutlined, DeleteOutline, EditOutlined, PowerSettingsNew, RefreshOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, apiErrorMessage } from '../services/api';

type Profile={id:string;code:string;name:string;description:string;level:number;active:boolean};
type Form={code:string;name:string;description:string;level:number;active:boolean};
const empty:Form={code:'',name:'',description:'',level:10,active:true};
const labels:Record<string,string>={DEVELOPER:'Desenvolvedor',MISSION_LEADER:'Líder Missão',MINISTRY_LEADER:'Líder Ministério',CELL_LEADER:'Líder Célula',MEMBER:'Membro'};

export function ProfilesPage(){
 const {hasRole}=useAuth(); const canEdit=hasRole('DEVELOPER');
 const [items,setItems]=useState<Profile[]>([]); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [error,setError]=useState('');
 const [open,setOpen]=useState(false); const [editing,setEditing]=useState<Profile|null>(null); const [form,setForm]=useState<Form>(empty);
 const load=useCallback(async()=>{setLoading(true);setError('');try{setItems((await api.get<Profile[]>('/profiles')).data);}catch(e){setError(apiErrorMessage(e));}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 const create=()=>{setEditing(null);setForm(empty);setOpen(true)};
 const edit=(p:Profile)=>{setEditing(p);setForm({code:p.code,name:p.name,description:p.description,level:p.level,active:p.active});setOpen(true)};
 const save=async()=>{setSaving(true);setError('');try{if(editing)await api.patch(`/profiles/${editing.id}`,form);else await api.post('/profiles',form);setOpen(false);await load();}catch(e){setError(apiErrorMessage(e));}finally{setSaving(false)}};
 const status=async(p:Profile)=>{setSaving(true);setError('');try{await api.patch(`/profiles/${p.id}/status`,{active:!p.active});await load();}catch(e){setError(apiErrorMessage(e));}finally{setSaving(false)}};
 const remove=async(p:Profile)=>{if(!window.confirm(`Excluir o perfil “${p.name}”?`))return;setSaving(true);setError('');try{await api.delete(`/profiles/${p.id}`);await load();}catch(e){setError(apiErrorMessage(e));}finally{setSaving(false)}};
 const seed=async()=>{setSaving(true);try{await api.post('/profiles/seed/default');await load();}catch(e){setError(apiErrorMessage(e));}finally{setSaving(false)}};
 return <Box>
  <Stack direction={{xs:'column',md:'row'}} justifyContent="space-between" gap={2} mb={3}><Box><Typography variant="h4" fontWeight={800}>Perfis</Typography><Typography color="text.secondary">Crie e administre os níveis reais de acesso da missão.</Typography></Box>{canEdit&&<Stack direction="row" gap={1}><Button variant="outlined" startIcon={<RefreshOutlined/>} onClick={()=>void seed()} disabled={saving}>Restaurar padrões</Button><Button variant="contained" startIcon={<AddOutlined/>} onClick={create}>Criar perfil</Button></Stack>}</Stack>
  {error&&<Alert severity="error" sx={{mb:2}}>{error}</Alert>}
  {loading?<Box textAlign="center" py={10}><CircularProgress/></Box>:<Stack gap={1.5}>{items.map(p=><Card key={p.id} variant="outlined" sx={{opacity:p.active?1:.62}}><CardContent><Stack direction={{xs:'column',md:'row'}} alignItems={{md:'center'}} gap={2}><Box flex={1}><Stack direction="row" gap={1} alignItems="center" flexWrap="wrap"><Typography variant="h6" fontWeight={800}>{p.name||labels[p.code]||p.code}</Typography><Chip size="small" label={p.code}/><Chip size="small" label={`Nível ${p.level}`}/><Chip size="small" color={p.active?'success':'default'} label={p.active?'Ativo':'Inativo'}/></Stack><Typography color="text.secondary" mt={.75}>{p.description||'Sem descrição.'}</Typography></Box>{canEdit&&<Stack direction="row"><Tooltip title={p.active?'Desativar':'Ativar'}><IconButton onClick={()=>void status(p)} disabled={saving}><PowerSettingsNew/></IconButton></Tooltip><Tooltip title="Editar"><IconButton onClick={()=>edit(p)}><EditOutlined/></IconButton></Tooltip><Tooltip title="Excluir"><IconButton color="error" onClick={()=>void remove(p)} disabled={saving}><DeleteOutline/></IconButton></Tooltip></Stack>}</Stack></CardContent></Card>)}</Stack>}
  <Dialog open={open} onClose={()=>!saving&&setOpen(false)} fullWidth maxWidth="sm"><DialogTitle>{editing?'Editar perfil':'Criar perfil'}</DialogTitle><DialogContent><Stack gap={2} mt={1}><TextField required label="Nome" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><TextField required label="Código" helperText="Use letras e sublinhado. Ex.: COORDENADOR_FORMACAO" value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase().replace(/\s+/g,'_')})}/><TextField label="Descrição" multiline minRows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><TextField type="number" label="Nível hierárquico" value={form.level} onChange={e=>setForm({...form,level:Number(e.target.value)})}/><Stack direction="row" alignItems="center"><Switch checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/><Typography>{form.active?'Perfil ativo':'Perfil inativo'}</Typography></Stack></Stack></DialogContent><DialogActions><Button onClick={()=>setOpen(false)}>Cancelar</Button><Button variant="contained" onClick={()=>void save()} disabled={saving||!form.name.trim()||!form.code.trim()}>{saving?'Salvando...':'Salvar'}</Button></DialogActions></Dialog>
 </Box>
}
