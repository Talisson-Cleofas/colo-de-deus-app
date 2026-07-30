import {
  AddOutlined, DeleteOutline, EditOutlined, GroupsOutlined, MapOutlined, SearchOutlined,
  ToggleOffOutlined, ToggleOnOutlined,
} from '@mui/icons-material';
import {
  Alert, Avatar, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControlLabel, IconButton, InputAdornment, MenuItem,
  Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, apiErrorMessage } from '../services/api';
import type { AccessProfile, AccessProfileOption, Member, MemberFacets, Ministry } from '../types';
import { MembersMapPanel } from './MembersMapPanel';

const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const defaultProfileOptions: AccessProfileOption[] = [
  { code:'DEVELOPER', name:'Desenvolvedor', description:'Administração técnica total da plataforma.', level:100, active:true },
  { code:'MISSION_LEADER', name:'Líder da Missão', description:'Administração funcional da missão.', level:90, active:true },
  { code:'MINISTRY_LEADER', name:'Líder de Ministério', description:'Gestão no escopo do ministério.', level:60, active:true },
  { code:'CELL_LEADER', name:'Líder de Célula', description:'Gestão no escopo da célula.', level:40, active:true },
  { code:'MEMBER', name:'Membro', description:'Acesso pessoal e consultas gerais.', level:10, active:true },
];
const legacyProfileLabels: Record<string,string> = {
  ADMIN:'Administrador (legado)',
};

type MemberForm={
  name:string;email:string;phone:string;photo:string;role:string;ministry:string;cell:string;
  profile:AccessProfile;active:boolean;birthDate:string;city:string;state:string;address:string;neighborhood:string;zipCode:string;instagram:string;
  bio:string;gifts:string;formator:string;
};
const emptyForm:MemberForm={name:'',email:'',phone:'',photo:'',role:'Membro',ministry:'',cell:'',profile:'MEMBER',active:true,birthDate:'',city:'',state:'',address:'',neighborhood:'',zipCode:'',instagram:'',bio:'',gifts:'',formator:''};
const memberToForm=(member:Member):MemberForm=>({
  name:member.name,email:member.email,phone:member.phone,photo:member.photo,role:member.role,
  ministry:member.ministry,cell:member.cell,profile:member.profile,active:member.active,
  birthDate:member.birthDate,city:member.city,state:member.state,address:member.address??'',neighborhood:member.neighborhood??'',zipCode:member.zipCode??'',instagram:member.instagram,
  bio:member.bio,gifts:(member.gifts??[]).join(', '),formator:member.formator,
});

export function MembersPage(){
  const {user,hasRole}=useAuth();
  const isAdmin=hasRole('ADMIN','MISSION_LEADER','DEVELOPER');
  const [tab,setTab]=useState(0);const [members,setMembers]=useState<Member[]>([]);
  const [facets,setFacets]=useState<MemberFacets>({ministries:[],cells:[],roles:[]});
  const [ministryOptions,setMinistryOptions]=useState<Ministry[]>([]);
  const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [success,setSuccess]=useState('');
  const [query,setQuery]=useState('');const [ministry,setMinistry]=useState('');const [cell,setCell]=useState('');
  const [profile,setProfile]=useState('');const [status,setStatus]=useState(isAdmin?'all':'active');
  const [page,setPage]=useState(0);const [rowsPerPage,setRowsPerPage]=useState(10);
  const [open,setOpen]=useState(false);const [saving,setSaving]=useState(false);const [formError,setFormError]=useState('');
  const [editing,setEditing]=useState<Member|null>(null);const [form,setForm]=useState<MemberForm>(emptyForm);
  const [accessProfiles,setAccessProfiles]=useState<AccessProfileOption[]>([]);
  const [profilesLoading,setProfilesLoading]=useState(true);
  const [profilesError,setProfilesError]=useState('');

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const [membersResponse,facetsResponse,ministriesResponse]=await Promise.all([
        api.get<{members:Member[]}>('/members',{params:{status:'all'}}),
        api.get<MemberFacets>('/members/facets'),
        api.get<Ministry[]>('/ministries'),
      ]);
      setMembers(Array.isArray(membersResponse.data?.members)?membersResponse.data.members:[]);
      setFacets(facetsResponse.data??{ministries:[],cells:[],roles:[]});
      setMinistryOptions(
        (Array.isArray(ministriesResponse.data)?ministriesResponse.data:[])
          .filter((item)=>item&&item.active!==false&&Boolean(item.name?.trim()))
          .sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))
      );
    }catch(e){setError(apiErrorMessage(e))}
    finally{setLoading(false)}
  },[]);
  const loadAccessProfiles=useCallback(async()=>{
    setProfilesLoading(true);setProfilesError('');
    try{
      const {data}=await api.get<AccessProfileOption[]>('/profiles/assignable');
      const valid=(Array.isArray(data)?data:[])
        .filter((item)=>item&&item.active!==false&&Boolean(item.code))
        .sort((a,b)=>(b.level??0)-(a.level??0));
      setAccessProfiles(valid.length?valid:defaultProfileOptions.filter((item)=>item.code!=='DEVELOPER'||user?.profile==='DEVELOPER'));
    }catch(e){
      setProfilesError(apiErrorMessage(e));
      const actor=user?.profile==='ADMIN'?'MISSION_LEADER':user?.profile;
      const actorLevel=defaultProfileOptions.find((item)=>item.code===actor)?.level??0;
      setAccessProfiles(defaultProfileOptions.filter((item)=>(user?.profile==='DEVELOPER')||(item.code!=='DEVELOPER'&&(item.level??0)<=actorLevel)));
    }finally{setProfilesLoading(false)}
  },[user?.profile]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{if(isAdmin)void loadAccessProfiles()},[isAdmin,loadAccessProfiles]);
  useEffect(()=>{setPage(0)},[query,ministry,cell,profile,status]);

  const profileNameMap=useMemo(()=>{
    const map=new Map<string,string>();
    for(const item of defaultProfileOptions)map.set(item.code,item.name);
    for(const item of accessProfiles)map.set(item.code,item.name);
    for(const [code,label] of Object.entries(legacyProfileLabels))map.set(code,label);
    return map;
  },[accessProfiles]);
  const profileLabel=useCallback((code:string)=>profileNameMap.get(code)||code||'Perfil não informado',[profileNameMap]);
  const filterProfileOptions=useMemo(()=>{
    const codes=new Set<string>(members.map((member)=>String(member.profile)).filter(Boolean));
    const options:AccessProfileOption[]=[...accessProfiles];
    for(const code of codes){if(!options.some((item)=>item.code===code))options.push({code,name:profileLabel(code),description:'Perfil presente em cadastro existente.',level:0,active:true})}
    return options.sort((a,b)=>(b.level??0)-(a.level??0)||a.name.localeCompare(b.name,'pt-BR'));
  },[accessProfiles,members,profileLabel]);
  const ministryFilterOptions=useMemo(()=>{
    const names=new Set<string>();
    for(const item of ministryOptions){if(item.name?.trim())names.add(item.name.trim())}
    for(const name of facets.ministries){if(name?.trim())names.add(name.trim())}
    return [...names].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  },[facets.ministries,ministryOptions]);

  const filtered=useMemo(()=>{const term=normalize(query.trim());return members.filter((member)=>{
    const hay=normalize([member.name,member.email,member.role,member.ministry,member.cell,member.city,member.formator].join(' '));
    const statusOk=status==='all'||(status==='active'&&member.active)||(status==='inactive'&&!member.active);
    return statusOk&&(!term||hay.includes(term))&&(!ministry||member.ministry===ministry)&&(!cell||member.cell===cell)&&(!profile||member.profile===profile);
  })},[members,query,ministry,cell,profile,status]);
  const paginated=filtered.slice(page*rowsPerPage,page*rowsPerPage+rowsPerPage);
  const activeCount=members.filter((m)=>m.active).length;
  const inactiveCount=members.length-activeCount;
  const setField=<K extends keyof MemberForm>(key:K,value:MemberForm[K])=>setForm((current)=>({...current,[key]:value}));
  const openCreate=()=>{setEditing(null);setForm(emptyForm);setFormError('');setOpen(true)};
  const openEdit=(member:Member)=>{setEditing(member);setForm(memberToForm(member));setFormError('');setOpen(true)};
  const close=()=>{if(saving)return;setOpen(false);setEditing(null);setFormError('')};
  const canEdit=(member:Member)=>isAdmin||member.id===user?.id||member.id===user?.memberId;

  const submit=async()=>{
    setFormError('');setSuccess('');if(!form.name.trim()||!form.email.trim()){setFormError('Informe pelo menos o nome e o e-mail.');return}
    setSaving(true);try{
      const payload={...form,gifts:form.gifts.split(',').map((v)=>v.trim()).filter(Boolean)};
      const {data}=editing
        ?await api.put<{member:Member;message:string}>(`/members/${editing.id}`,payload)
        :await api.post<{member:Member;message:string}>('/members',payload);
      setMembers((current)=>editing?current.map((m)=>m.id===data.member.id?data.member:m):[data.member,...current]);
      setSuccess(data.message);close();
    }catch(e){setFormError(apiErrorMessage(e))}finally{setSaving(false)}
  };
  const removeMember=async(member:Member)=>{if(!confirm(`Excluir o membro ${member.name}?`))return;setError('');try{await api.delete(`/members/${member.id}`);setMembers(current=>current.filter(m=>m.id!==member.id));setSuccess('Membro movido para a lixeira.')}catch(e){setError(apiErrorMessage(e))}};
  const toggleStatus=async(member:Member)=>{setError('');try{const {data}=await api.patch<{member:Member;message:string}>(`/members/${member.id}/status`,{active:!member.active});setMembers((current)=>current.map((m)=>m.id===member.id?data.member:m));setSuccess(data.message)}catch(e){setError(apiErrorMessage(e))}};

  return <Box>
    <Stack direction={{xs:'column',lg:'row'}} justifyContent="space-between" gap={2} mb={2}>
      <Box><Typography variant="h4">Área de Membros</Typography><Typography color="text.secondary">Cadastros, vínculos, perfis e situação dos membros da missão.</Typography></Box>
      {isAdmin&&<Button variant="contained" startIcon={<AddOutlined/>} onClick={openCreate}>Adicionar membro</Button>}
    </Stack>

    <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'repeat(3,1fr)'},gap:2,mb:3}}>
      <Paper sx={{p:2}}><Typography color="text.secondary" fontSize={13}>Total de cadastros</Typography><Typography variant="h5" fontWeight={900}>{members.length}</Typography></Paper>
      <Paper sx={{p:2}}><Typography color="text.secondary" fontSize={13}>Membros ativos</Typography><Typography variant="h5" fontWeight={900}>{activeCount}</Typography></Paper>
      <Paper sx={{p:2}}><Typography color="text.secondary" fontSize={13}>Membros inativos</Typography><Typography variant="h5" fontWeight={900}>{inactiveCount}</Typography></Paper>
    </Box>

    {success&&<Alert severity="success" onClose={()=>setSuccess('')} sx={{mb:2}}>{success}</Alert>}
    {error&&<Alert severity="error" sx={{mb:2}}>{error}</Alert>}
    <Paper sx={{mb:3}}><Tabs value={tab} onChange={(_,v)=>setTab(v)} variant="scrollable"><Tab icon={<GroupsOutlined/>} iconPosition="start" label="Listagem"/><Tab icon={<MapOutlined/>} iconPosition="start" label="Mapa de membros"/></Tabs></Paper>

    {loading?<Box textAlign="center" py={10}><CircularProgress/></Box>:tab===1?<MembersMapPanel members={members.filter((m)=>m.active)}/>:<>
      <Paper sx={{p:2,mb:2}}><Stack direction={{xs:'column',xl:'row'}} spacing={1.5}>
        <TextField value={query} onChange={(e)=>setQuery(e.target.value)} fullWidth placeholder="Buscar por nome, e-mail, função, cidade ou formador" slotProps={{input:{startAdornment:<InputAdornment position="start"><SearchOutlined/></InputAdornment>}}}/>
        <TextField select value={ministry} onChange={(e)=>setMinistry(e.target.value)} label="Ministério" sx={{minWidth:190}}><MenuItem value="">Todos</MenuItem>{ministryFilterOptions.map((v)=><MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField>
        <TextField select value={cell} onChange={(e)=>setCell(e.target.value)} label="Célula" sx={{minWidth:180}}><MenuItem value="">Todas</MenuItem>{facets.cells.map((v)=><MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField>
        <TextField select value={profile} onChange={(e)=>setProfile(e.target.value)} label="Perfil" sx={{minWidth:190}}><MenuItem value="">Todos</MenuItem>{filterProfileOptions.map((item)=><MenuItem key={item.code} value={item.code}>{item.name}</MenuItem>)}</TextField>
        {isAdmin&&<TextField select value={status} onChange={(e)=>setStatus(e.target.value)} label="Situação" sx={{minWidth:150}}><MenuItem value="all">Todos</MenuItem><MenuItem value="active">Ativos</MenuItem><MenuItem value="inactive">Inativos</MenuItem></TextField>}
      </Stack></Paper>

      <TableContainer component={Paper}>
        <Table><TableHead><TableRow>
          <TableCell>Membro</TableCell><TableCell>Perfil</TableCell><TableCell>Ministério</TableCell><TableCell>Célula</TableCell><TableCell>Formador</TableCell><TableCell>Situação</TableCell><TableCell align="right">Ações</TableCell>
        </TableRow></TableHead><TableBody>
          {paginated.map((member)=><TableRow key={member.id} hover>
            <TableCell><Stack direction="row" spacing={1.5} alignItems="center"><Avatar src={member.photo}>{member.name.slice(0,1)}</Avatar><Box><Typography fontWeight={800}>{member.name}</Typography><Typography color="text.secondary" fontSize={12}>{member.email}<br/>{member.phone||'Telefone não informado'}</Typography></Box></Stack></TableCell>
            <TableCell><Chip size="small" label={profileLabel(member.profile)}/></TableCell>
            <TableCell>{member.ministry||'—'}</TableCell><TableCell>{member.cell||'—'}</TableCell><TableCell>{member.formator||'—'}</TableCell>
            <TableCell><Chip size="small" color={member.active?'success':'default'} label={member.active?'Ativo':'Inativo'}/></TableCell>
            <TableCell align="right"><Stack direction="row" justifyContent="flex-end">
              {canEdit(member)&&<Tooltip title="Editar"><IconButton onClick={()=>openEdit(member)}><EditOutlined/></IconButton></Tooltip>}
              {isAdmin&&<Tooltip title="Excluir"><IconButton color="error" onClick={()=>void removeMember(member)}><DeleteOutline/></IconButton></Tooltip>}{isAdmin&&<Tooltip title={member.active?'Desativar':'Reativar'}><IconButton color={member.active?'warning':'success'} onClick={()=>void toggleStatus(member)}>{member.active?<ToggleOnOutlined/>:<ToggleOffOutlined/>}</IconButton></Tooltip>}
            </Stack></TableCell>
          </TableRow>)}
          {!paginated.length&&<TableRow><TableCell colSpan={7} align="center" sx={{py:6}}>Nenhum membro encontrado.</TableCell></TableRow>}
        </TableBody></Table>
        <TablePagination component="div" count={filtered.length} page={page} onPageChange={(_,value)=>setPage(value)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e)=>{setRowsPerPage(Number(e.target.value));setPage(0)}} rowsPerPageOptions={[5,10,25,50]} labelRowsPerPage="Por página"/>
      </TableContainer>
    </>}

    <Dialog open={open} onClose={close} fullWidth maxWidth="md">
      <DialogTitle>{editing?'Editar membro':'Cadastrar novo membro'}</DialogTitle>
      <DialogContent dividers>{formError&&<Alert severity="error" sx={{mb:2}}>{formError}</Alert>}
        <Stack direction="row" spacing={2} alignItems="center" mb={2}><Avatar src={form.photo} sx={{width:72,height:72}}>{form.name.slice(0,1)}</Avatar><TextField fullWidth label="URL da foto" value={form.photo} onChange={(e)=>setField('photo',e.target.value)}/></Stack>
        <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',md:'repeat(2,1fr)'},gap:2}}>
          <TextField required label="Nome completo" value={form.name} onChange={(e)=>setField('name',e.target.value)} disabled={!isAdmin&&Boolean(editing)}/>
          <TextField required type="email" label="E-mail" value={form.email} onChange={(e)=>setField('email',e.target.value)} disabled={!isAdmin&&Boolean(editing)}/>
          <TextField label="Telefone" value={form.phone} onChange={(e)=>setField('phone',e.target.value)}/>
          <TextField label="Data de nascimento" type="date" value={form.birthDate} onChange={(e)=>setField('birthDate',e.target.value)} slotProps={{inputLabel:{shrink:true}}}/>
          <TextField label="Função" value={form.role} onChange={(e)=>setField('role',e.target.value)} disabled={!isAdmin}/>
          <TextField select label="Perfil de acesso" value={form.profile} onChange={(e)=>setField('profile',e.target.value as AccessProfile)} disabled={!isAdmin||profilesLoading} helperText={profilesLoading?'Carregando perfis configurados...':profilesError?'Usando perfis padrão por indisponibilidade temporária.':'Perfis ativos definidos no RBAC.'}>{editing&&form.profile&&!accessProfiles.some((item)=>item.code===form.profile)&&<MenuItem value={form.profile} disabled>{profileLabel(form.profile)} — não atribuível</MenuItem>}{accessProfiles.map((item)=><MenuItem key={item.code} value={item.code}>{item.name}</MenuItem>)}</TextField>
          <TextField select label="Ministério" value={form.ministry} onChange={(e)=>setField('ministry',e.target.value)} disabled={!isAdmin}><MenuItem value="">Sem ministério</MenuItem>{form.ministry&&!ministryOptions.some((item)=>item.name===form.ministry)&&<MenuItem value={form.ministry} disabled>{form.ministry} — não disponível</MenuItem>}{ministryOptions.map((item)=><MenuItem key={item.id} value={item.name}>{item.name}</MenuItem>)}</TextField>
          <TextField select label="Célula" value={form.cell} onChange={(e)=>setField('cell',e.target.value)} disabled={!isAdmin}><MenuItem value="">Sem célula</MenuItem>{facets.cells.map((v)=><MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField>
          <TextField label="Endereço" value={form.address} onChange={(e)=>setField('address',e.target.value)} sx={{gridColumn:{md:'1 / -1'}}}/><TextField label="Bairro" value={form.neighborhood} onChange={(e)=>setField('neighborhood',e.target.value)}/><TextField label="CEP" value={form.zipCode} onChange={(e)=>setField('zipCode',e.target.value)}/><TextField label="Cidade" value={form.city} onChange={(e)=>setField('city',e.target.value)}/><TextField label="Estado" value={form.state} onChange={(e)=>setField('state',e.target.value)}/>
          <TextField label="Instagram" value={form.instagram} onChange={(e)=>setField('instagram',e.target.value)}/><TextField label="Formador" value={form.formator} onChange={(e)=>setField('formator',e.target.value)} disabled={!isAdmin}/>
          <TextField label="Dons (separados por vírgula)" value={form.gifts} onChange={(e)=>setField('gifts',e.target.value)} sx={{gridColumn:{md:'1 / -1'}}}/>
          <TextField label="Biografia / observações" value={form.bio} onChange={(e)=>setField('bio',e.target.value)} multiline minRows={3} sx={{gridColumn:{md:'1 / -1'}}}/>
          {isAdmin&&<FormControlLabel control={<Checkbox checked={form.active} onChange={(e)=>setField('active',e.target.checked)}/>} label="Membro ativo"/>}
        </Box>
      </DialogContent>
      <DialogActions><Button onClick={close} disabled={saving}>Cancelar</Button><Button variant="contained" onClick={()=>void submit()} disabled={saving}>{saving?<CircularProgress size={22}/>:editing?'Salvar alterações':'Cadastrar membro'}</Button></DialogActions>
    </Dialog>
  </Box>;
}