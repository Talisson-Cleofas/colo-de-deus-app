import { DeleteOutline, RestoreOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Card, CircularProgress, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../services/api';

type TrashItem={id:string;name?:string;title?:string;email?:string;type?:string;deletedAt?:string;deletedBy?:string};
const sources=[
  {label:'Eventos',load:'/events/trash',restore:(id:string)=>`/events/${id}/restore`},
  {label:'Células',load:'/communities/trash?type=CELL',restore:(id:string)=>`/communities/${id}/restore`},
  {label:'Cenáculos',load:'/communities/trash?type=CENACLE',restore:(id:string)=>`/communities/${id}/restore`},
  {label:'Membros',load:'/members/trash',restore:(id:string)=>`/members/${id}/restore`},
];
export function TrashPage(){
 const [tab,setTab]=useState(0),[items,setItems]=useState<TrashItem[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const load=async()=>{setLoading(true);setError('');try{const r=await api.get(sources[tab].load);setItems(Array.isArray(r.data)?r.data:(r.data.members||[]));}catch(e){setError(apiErrorMessage(e));}finally{setLoading(false)}};
 useEffect(()=>{void load()},[tab]);
 const restore=async(id:string)=>{try{const r=await api.post(sources[tab].restore(id));setSuccess(r.data.message||'Registro restaurado.');await load();}catch(e){setError(apiErrorMessage(e));}};
 return <Box><Stack direction="row" gap={1} alignItems="center"><DeleteOutline/><Box><Typography variant="h4">Lixeira</Typography><Typography color="text.secondary">Registros excluídos podem ser restaurados com segurança.</Typography></Box></Stack><Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{mt:3,mb:2}}>{sources.map(s=><Tab key={s.label} label={s.label}/>)}</Tabs>{success&&<Alert severity="success" sx={{mb:2}} onClose={()=>setSuccess('')}>{success}</Alert>}{error&&<Alert severity="error" sx={{mb:2}}>{error}</Alert>}{loading?<Box textAlign="center" py={8}><CircularProgress/></Box>:items.length===0?<Alert severity="info">Nenhum registro excluído nesta categoria.</Alert>:<Stack spacing={1.5}>{items.map(item=><Card key={item.id} sx={{p:2}}><Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" gap={2}><Box><Typography fontWeight={800}>{item.title||item.name||item.email||item.id}</Typography><Typography color="text.secondary" fontSize={13}>Excluído em: {item.deletedAt||'não informado'}{item.deletedBy?` • por ${item.deletedBy}`:''}</Typography></Box><Button variant="outlined" startIcon={<RestoreOutlined/>} onClick={()=>void restore(item.id)}>Restaurar</Button></Stack></Card>)}</Stack>}</Box>;
}
