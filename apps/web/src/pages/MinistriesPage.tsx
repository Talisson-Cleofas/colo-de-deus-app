import {
  AddOutlined, CheckCircleOutline, CloseOutlined, DeleteOutline, EditOutlined,
  GroupsOutlined, HowToRegOutlined, PersonAddAltOutlined, VolunteerActivismOutlined,
} from '@mui/icons-material';
import {
  Alert, Avatar, Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControlLabel, IconButton, MenuItem,
  Paper, Snackbar, Stack, Switch, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, apiErrorMessage } from '../services/api';
import type { Member, Mission, Ministry, MinistryAttendance, MinistryMember } from '../types';

type MinistryForm = {
  missionId:string; name:string; description:string; leaderEmail:string; viceLeaderEmail:string;
  color:string; icon:string; type:string; notes:string; active:boolean;
};
type DetailPayload={ministry:Ministry;members:MinistryMember[];attendances:MinistryAttendance[]};

const emptyForm: MinistryForm = {missionId:'missao-brasilia',name:'',description:'',leaderEmail:'',viceLeaderEmail:'',color:'#9e6939',icon:'',type:'OUTRO',notes:'',active:true};

export function MinistriesPage() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN','DEVELOPER');
  const canManage = hasRole('ADMIN','DEVELOPER','MINISTRY_LEADER');
  const [ministries,setMinistries]=useState<Ministry[]>([]);
  const [missions,setMissions]=useState<Mission[]>([]);
  const [members,setMembers]=useState<Member[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const [open,setOpen]=useState(false);
  const [editing,setEditing]=useState<Ministry|null>(null);
  const [form,setForm]=useState<MinistryForm>(emptyForm);
  const [showInactive,setShowInactive]=useState(false);
  const [detail,setDetail]=useState<DetailPayload|null>(null);
  const [detailOpen,setDetailOpen]=useState(false);
  const [detailTab,setDetailTab]=useState(0);
  const [detailLoading,setDetailLoading]=useState(false);
  const [selectedMemberId,setSelectedMemberId]=useState('');
  const [attendanceMemberId,setAttendanceMemberId]=useState('');
  const [attendanceDate,setAttendanceDate]=useState(new Date().toISOString().slice(0,10));
  const [attendancePresent,setAttendancePresent]=useState(true);
  const [attendanceJustification,setAttendanceJustification]=useState('');

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const requests:Promise<unknown>[]=[api.get<Ministry[]>(`/ministries?includeInactive=${isAdmin&&showInactive}`),api.get<Mission[]>('/missions')];
      if(canManage) requests.push(api.get<{members:Member[]}>('/members?limit=500'));
      const results=await Promise.all(requests);
      setMinistries((results[0] as {data:Ministry[]}).data);
      setMissions((results[1] as {data:Mission[]}).data);
      if(canManage&&results[2]) setMembers((results[2] as {data:{members:Member[]}}).data.members);
    }catch(e){setError(apiErrorMessage(e));}finally{setLoading(false);}
  },[isAdmin,canManage,showInactive]);
  useEffect(()=>{void load();},[load]);

  const leaderOptions=useMemo(()=>members.filter(m=>m.active&&['DEVELOPER','ADMIN','MINISTRY_LEADER'].includes(m.profile)),[members]);
  const startCreate=()=>{setEditing(null);setForm(emptyForm);setOpen(true);};
  const startEdit=(m:Ministry)=>{setEditing(m);setForm({missionId:m.missionId||'missao-brasilia',name:m.name,description:m.description,leaderEmail:m.leaderEmail,viceLeaderEmail:m.viceLeaderEmail,color:m.color||'#9e6939',icon:m.icon,type:m.type||'OUTRO',notes:m.notes,active:m.active});setOpen(true);};

  const save=async()=>{
    if(!form.name.trim()){setError('Informe o nome do ministério.');return;}
    setSaving(true);setError('');
    try{
      const payload={...form,name:form.name.trim()};
      if(editing) await api.patch(`/ministries/${editing.id}`,payload); else await api.post('/ministries',payload);
      setSuccess(editing?'Ministério atualizado com sucesso.':'Ministério criado com sucesso.');setOpen(false);await load();
      if(editing && detail?.ministry.id===editing.id) await openDetail(editing);
    }catch(e){setError(apiErrorMessage(e));}finally{setSaving(false);}
  };

  const deactivate=async(m:Ministry)=>{
    if(!window.confirm(`Desativar o ministério “${m.name}”?`))return;
    try{await api.delete(`/ministries/${m.id}`);setSuccess('Ministério desativado.');await load();}catch(e){setError(apiErrorMessage(e));}
  };

  const openDetail=async(m:Ministry)=>{
    setDetailOpen(true);setDetailLoading(true);setDetailTab(0);setError('');
    try{const {data}=await api.get<DetailPayload>(`/ministries/${m.id}`);setDetail(data);}catch(e){setError(apiErrorMessage(e));setDetailOpen(false);}finally{setDetailLoading(false);}
  };
  const refreshDetail=async()=>{if(detail) await openDetail(detail.ministry);};

  const addMember=async()=>{
    if(!detail||!selectedMemberId)return;
    setSaving(true);
    try{await api.post(`/ministries/${detail.ministry.id}/members`,{memberId:selectedMemberId,function:'MEMBRO'});setSelectedMemberId('');setSuccess('Membro vinculado ao ministério.');await refreshDetail();await load();}catch(e){setError(apiErrorMessage(e));}finally{setSaving(false);}
  };
  const removeMember=async(member:MinistryMember)=>{
    if(!detail||!window.confirm(`Remover ${member.name} deste ministério?`))return;
    try{await api.delete(`/ministries/${detail.ministry.id}/members/${member.memberId}`);setSuccess('Membro removido do ministério.');await refreshDetail();await load();}catch(e){setError(apiErrorMessage(e));}
  };
  const registerAttendance=async()=>{
    if(!detail||!attendanceMemberId)return;
    setSaving(true);
    try{await api.post(`/ministries/${detail.ministry.id}/attendance`,{memberId:attendanceMemberId,date:attendanceDate,present:attendancePresent,justification:attendanceJustification});setAttendanceJustification('');setSuccess('Presença registrada com sucesso.');await refreshDetail();}catch(e){setError(apiErrorMessage(e));}finally{setSaving(false);}
  };

  const linkedIds=new Set(detail?.members.map(m=>m.memberId)??[]);
  const availableMembers=members.filter(m=>m.active&&!linkedIds.has(m.id));
  const canEditCard=(m:Ministry)=>isAdmin||(user?.profile==='MINISTRY_LEADER'&&m.leaderId===user.memberId);

  return <Box>
    <Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" alignItems={{xs:'stretch',sm:'center'}} gap={2} mb={3}>
      <Box><Typography variant="h4">Ministérios</Typography><Typography color="text.secondary">Liderança, membros, presenças e justificativas em um só lugar.</Typography></Box>
      {isAdmin&&<Button variant="contained" startIcon={<AddOutlined/>} onClick={startCreate}>Novo Ministério</Button>}
    </Stack>
    {isAdmin&&<FormControlLabel sx={{mb:2}} control={<Switch checked={showInactive} onChange={e=>setShowInactive(e.target.checked)}/>} label="Exibir ministérios inativos"/>}
    {error&&<Alert severity="error" sx={{mb:2}} onClose={()=>setError('')}>{error}</Alert>}

    {loading?<Box textAlign="center" py={10}><CircularProgress/></Box>:ministries.length===0?<Card sx={{p:5,textAlign:'center'}}><VolunteerActivismOutlined sx={{fontSize:54,color:'text.secondary'}}/><Typography variant="h6" mt={1}>Nenhum ministério cadastrado</Typography>{isAdmin&&<Button sx={{mt:2}} variant="contained" onClick={startCreate}>Criar ministério</Button>}</Card>:
      <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',md:'repeat(2,1fr)',xl:'repeat(3,1fr)'},gap:2}}>{ministries.map(m=><Card key={m.id} sx={{p:3,opacity:m.active?1:.62}}>
        <Stack direction="row" justifyContent="space-between" alignItems="center"><Box sx={{width:52,height:52,borderRadius:2,bgcolor:'rgba(158,105,57,.18)',display:'grid',placeItems:'center',color:m.color||'primary.main'}}><VolunteerActivismOutlined/></Box><Stack direction="row" alignItems="center"><Chip label={m.active?'Ativo':'Inativo'} color={m.active?'success':'default'} size="small"/>{canEditCard(m)&&<Tooltip title="Editar"><IconButton onClick={()=>startEdit(m)}><EditOutlined/></IconButton></Tooltip>}{isAdmin&&m.active&&<Tooltip title="Desativar"><IconButton color="error" onClick={()=>void deactivate(m)}><DeleteOutline/></IconButton></Tooltip>}</Stack></Stack>
        <Typography variant="h5" mt={2}>{m.name}</Typography><Typography variant="caption" color="text.secondary">{missions.find(item=>item.id===m.missionId)?.name||'Missão Brasília'}</Typography><Typography color="text.secondary" minHeight={48}>{m.description||'Sem descrição.'}</Typography>
        <Stack gap={.5} mt={2}><Typography fontWeight={600}>Líder: {m.leaderName||'Não definido'}</Typography><Typography color="text.secondary">Vice-líder: {m.viceLeaderName||'Não definido'}</Typography></Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}><Chip icon={<GroupsOutlined/>} label={`${m.membersCount} membros`} variant="outlined"/><Button size="small" onClick={()=>void openDetail(m)} disabled={!canEditCard(m)}>Gerenciar</Button></Stack>
      </Card>)}</Box>}

    <Dialog open={open} onClose={()=>!saving&&setOpen(false)} fullWidth maxWidth="sm"><DialogTitle>{editing?'Editar ministério':'Novo ministério'}</DialogTitle><DialogContent><Stack gap={2} mt={1}>
      <TextField select label="Missão" value={form.missionId} onChange={e=>setForm({...form,missionId:e.target.value})}>{missions.map(m=><MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}</TextField><TextField required label="Nome" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><TextField label="Descrição" multiline minRows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
      {isAdmin&&<><TextField select label="Líder de Ministério" value={form.leaderEmail} onChange={e=>setForm({...form,leaderEmail:e.target.value})}><MenuItem value="">Não definido</MenuItem>{leaderOptions.map(m=><MenuItem key={m.id} value={m.email}>{m.name} — {m.email}</MenuItem>)}</TextField><TextField select label="Vice-líder" value={form.viceLeaderEmail} onChange={e=>setForm({...form,viceLeaderEmail:e.target.value})}><MenuItem value="">Não definido</MenuItem>{members.filter(m=>m.active).map(m=><MenuItem key={m.id} value={m.email}>{m.name} — {m.email}</MenuItem>)}</TextField></>}
      <Stack direction={{xs:'column',sm:'row'}} gap={2}><TextField fullWidth label="Cor" type="color" value={form.color} onChange={e=>setForm({...form,color:e.target.value})} InputLabelProps={{shrink:true}}/><TextField fullWidth label="Tipo" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}/></Stack>
      <TextField label="Observações" multiline minRows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>{editing&&isAdmin&&<FormControlLabel control={<Switch checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/>} label="Ministério ativo"/>}
    </Stack></DialogContent><DialogActions><Button onClick={()=>setOpen(false)} disabled={saving}>Cancelar</Button><Button variant="contained" onClick={()=>void save()} disabled={saving}>{saving?'Salvando...':'Salvar'}</Button></DialogActions></Dialog>

    <Dialog open={detailOpen} onClose={()=>setDetailOpen(false)} fullWidth maxWidth="lg"><DialogTitle><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="h5">{detail?.ministry.name||'Ministério'}</Typography><Typography variant="body2" color="text.secondary">Gestão ministerial</Typography></Box><IconButton onClick={()=>setDetailOpen(false)}><CloseOutlined/></IconButton></Stack></DialogTitle><DialogContent dividers>
      {detailLoading||!detail?<Box py={8} textAlign="center"><CircularProgress/></Box>:<><Tabs value={detailTab} onChange={(_,v)=>setDetailTab(v)} sx={{mb:3}}><Tab label="Membros" icon={<GroupsOutlined/>} iconPosition="start"/><Tab label="Presenças e justificativas" icon={<HowToRegOutlined/>} iconPosition="start"/></Tabs>
      {detailTab===0&&<Stack gap={2}><Paper variant="outlined" sx={{p:2}}><Stack direction={{xs:'column',md:'row'}} gap={2}><TextField select fullWidth label="Adicionar membro" value={selectedMemberId} onChange={e=>setSelectedMemberId(e.target.value)}><MenuItem value="">Selecione</MenuItem>{availableMembers.map(m=><MenuItem key={m.id} value={m.id}>{m.name} — {m.email}</MenuItem>)}</TextField><Button variant="contained" startIcon={<PersonAddAltOutlined/>} onClick={()=>void addMember()} disabled={!selectedMemberId||saving}>Vincular</Button></Stack></Paper>
      {detail.members.length===0?<Alert severity="info">Nenhum membro vinculado.</Alert>:detail.members.map(m=><Paper key={m.memberId} variant="outlined" sx={{p:2}}><Stack direction="row" alignItems="center" gap={2}><Avatar src={m.photo}>{m.name[0]}</Avatar><Box flex={1}><Typography fontWeight={700}>{m.name}</Typography><Typography variant="body2" color="text.secondary">{m.email} • {m.function}</Typography></Box><Chip label={m.profile} size="small"/><Tooltip title="Remover vínculo"><IconButton color="error" onClick={()=>void removeMember(m)}><DeleteOutline/></IconButton></Tooltip></Stack></Paper>)}</Stack>}
      {detailTab===1&&<Stack gap={3}><Paper variant="outlined" sx={{p:2}}><Typography variant="h6" mb={2}>Registrar presença</Typography><Stack direction={{xs:'column',md:'row'}} gap={2}><TextField select fullWidth label="Membro" value={attendanceMemberId} onChange={e=>setAttendanceMemberId(e.target.value)}><MenuItem value="">Selecione</MenuItem>{detail.members.map(m=><MenuItem key={m.memberId} value={m.memberId}>{m.name}</MenuItem>)}</TextField><TextField type="date" label="Data" value={attendanceDate} onChange={e=>setAttendanceDate(e.target.value)} InputLabelProps={{shrink:true}}/><TextField select label="Situação" value={attendancePresent?'PRESENTE':'AUSENTE'} onChange={e=>setAttendancePresent(e.target.value==='PRESENTE')} sx={{minWidth:160}}><MenuItem value="PRESENTE">Presente</MenuItem><MenuItem value="AUSENTE">Ausente</MenuItem></TextField></Stack>{!attendancePresent&&<TextField sx={{mt:2}} fullWidth multiline minRows={2} label="Justificativa da ausência" value={attendanceJustification} onChange={e=>setAttendanceJustification(e.target.value)}/>}<Button sx={{mt:2}} variant="contained" onClick={()=>void registerAttendance()} disabled={!attendanceMemberId||saving}>Salvar presença</Button></Paper>
      <Divider/>{detail.attendances.length===0?<Alert severity="info">Nenhuma presença registrada.</Alert>:detail.attendances.map(a=><Paper key={a.id} variant="outlined" sx={{p:2}}><Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" gap={1}><Box><Typography fontWeight={700}>{a.memberName}</Typography><Typography variant="body2" color="text.secondary">{new Date(`${a.date}T12:00:00`).toLocaleDateString('pt-BR')}</Typography>{a.justification&&<Typography mt={1}>Justificativa: {a.justification}</Typography>}</Box><Chip icon={a.present?<CheckCircleOutline/>:<CloseOutlined/>} color={a.present?'success':'warning'} label={a.present?'Presente':'Ausente'}/></Stack></Paper>)}</Stack>}</>}
    </DialogContent></Dialog>
    <Snackbar open={Boolean(success)} autoHideDuration={3500} onClose={()=>setSuccess('')} message={success}/>
  </Box>;
}
