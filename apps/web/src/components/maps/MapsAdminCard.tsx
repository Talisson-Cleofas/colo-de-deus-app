import { MapOutlined, RefreshOutlined } from '@mui/icons-material';
import { Alert, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../services/api';

type MapsStatus = { enabled:boolean; configured:boolean; totalMembers:number; geocoded:number; pending:number; errors:number; cacheHits:number; cacheMisses:number };

export function MapsAdminCard() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey:['google-maps-status'], queryFn:async()=>(await api.get<MapsStatus>('/google-maps/status')).data, staleTime:60_000 });
  const rebuild = async () => { await api.post('/google-maps/rebuild'); await queryClient.invalidateQueries({queryKey:['google-maps-status']}); await queryClient.invalidateQueries({queryKey:['members-map']}); };
  if(query.error) return <Alert severity="warning">{apiErrorMessage(query.error)}</Alert>;
  const value=query.data;
  return <Card variant="outlined"><CardContent>
    <Stack direction="row" justifyContent="space-between" alignItems="center"><MapOutlined color="primary"/><Chip size="small" color={value?.configured?'success':'warning'} label={value?.configured?'Configurado':'Revisar configuração'}/></Stack>
    <Typography variant="h6" mt={2}>Google Maps</Typography>
    {query.isLoading?<CircularProgress size={24}/>:<Stack spacing={0.5} mt={1}><Typography>Total: {value?.totalMembers??0}</Typography><Typography>Geocodificados: {value?.geocoded??0}</Typography><Typography>Pendentes: {value?.pending??0} · Erros: {value?.errors??0}</Typography><Typography variant="caption" color="text.secondary">Cache: {value?.cacheHits??0} acertos · {value?.cacheMisses??0} consultas</Typography></Stack>}
    <Button fullWidth sx={{mt:2}} variant="outlined" startIcon={<RefreshOutlined/>} onClick={()=>void rebuild()}>Reconstruir coordenadas</Button>
  </CardContent></Card>;
}
