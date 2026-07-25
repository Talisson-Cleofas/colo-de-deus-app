import {
  AdminPanelSettingsOutlined, CloudDoneOutlined, CloudOffOutlined, DeleteOutline,
  ErrorOutline, PlayArrowOutlined, RefreshOutlined,
  SaveOutlined, SettingsSuggestOutlined, StorageOutlined, SyncOutlined, VerifiedOutlined,
} from '@mui/icons-material';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControlLabel, IconButton, MenuItem, Select,
  Snackbar, Stack, Switch, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, apiErrorMessage } from '../services/api';

type Integration = { key:string; name:string; configured:boolean; connected:boolean|null; message:string; lastCheckedAt:string };
type SchemaRow = { tab:string; expected:string[]; current:string[]; valid:boolean };
type Permission = { id:string; profileCode:string; resource:string; action:string; allowed:boolean; scope:string; createdAt:string; updatedAt:string };
type TechnicalSettings = { lastSyncAt:string; lastSyncStatus:string; notificationsEnabled:boolean; notificationDefaultTime:string; pushEnabled:boolean; emailEnabled:boolean };
type MigrationState = { version:string; targetVersion:string; migrated:boolean; pendingChanges:Record<string,string[]>; missingSheets:string[]; demoMode:boolean };
type HistoryRow = { id:string; nivel:string; categoria:string; acao:string; mensagem:string; detalhes:string; usuario_email:string; criado_em:string };

const blankPermission: Partial<Permission> = { profileCode:'MEMBER', resource:'EVENTS', action:'READ', allowed:true, scope:'OWN' };

export function TechnicalAdminPage() {
  const [tab,setTab]=useState(0); const [loading,setLoading]=useState(true); const [working,setWorking]=useState('');
  const [integrations,setIntegrations]=useState<Integration[]>([]); const [schema,setSchema]=useState<SchemaRow[]>([]);
  const [settings,setSettings]=useState<TechnicalSettings>({lastSyncAt:'',lastSyncStatus:'NUNCA_EXECUTADO',notificationsEnabled:true,notificationDefaultTime:'08:00',pushEnabled:false,emailEnabled:false});
  const [permissions,setPermissions]=useState<Permission[]>([]); const [history,setHistory]=useState<HistoryRow[]>([]);
  const [migration,setMigration]=useState<MigrationState|null>(null);
  const [permission,setPermission]=useState<Partial<Permission>|null>(null); const [notice,setNotice]=useState(''); const [error,setError]=useState('');

  const load=useCallback(async()=>{setLoading(true);try{const [i,s,c,p,h]=await Promise.all([
    api.get<Integration[]>('/technical-admin/integrations'), api.get<SchemaRow[]>('/technical-admin/schema'),
    api.get<TechnicalSettings>('/technical-admin/settings'), api.get<Permission[]>('/technical-admin/permissions'),
    api.get<HistoryRow[]>('/technical-admin/history?limit=100')]);
    setIntegrations(i.data);setSchema(s.data);setSettings(c.data);setPermissions(p.data);setHistory(h.data);
    try{setMigration((await api.get<MigrationState>('/admin/migrations/maps-drive/status')).data)}catch{setMigration(null)}
  }catch(e){setError(apiErrorMessage(e));}finally{setLoading(false)}},[]);
  useEffect(()=>{void load()},[load]);

  const test=async(key:string)=>{setWorking(`test-${key}`);try{const {data}=await api.post<Integration>(`/technical-admin/integrations/${key}/test`);setIntegrations(v=>v.map(x=>x.key===key?data:x));setNotice(data.connected?'Conexão validada.':'A conexão apresentou falha.');}catch(e){setError(apiErrorMessage(e))}finally{setWorking('')}};
  const sync=async()=>{setWorking('sync');try{const {data}=await api.post<{invalidTabs:string[]}>('/technical-admin/synchronize');setNotice(data.invalidTabs.length?`Sincronização concluída com alertas em ${data.invalidTabs.length} aba(s).`:'Sincronização concluída com sucesso.');await load();}catch(e){setError(apiErrorMessage(e))}finally{setWorking('')}};
  const saveSettings=async()=>{setWorking('settings');try{const {data}=await api.patch<TechnicalSettings>('/technical-admin/settings/notifications',settings);setSettings(data);setNotice('Configurações de notificações salvas.');}catch(e){setError(apiErrorMessage(e))}finally{setWorking('')}};
  const savePermission=async()=>{if(!permission)return;setWorking('permission');try{await api.post('/technical-admin/permissions',permission);setPermission(null);setNotice('Permissão salva.');await load();}catch(e){setError(apiErrorMessage(e))}finally{setWorking('')}};
  const removePermission=async(id:string)=>{setWorking(`delete-${id}`);try{await api.delete(`/technical-admin/permissions/${id}`);setNotice('Permissão desativada.');await load();}catch(e){setError(apiErrorMessage(e))}finally{setWorking('')}};
  const runMigration=async()=>{setWorking('migration');try{await api.post('/admin/migrations/maps-drive/run');setNotice('Migração 4.2.2 concluída com sucesso.');await load();}catch(e){setError(apiErrorMessage(e))}finally{setWorking('')}};
  const validCount=useMemo(()=>schema.filter(x=>x.valid).length,[schema]);

  if(loading)return <Stack alignItems="center" py={10}><CircularProgress/></Stack>;
  return <Box>
    <Stack direction={{xs:'column',md:'row'}} justifyContent="space-between" gap={2} mb={3}>
      <Box><Typography variant="h4" fontWeight={800}>Integrações e administração técnica</Typography><Typography color="text.secondary">Status seguro, validação da planilha, sincronização, notificações e permissões.</Typography></Box>
      <Button variant="outlined" startIcon={<RefreshOutlined/>} onClick={()=>void load()}>Atualizar painel</Button>
    </Stack>
    <Alert severity="info" sx={{mb:2}}>As credenciais nunca são exibidas nesta tela. O sistema mostra somente se cada integração está configurada.</Alert>
    <Tabs value={tab} onChange={(_,v)=>setTab(v)} variant="scrollable" sx={{mb:2}}>
      <Tab label="Integrações"/><Tab label="Google Sheets"/><Tab label="Notificações"/><Tab label="Permissões"/><Tab label="Histórico de erros"/>
    </Tabs>

    {tab===0&&<Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',md:'repeat(2,1fr)',xl:'repeat(3,1fr)'},gap:2}}>
      {integrations.map(item=><Card key={item.key} variant="outlined"><CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center"><StorageOutlined color={item.configured?'primary':'disabled'}/><Chip size="small" label={item.configured?'Configurado':'Não configurado'} color={item.configured?'success':'default'}/></Stack>
        <Typography variant="h6" mt={2}>{item.name}</Typography><Typography variant="body2" color="text.secondary" minHeight={42}>{item.message}</Typography>
        <Stack direction="row" alignItems="center" gap={1} mt={2}>{item.connected===true?<CloudDoneOutlined color="success"/>:item.connected===false?<CloudOffOutlined color="error"/>:<SettingsSuggestOutlined color="disabled"/>}<Typography variant="body2">{item.connected===true?'Conectado':item.connected===false?'Falha no teste':'Ainda não testado'}</Typography></Stack>
        <Button fullWidth sx={{mt:2}} variant="outlined" startIcon={working===`test-${item.key}`?<CircularProgress size={16}/>:<PlayArrowOutlined/>} disabled={Boolean(working)} onClick={()=>void test(item.key)}>Testar conexão</Button>
      </CardContent></Card>)}
    </Box>}

    {tab===1&&<Stack spacing={2}>
      <Card variant="outlined"><CardContent><Stack direction={{xs:'column',md:'row'}} justifyContent="space-between" gap={2}><Box><Typography variant="h6">Migração Maps e Drive 4.2.2</Typography><Typography color="text.secondary">{migration?.migrated?'Estrutura atualizada e pronta para Maps e Drive.':`Versão atual: ${migration?.version||'não detectada'} · destino: 4.2.2`}</Typography>{migration?.missingSheets?.length?<Typography variant="caption" color="warning.main">Abas pendentes: {migration.missingSheets.join(', ')}</Typography>:null}</Box><Button variant="contained" disabled={Boolean(working)||migration?.migrated} startIcon={working==='migration'?<CircularProgress size={16}/>:<PlayArrowOutlined/>} onClick={()=>void runMigration()}>{migration?.migrated?'Migração concluída':'Executar migração segura'}</Button></Stack></CardContent></Card>
      <Card variant="outlined"><CardContent><Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" gap={2}><Box><Typography variant="h6">Estrutura do Google Sheets</Typography><Typography color="text.secondary">{validCount} de {schema.length} abas estão com os cabeçalhos esperados.</Typography></Box><Button variant="contained" startIcon={working==='sync'?<CircularProgress size={16}/>:<SyncOutlined/>} disabled={Boolean(working)} onClick={()=>void sync()}>Criar abas e sincronizar</Button></Stack><Divider sx={{my:2}}/><Typography variant="body2">Última sincronização: {settings.lastSyncAt?new Date(settings.lastSyncAt).toLocaleString('pt-BR'):'nunca executada'} · {settings.lastSyncStatus}</Typography></CardContent></Card>
      <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',md:'repeat(2,1fr)'},gap:1.5}}>{schema.map(row=><Card key={row.tab} variant="outlined"><CardContent sx={{py:2}}><Stack direction="row" justifyContent="space-between"><Typography fontWeight={700}>{row.tab}</Typography><Chip size="small" icon={row.valid?<VerifiedOutlined/>:<ErrorOutline/>} color={row.valid?'success':'warning'} label={row.valid?'Válida':'Revisar cabeçalho'}/></Stack>{!row.valid&&<Typography variant="caption" color="text.secondary">Esperado: {row.expected.join(', ')}</Typography>}</CardContent></Card>)}</Box>
    </Stack>}

    {tab===2&&<Card variant="outlined"><CardContent><Typography variant="h6" mb={2}>Configurações técnicas de notificações</Typography><Stack spacing={1.5}>
      <FormControlLabel control={<Switch checked={settings.notificationsEnabled} onChange={e=>setSettings({...settings,notificationsEnabled:e.target.checked})}/>} label="Ativar processamento de notificações"/>
      <FormControlLabel control={<Switch checked={settings.pushEnabled} onChange={e=>setSettings({...settings,pushEnabled:e.target.checked})}/>} label="Preparar envios Firebase Push"/>
      <FormControlLabel control={<Switch checked={settings.emailEnabled} onChange={e=>setSettings({...settings,emailEnabled:e.target.checked})}/>} label="Ativar canal de e-mail"/>
      <TextField type="time" label="Horário padrão" value={settings.notificationDefaultTime} onChange={e=>setSettings({...settings,notificationDefaultTime:e.target.value})} InputLabelProps={{shrink:true}} sx={{maxWidth:260}}/>
      <Button variant="contained" startIcon={working==='settings'?<CircularProgress size={16}/>:<SaveOutlined/>} disabled={Boolean(working)} onClick={()=>void saveSettings()} sx={{alignSelf:'flex-start'}}>Salvar configurações</Button>
    </Stack></CardContent></Card>}

    {tab===3&&<Stack spacing={2}><Stack direction="row" justifyContent="space-between"><Box><Typography variant="h6">Administração de permissões</Typography><Typography color="text.secondary">Permissões adicionais armazenadas na aba Permissoes.</Typography></Box><Button startIcon={<AdminPanelSettingsOutlined/>} variant="contained" onClick={()=>setPermission({...blankPermission})}>Nova permissão</Button></Stack>
      {permissions.map(p=><Card key={p.id} variant="outlined"><CardContent sx={{py:1.5}}><Stack direction={{xs:'column',md:'row'}} alignItems={{md:'center'}} gap={1.5}><Chip label={p.profileCode}/><Typography fontWeight={700}>{p.resource}</Typography><Typography color="text.secondary">{p.action}</Typography><Chip size="small" color={p.allowed?'success':'default'} label={p.allowed?'Permitido':'Negado'}/><Chip size="small" label={`Escopo: ${p.scope}`}/><Box flex={1}/><Button size="small" onClick={()=>setPermission({...p})}>Editar</Button><IconButton color="error" disabled={Boolean(working)} onClick={()=>void removePermission(p.id)}><DeleteOutline/></IconButton></Stack></CardContent></Card>)}
      {!permissions.length&&<Alert severity="info">Nenhuma permissão personalizada cadastrada.</Alert>}
    </Stack>}

    {tab===4&&<Stack spacing={1.5}>{history.map(item=><Card key={item.id} variant="outlined"><CardContent sx={{py:1.5}}><Stack direction={{xs:'column',md:'row'}} gap={1.5}><Chip size="small" color={item.nivel==='ERROR'?'error':'info'} label={item.nivel}/><Box flex={1}><Typography fontWeight={700}>{item.categoria} · {item.acao}</Typography><Typography variant="body2">{item.mensagem}</Typography>{item.detalhes&&<Typography variant="caption" color="text.secondary">{item.detalhes}</Typography>}</Box><Typography variant="caption" color="text.secondary">{item.criado_em?new Date(item.criado_em).toLocaleString('pt-BR'):''}</Typography></Stack></CardContent></Card>)}{!history.length&&<Alert severity="success">Nenhum erro técnico registrado.</Alert>}</Stack>}

    <Dialog open={Boolean(permission)} onClose={()=>setPermission(null)} fullWidth maxWidth="sm"><DialogTitle>Permissão</DialogTitle><DialogContent><Stack spacing={2} mt={1}>
      <Select value={permission?.profileCode||'MEMBER'} onChange={e=>setPermission({...permission,profileCode:e.target.value})}><MenuItem value="ADMIN">ADMIN</MenuItem><MenuItem value="MINISTRY_LEADER">MINISTRY_LEADER</MenuItem><MenuItem value="CELL_LEADER">CELL_LEADER</MenuItem><MenuItem value="MEMBER">MEMBER</MenuItem></Select>
      <TextField label="Recurso" value={permission?.resource||''} onChange={e=>setPermission({...permission,resource:e.target.value})}/><TextField label="Ação" value={permission?.action||''} onChange={e=>setPermission({...permission,action:e.target.value})}/>
      <Select value={permission?.scope||'OWN'} onChange={e=>setPermission({...permission,scope:e.target.value})}><MenuItem value="ALL">Todos</MenuItem><MenuItem value="OWN">Próprio</MenuItem><MenuItem value="MINISTRY">Ministério</MenuItem><MenuItem value="CELL">Célula</MenuItem><MenuItem value="CENACLE">Cenáculo</MenuItem></Select>
      <FormControlLabel control={<Switch checked={permission?.allowed!==false} onChange={e=>setPermission({...permission,allowed:e.target.checked})}/>} label="Permitido"/>
    </Stack></DialogContent><DialogActions><Button onClick={()=>setPermission(null)}>Cancelar</Button><Button variant="contained" disabled={Boolean(working)} onClick={()=>void savePermission()}>Salvar</Button></DialogActions></Dialog>
    <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={()=>setNotice('')} message={notice}/><Snackbar open={Boolean(error)} autoHideDuration={6000} onClose={()=>setError('')}><Alert severity="error" onClose={()=>setError('')}>{error}</Alert></Snackbar>
  </Box>;
}
