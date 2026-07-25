import {
  AddOutlined, AutoStoriesOutlined, CheckCircleOutline, CleaningServicesOutlined, EditOutlined,
  SaveOutlined, SettingsOutlined, SyncOutlined,
} from '@mui/icons-material';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, MenuItem, Stack, Switch, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, apiErrorMessage } from '../services/api';
import type { LectioEntry, LectioProviderStatus, LectioSettings, LectioSyncLog, LectioSyncResult } from '../types';

const emptyEntry: LectioEntry = {
  id:'', date:new Date().toISOString().slice(0,10), title:'', celebration:'', liturgicalTime:'', liturgicalColor:'',
  firstReadingReference:'', firstReadingTitle:'', firstReadingText:'', psalmReference:'', psalmResponse:'', psalmText:'',
  secondReadingReference:'', secondReadingTitle:'', secondReadingText:'', acclamationReference:'', acclamationText:'', gospelReference:'', gospelTitle:'', gospelText:'',
  entranceAntiphon:'', communionAntiphon:'', reflection:'', prayer:'', source:'MANUAL',
  status:'MANUAL', protected:true, syncedAt:'', updatedAt:'', active:true,
};

function ReadingBlock({ title, reference, subtitle, children }: { title:string; reference?:string; subtitle?:string; children:string }) {
  if (!children && !reference) return null;
  return <Card variant="outlined"><CardContent><Typography variant="overline" color="primary.main">{title}</Typography>
    {reference && <Typography fontWeight={800}>{reference}</Typography>}
    {subtitle && <Typography fontStyle="italic" color="text.secondary" mb={1}>{subtitle}</Typography>}
    <Typography whiteSpace="pre-wrap" lineHeight={1.8}>{children}</Typography></CardContent></Card>;
}

export function LectioPage() {
  const { user } = useAuth();
  const isAdmin = user?.profile === 'MISSION_LEADER' || user?.profile === 'ADMIN' || user?.profile === 'DEVELOPER';
  const [items,setItems]=useState<LectioEntry[]>([]); const [selected,setSelected]=useState<LectioEntry|null>(null);
  const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [tab,setTab]=useState(0);
  const [editorOpen,setEditorOpen]=useState(false); const [editing,setEditing]=useState<LectioEntry>(emptyEntry);
  const [settingsOpen,setSettingsOpen]=useState(false); const [settings,setSettings]=useState<LectioSettings|null>(null);
  const [logs,setLogs]=useState<LectioSyncLog[]>([]); const [providers,setProviders]=useState<LectioProviderStatus[]>([]); const [saving,setSaving]=useState(false); const [notice,setNotice]=useState('');
  const [syncing,setSyncing]=useState(false); const [syncResult,setSyncResult]=useState<LectioSyncResult|null>(null);
  const storageKey=useMemo(()=>`lectio-completed-${selected?.date ?? 'today'}`,[selected?.date]);
  const [completed,setCompleted]=useState(false);

  const load=async()=>{setLoading(true);setError('');try{const {data}=await api.get<LectioEntry[]>('/lectio');const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());setItems(data);setSelected((current)=>data.find(i=>i.id===current?.id)||data.find(i=>i.date===today)||data[0]||null);}catch(e){setError(apiErrorMessage(e));}finally{setLoading(false)}};
  const loadAdmin=async()=>{if(!isAdmin)return;try{const [a,b,c]=await Promise.all([api.get<LectioSettings>('/lectio/settings'),api.get<LectioSyncLog[]>('/lectio/sync-logs'),api.get<LectioProviderStatus[]>('/lectio/providers/status')]);setSettings(a.data);setLogs(b.data);setProviders(c.data);}catch(e){setError(apiErrorMessage(e));}};
  useEffect(()=>{void load();void loadAdmin();},[isAdmin]);
  useEffect(()=>{setCompleted(localStorage.getItem(storageKey)==='true')},[storageKey]);

  const saveEntry=async()=>{setSaving(true);setError('');try{const payload={...editing,id:undefined};if(editing.id)await api.patch(`/lectio/${editing.id}`,payload);else await api.post('/lectio',payload);setEditorOpen(false);setNotice('Lectio salva com sucesso.');await load();await loadAdmin();}catch(e){setError(apiErrorMessage(e));}finally{setSaving(false)}};
  const saveSettings=async()=>{if(!settings)return;setSaving(true);try{await api.patch('/lectio/settings',settings);setSettingsOpen(false);setNotice('Configurações atualizadas.');await load();await loadAdmin();}catch(e){setError(apiErrorMessage(e));}finally{setSaving(false)}};
  const syncLectio=async()=>{setSyncing(true);setError('');setSyncResult(null);try{const {data}=await api.post<LectioSyncResult>('/lectio/sync');setSyncResult(data);setNotice(data.message);await load();await loadAdmin();}catch(e:any){const payload=e?.response?.data;const details=payload?.providerAttempts?{status:'ERRO',date:new Date().toISOString().slice(0,10),source:settings?.primarySource||'CNBB',primarySource:settings?.primarySource||'CNBB',fallbackUsed:false,attempts:payload.providerAttempts.length,providerErrors:payload.providerErrors||{},providerAttempts:payload.providerAttempts,changed:false,message:payload.message||apiErrorMessage(e),startedAt:'',finishedAt:new Date().toISOString(),entry:null} as LectioSyncResult:null;if(details)setSyncResult(details);setError(payload?.message||apiErrorMessage(e));await loadAdmin();}finally{setSyncing(false)}};
  const runRetention=async()=>{setSaving(true);try{const {data}=await api.post<{removed:number;protected:number;limitDate:string}>('/lectio/retention/run');setNotice(`Limpeza concluída: ${data.removed} removido(s), ${data.protected} protegido(s). Limite: ${data.limitDate}.`);await load();await loadAdmin();}catch(e){setError(apiErrorMessage(e));}finally{setSaving(false)}};
  const toggleCompleted=()=>{const next=!completed;setCompleted(next);localStorage.setItem(storageKey,String(next));};

  if(loading)return <Box py={10} textAlign="center"><CircularProgress/></Box>;
  return <Box>
    <Stack direction={{xs:'column',md:'row'}} justifyContent="space-between" gap={2} mb={3}>
      <Box><Typography variant="h4">Lectio Divina</Typography><Typography color="text.secondary">Liturgia diária com armazenamento enxuto e proteção de conteúdos revisados.</Typography></Box>
      <Stack direction="row" gap={1} flexWrap="wrap">
        {isAdmin&&<><Button variant="contained" startIcon={<SyncOutlined/>} onClick={syncLectio} disabled={syncing||saving}>{syncing?'Sincronizando...':'Sincronizar agora'}</Button><Button variant="outlined" startIcon={<CleaningServicesOutlined/>} onClick={runRetention} disabled={saving}>Aplicar retenção</Button><Button variant="outlined" startIcon={<SettingsOutlined/>} onClick={()=>setSettingsOpen(true)}>Configurações</Button><Button variant="contained" startIcon={<AddOutlined/>} onClick={()=>{setEditing({...emptyEntry,date:new Date().toISOString().slice(0,10)});setEditorOpen(true)}}>Nova Lectio</Button></>}
      </Stack>
    </Stack>
    {error&&<Alert severity="error" sx={{mb:2}}>{error}</Alert>}{notice&&<Alert severity="success" onClose={()=>setNotice('')} sx={{mb:2}}>{notice}</Alert>}
    {isAdmin&&<Card variant="outlined" sx={{mb:2}}><CardContent><Stack direction={{xs:'column',md:'row'}} justifyContent="space-between" gap={2} alignItems={{md:'center'}}><Box><Typography variant="overline">Sincronização com fallback</Typography><Typography fontWeight={800}>{syncing?'Consultando as fontes por ordem de prioridade...':syncResult?.message||'Pronta para usar CNBB e, em caso de falha, Canção Nova.'}</Typography><Typography color="text.secondary" variant="body2">Última sincronização: {logs.find(log=>log.status!=='LIMPEZA')?.finishedAt?new Date(logs.find(log=>log.status!=='LIMPEZA')!.finishedAt).toLocaleString('pt-BR'):'Ainda não executada'}</Typography></Box>{syncing?<CircularProgress size={30}/>:syncResult&&<Chip label={syncResult.status} color={syncResult.status==='ERRO'?'error':syncResult.changed?'success':'info'}/>}</Stack></CardContent></Card>}
    {isAdmin&&<Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',md:'1fr 1fr'},gap:2,mb:2}}>{providers.map(provider=><Card key={provider.source} variant="outlined"><CardContent><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="overline">{provider.role} • prioridade {provider.priority}</Typography><Typography variant="h6">{provider.source==='CANCAO_NOVA'?'Canção Nova':'CNBB'}</Typography><Typography variant="body2" color="text.secondary">{provider.lastSyncAt?`Última tentativa: ${new Date(provider.lastSyncAt).toLocaleString('pt-BR')}`:'Ainda não utilizada'}</Typography>{provider.lastError&&<Typography variant="body2" color="error.main">{provider.lastError}</Typography>}</Box><Chip icon={<CheckCircleOutline/>} label={provider.enabled?'Ativa':'Desativada'} color={provider.enabled?'success':'default'}/></Stack></CardContent></Card>)}</Box>}
    {isAdmin&&syncResult&&syncResult.providerAttempts.length>0&&<Card variant="outlined" sx={{mb:2}}><CardContent><Typography variant="overline">Fluxo da última sincronização</Typography><Stack gap={1} mt={1}>{syncResult.providerAttempts.map((attempt,index)=><Box key={`${attempt.source}-${index}`}><Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" gap={1}><Typography fontWeight={800}>{attempt.source==='CANCAO_NOVA'?'Canção Nova':'CNBB'} • prioridade {attempt.priority}</Typography><Chip size="small" label={attempt.status} color={attempt.status==='SUCESSO'?'success':attempt.status==='ERRO'?'error':'default'}/></Stack><Typography variant="body2" color={attempt.error?'error.main':'text.secondary'}>{attempt.error||`${attempt.fromCache?'Cache utilizado':'Consulta realizada'} em ${attempt.durationMs} ms`}</Typography>{index<syncResult.providerAttempts.length-1&&<Typography textAlign="center" color="text.secondary">↓ fallback</Typography>}</Box>)}</Stack>{syncResult.fallbackUsed&&<Alert severity="warning" sx={{mt:2}}>A fonte principal falhou e a fonte alternativa foi utilizada.</Alert>}</CardContent></Card>}
    <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{mb:2}}><Tab label="Leitura"/><Tab label={`Últimos dias (${items.length})`}/>{isAdmin&&<Tab label="Histórico técnico"/>}</Tabs>

    {tab===0&&(selected?<Stack gap={2}>
      <Card><CardContent sx={{p:{xs:3,md:5}}}><Stack direction={{xs:'column',md:'row'}} justifyContent="space-between" gap={2}>
        <Box><Chip label={new Intl.DateTimeFormat('pt-BR',{dateStyle:'full'}).format(new Date(`${selected.date}T12:00:00`))}/><Typography variant="h3" fontSize={{xs:30,md:44}} mt={2}>{selected.title}</Typography><Typography color="text.secondary">{selected.celebration} {selected.liturgicalColor&&`• ${selected.liturgicalColor}`}</Typography></Box>
        <Stack alignItems={{xs:'stretch',md:'flex-end'}} gap={1}><Chip label={selected.status} color={selected.status==='MANUAL'||selected.status==='REVISADA'?'warning':'default'}/>{selected.protected&&<Chip label="Protegida da limpeza" color="success" variant="outlined"/>}{isAdmin&&<Button startIcon={<EditOutlined/>} onClick={()=>{setEditing(selected);setEditorOpen(true)}}>Editar</Button>}</Stack>
      </Stack></CardContent></Card>
      <ReadingBlock title="Primeira Leitura" reference={selected.firstReadingReference} subtitle={selected.firstReadingTitle}>{selected.firstReadingText}</ReadingBlock>
      <ReadingBlock title="Salmo Responsorial" reference={selected.psalmReference}>{[selected.psalmResponse,selected.psalmText].filter(Boolean).join('\n\n')}</ReadingBlock>
      {(selected.secondReadingReference||selected.secondReadingTitle||selected.secondReadingText)&&<ReadingBlock title="Segunda Leitura" reference={selected.secondReadingReference} subtitle={selected.secondReadingTitle}>{selected.secondReadingText}</ReadingBlock>}
      <ReadingBlock title="Aclamação" reference={selected.acclamationReference}>{selected.acclamationText}</ReadingBlock>
      <ReadingBlock title="Evangelho" reference={selected.gospelReference} subtitle={selected.gospelTitle}>{selected.gospelText}</ReadingBlock>
      <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',md:'1fr 1fr'},gap:2}}><ReadingBlock title="Reflexão">{selected.reflection}</ReadingBlock><ReadingBlock title="Oração">{selected.prayer}</ReadingBlock></Box>
      <Button variant={completed?'outlined':'contained'} color={completed?'success':'primary'} startIcon={<CheckCircleOutline/>} onClick={toggleCompleted}>{completed?'Lectio concluída':'Marcar como concluída'}</Button>
    </Stack>:<Alert severity="info">Nenhuma Lectio cadastrada. O administrador pode criar o primeiro conteúdo manualmente.</Alert>)}

    {tab===1&&<Stack gap={1}>{items.map(item=><Card key={item.id} variant={selected?.id===item.id?'elevation':'outlined'}><CardContent sx={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:2}}><Box><Typography fontWeight={800}>{item.title}</Typography><Typography color="text.secondary">{new Intl.DateTimeFormat('pt-BR').format(new Date(`${item.date}T12:00:00`))} • {item.source}</Typography></Box><Button onClick={()=>{setSelected(item);setTab(0)}} startIcon={<AutoStoriesOutlined/>}>Abrir</Button></CardContent></Card>)}</Stack>}

    {tab===2&&isAdmin&&<Stack gap={1}>{logs.length===0?<Alert severity="info">Nenhuma execução registrada.</Alert>:logs.map(log=><Card key={log.id} variant="outlined"><CardContent><Stack direction={{xs:'column',md:'row'}} justifyContent="space-between"><Box><Typography fontWeight={800}>{log.status} • {log.liturgyDate}</Typography><Typography color="text.secondary">Removidos: {log.removed} • Protegidos: {log.protected} • {log.error||'Sem erros'}</Typography></Box><Typography variant="caption">{log.startedAt?new Date(log.startedAt).toLocaleString('pt-BR'):''}</Typography></Stack></CardContent></Card>)}</Stack>}

    <Dialog open={editorOpen} onClose={()=>setEditorOpen(false)} fullWidth maxWidth="md"><DialogTitle>{editing.id?'Editar Lectio':'Nova Lectio manual'}</DialogTitle><DialogContent><Stack gap={2} mt={1}>
      <Stack direction={{xs:'column',sm:'row'}} gap={2}><TextField label="Data" type="date" value={editing.date} onChange={e=>setEditing({...editing,date:e.target.value})} slotProps={{inputLabel:{shrink:true}}} required fullWidth/><TextField label="Título" value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})} required fullWidth/></Stack>
      <Stack direction={{xs:'column',sm:'row'}} gap={2}><TextField label="Celebração" value={editing.celebration} onChange={e=>setEditing({...editing,celebration:e.target.value})} fullWidth/><TextField label="Tempo litúrgico" value={editing.liturgicalTime} onChange={e=>setEditing({...editing,liturgicalTime:e.target.value})} fullWidth/><TextField label="Cor" value={editing.liturgicalColor} onChange={e=>setEditing({...editing,liturgicalColor:e.target.value})} fullWidth/></Stack>
      <Typography variant="h6">Primeira Leitura</Typography><TextField label="Referência da Primeira Leitura" value={editing.firstReadingReference} onChange={e=>setEditing({...editing,firstReadingReference:e.target.value})}/><TextField label="Título da Primeira Leitura" value={editing.firstReadingTitle} onChange={e=>setEditing({...editing,firstReadingTitle:e.target.value})}/><TextField label="Texto da Primeira Leitura" multiline minRows={4} value={editing.firstReadingText} onChange={e=>setEditing({...editing,firstReadingText:e.target.value})}/>
      <Typography variant="h6">Salmo Responsorial</Typography><TextField label="Referência do Salmo" value={editing.psalmReference} onChange={e=>setEditing({...editing,psalmReference:e.target.value})}/><TextField label="Refrão do Salmo" value={editing.psalmResponse} onChange={e=>setEditing({...editing,psalmResponse:e.target.value})}/><TextField label="Texto do Salmo" multiline minRows={3} value={editing.psalmText} onChange={e=>setEditing({...editing,psalmText:e.target.value})}/>
      <Typography variant="h6">Segunda Leitura (opcional)</Typography><TextField label="Referência da Segunda Leitura" value={editing.secondReadingReference} onChange={e=>setEditing({...editing,secondReadingReference:e.target.value})}/><TextField label="Título da Segunda Leitura" value={editing.secondReadingTitle} onChange={e=>setEditing({...editing,secondReadingTitle:e.target.value})}/><TextField label="Texto da Segunda Leitura" multiline minRows={3} value={editing.secondReadingText} onChange={e=>setEditing({...editing,secondReadingText:e.target.value})}/>
      <Typography variant="h6">Aclamação e Evangelho</Typography><TextField label="Referência da Aclamação" value={editing.acclamationReference} onChange={e=>setEditing({...editing,acclamationReference:e.target.value})}/><TextField label="Texto da Aclamação" multiline value={editing.acclamationText} onChange={e=>setEditing({...editing,acclamationText:e.target.value})}/><TextField label="Referência do Evangelho" value={editing.gospelReference} onChange={e=>setEditing({...editing,gospelReference:e.target.value})}/><TextField label="Título do Evangelho" value={editing.gospelTitle} onChange={e=>setEditing({...editing,gospelTitle:e.target.value})}/><TextField label="Texto do Evangelho" multiline minRows={5} value={editing.gospelText} onChange={e=>setEditing({...editing,gospelText:e.target.value})}/>
      <TextField label="Reflexão" multiline minRows={3} value={editing.reflection} onChange={e=>setEditing({...editing,reflection:e.target.value})}/><TextField label="Oração" multiline minRows={3} value={editing.prayer} onChange={e=>setEditing({...editing,prayer:e.target.value})}/>
      <FormControlLabel control={<Switch checked={editing.protected} onChange={e=>setEditing({...editing,protected:e.target.checked})}/>} label="Proteger contra limpeza automática"/>
    </Stack></DialogContent><DialogActions><Button onClick={()=>setEditorOpen(false)}>Cancelar</Button><Button variant="contained" startIcon={<SaveOutlined/>} onClick={saveEntry} disabled={saving||!editing.title||!editing.date}>Salvar</Button></DialogActions></Dialog>

    <Dialog open={syncing} fullWidth maxWidth="xs"><DialogTitle>Sincronizando a Lectio</DialogTitle><DialogContent><Stack alignItems="center" gap={2} py={3}><CircularProgress/><Typography textAlign="center">Consultando a fonte principal. Se ela falhar, a fonte alternativa será utilizada automaticamente.</Typography><Alert severity="info">Não feche esta janela. A operação pode levar alguns segundos.</Alert></Stack></DialogContent></Dialog>

    <Dialog open={settingsOpen} onClose={()=>setSettingsOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Configurações da Lectio</DialogTitle><DialogContent>{settings&&<Stack gap={2} mt={1}>
      <TextField select label="Fonte principal" value={settings.primarySource} onChange={e=>setSettings({...settings,primarySource:e.target.value as LectioSettings['primarySource']})}><MenuItem value="CNBB">CNBB</MenuItem><MenuItem value="CANCAO_NOVA">Canção Nova</MenuItem></TextField>
      <TextField select label="Fonte alternativa" value={settings.fallbackSource} onChange={e=>setSettings({...settings,fallbackSource:e.target.value as LectioSettings['fallbackSource']})}><MenuItem value="CNBB">CNBB</MenuItem><MenuItem value="CANCAO_NOVA">Canção Nova</MenuItem></TextField>
      <TextField label="Dias de retenção (1 a 30)" type="number" value={settings.retentionDays} onChange={e=>setSettings({...settings,retentionDays:Number(e.target.value)})} inputProps={{min:1,max:30}}/>
      <FormControlLabel control={<Switch checked={settings.cnbbEnabled} onChange={e=>setSettings({...settings,cnbbEnabled:e.target.checked})}/>} label="CNBB ativada"/><FormControlLabel control={<Switch checked={settings.cancaoNovaEnabled} onChange={e=>setSettings({...settings,cancaoNovaEnabled:e.target.checked})}/>} label="Canção Nova ativada"/><FormControlLabel control={<Switch checked={settings.deleteOldRecords} onChange={e=>setSettings({...settings,deleteOldRecords:e.target.checked})}/>} label="Excluir automaticamente conteúdos antigos"/>
      <Alert severity="info">Registros MANUAL, REVISADA ou marcados como protegidos não são removidos.</Alert>
    </Stack>}</DialogContent><DialogActions><Button onClick={()=>setSettingsOpen(false)}>Cancelar</Button><Button variant="contained" onClick={saveSettings} disabled={saving}>Salvar configurações</Button></DialogActions></Dialog>
  </Box>;
}
