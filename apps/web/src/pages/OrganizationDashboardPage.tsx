import {
  AccountTreeOutlined,
  AdminPanelSettingsOutlined,
  CelebrationOutlined,
  GroupsOutlined,
  HistoryOutlined,
  HubOutlined,
  RefreshOutlined,
  WifiOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../services/api';

type LogItem = { id:string; action:string; module:string; description:string; userName:string; userEmail:string; createdAt:string };
type ChangeItem = LogItem & { entity:string; recordId:string };
type DashboardData = {
  generatedAt:string;
  metrics:{ members:number; leaders:number; cells:number; ministries:number; events:number; cenacles:number; onlineUsers:number };
  recentLogs:LogItem[];
  latestChanges:ChangeItem[];
};

function ago(value:string){
  const at=new Date(value).getTime(); if(!Number.isFinite(at)) return value||'Sem data';
  const minutes=Math.max(0,Math.floor((Date.now()-at)/60000));
  if(minutes<1)return 'Agora'; if(minutes<60)return `Há ${minutes} min`;
  const hours=Math.floor(minutes/60); if(hours<24)return `Há ${hours} h`;
  return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(at));
}

function MetricCard({icon,label,value,onClick}:{icon:ReactNode;label:string;value:number;onClick?:()=>void}){
  return <Card onClick={onClick} sx={{cursor:onClick?'pointer':'default',transition:'transform .2s ease','&:hover':onClick?{transform:'translateY(-3px)'}:undefined}}>
    <CardContent><Stack direction="row" alignItems="center" justifyContent="space-between">
      <Box><Typography color="text.secondary" variant="body2" fontWeight={700}>{label}</Typography><Typography variant="h4" mt={.5}>{value}</Typography></Box>
      <Avatar sx={{bgcolor:'rgba(211,154,87,.14)',color:'primary.main'}}>{icon}</Avatar>
    </Stack></CardContent>
  </Card>;
}

function ActivityList({items,changes=false}:{items:Array<LogItem|ChangeItem>;changes?:boolean}){
  if(!items.length)return <Typography color="text.secondary">Nenhum registro encontrado.</Typography>;
  return <Stack divider={<Divider flexItem />}>
    {items.map((item)=><Stack key={item.id} direction="row" spacing={1.5} py={1.5} alignItems="flex-start">
      <Avatar sx={{width:36,height:36,bgcolor:'background.default',color:'primary.main'}}>{changes?<HistoryOutlined fontSize="small"/>:<AdminPanelSettingsOutlined fontSize="small"/>}</Avatar>
      <Box flex={1} minWidth={0}>
        <Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" gap={.5}>
          <Typography fontWeight={700}>{item.description}</Typography><Typography variant="caption" color="text.secondary">{ago(item.createdAt)}</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">{item.userName || 'Sistema'}{item.userEmail?` • ${item.userEmail}`:''}</Typography>
        <Stack direction="row" spacing={1} mt={.75} flexWrap="wrap"><Chip size="small" label={item.action}/><Chip size="small" variant="outlined" label={item.module}/>{changes&&'entity'in item&&item.entity?<Chip size="small" variant="outlined" label={item.entity}/>:null}</Stack>
      </Box>
    </Stack>)}
  </Stack>;
}

export function OrganizationDashboardPage(){
  const navigate=useNavigate(); const [data,setData]=useState<DashboardData|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try{
    const response=await api.get<Partial<DashboardData>>('/admin/dashboard');
    const payload=response.data??{}; const metrics=payload.metrics??{} as DashboardData['metrics'];
    setData({
      generatedAt:String(payload.generatedAt??new Date().toISOString()),
      metrics:{members:Number(metrics.members??0),leaders:Number(metrics.leaders??0),cells:Number(metrics.cells??0),ministries:Number(metrics.ministries??0),events:Number(metrics.events??0),cenacles:Number(metrics.cenacles??0),onlineUsers:Number(metrics.onlineUsers??0)},
      recentLogs:Array.isArray(payload.recentLogs)?payload.recentLogs:[],
      latestChanges:Array.isArray(payload.latestChanges)?payload.latestChanges:[],
    });
  }catch(e){setError(apiErrorMessage(e));}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  if(loading&&!data)return <Box><Skeleton width={360} height={56}/><Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'repeat(2,1fr)',xl:'repeat(4,1fr)'},gap:2,mt:3}}>{Array.from({length:7}).map((_,i)=><Skeleton key={i} variant="rounded" height={120}/>)}</Box></Box>;
  return <Box>
    <Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" alignItems={{xs:'flex-start',sm:'center'}} gap={2} mb={3}>
      <Box><Chip label="Administração Geral" size="small" sx={{mb:1}}/><Typography variant="h4">Organização</Typography><Typography color="text.secondary">Indicadores, atividades e alterações recentes da missão.</Typography></Box>
      <Tooltip title="Atualizar"><span><IconButton onClick={()=>void load()} disabled={loading}>{loading?<CircularProgress size={22}/>:<RefreshOutlined/>}</IconButton></span></Tooltip>
    </Stack>
    {error&&<Alert severity="error" action={<Button color="inherit" onClick={()=>void load()}>Tentar novamente</Button>} sx={{mb:2}}>{error}</Alert>}
    {data&&<>
      <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'repeat(2,1fr)',xl:'repeat(4,1fr)'},gap:2}}>
        <MetricCard icon={<GroupsOutlined/>} label="Membros" value={data.metrics.members} onClick={()=>navigate('/membros')}/>
        <MetricCard icon={<AdminPanelSettingsOutlined/>} label="Líderes" value={data.metrics.leaders} onClick={()=>navigate('/membros')}/>
        <MetricCard icon={<HubOutlined/>} label="Células" value={data.metrics.cells} onClick={()=>navigate('/celulas')}/>
        <MetricCard icon={<AccountTreeOutlined/>} label="Ministérios" value={data.metrics.ministries} onClick={()=>navigate('/ministerios')}/>
        <MetricCard icon={<CelebrationOutlined/>} label="Eventos" value={data.metrics.events} onClick={()=>navigate('/eventos')}/>
        <MetricCard icon={<GroupsOutlined/>} label="Cenáculos" value={data.metrics.cenacles} onClick={()=>navigate('/cenaculos')}/>
        <MetricCard icon={<WifiOutlined/>} label="Usuários online" value={data.metrics.onlineUsers}/>
      </Box>
      <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',lg:'1fr 1fr'},gap:2,mt:3}}>
        <Card><CardContent><Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}><Typography variant="h6">Logs recentes</Typography><Button size="small" onClick={()=>navigate('/auditoria')}>Ver auditoria</Button></Stack><ActivityList items={data.recentLogs}/></CardContent></Card>
        <Card><CardContent><Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}><Typography variant="h6">Últimas alterações</Typography><Button size="small" onClick={()=>navigate('/auditoria')}>Ver todas</Button></Stack><ActivityList items={data.latestChanges} changes/></CardContent></Card>
      </Box>
    </>}
  </Box>;
}
