import { Alert, Box, Button, Card, CircularProgress, Typography } from '@mui/material';
import type { DashboardLectio } from '../../dashboard/useMemberDashboard';

export function LectioHero({ onOpen, item, loading, error }: { onOpen: () => void; item: DashboardLectio | null; loading?: boolean; error?: string }) {
  return <Card sx={{ position:'relative', minHeight:{xs:350,md:360}, overflow:'hidden', borderRadius:3 }}>
    <Box sx={{position:'absolute',inset:0,backgroundImage:'linear-gradient(90deg, rgba(5,5,5,.98) 0%, rgba(5,5,5,.85) 42%, rgba(5,5,5,.08) 78%), url(/lectio-hero.png)',backgroundSize:'cover',backgroundPosition:'center right'}}/>
    <Box sx={{position:'relative',zIndex:1,p:{xs:3,md:4.5},maxWidth:570}}>
      <Typography variant="h4" fontWeight={900}>LECTIO DIVINA</Typography><Typography color="primary.main" variant="h6" mt={0.4}>De hoje</Typography>
      {loading?<Box mt={5}><CircularProgress size={30}/><Typography mt={2}>Carregando a Lectio de hoje...</Typography></Box>:error?<Alert severity="warning" sx={{mt:3}}>{error}</Alert>:item?<>
        <Typography color="primary.main" fontWeight={900} mt={3}>{item.gospelReference||item.celebration}</Typography>
        {item.gospelTitle&&<Typography color="text.secondary" mt={0.5}>{item.gospelTitle}</Typography>}
        <Typography fontSize={{xs:18,md:21}} lineHeight={1.55} mt={2}>“{item.excerpt||'A leitura de hoje está disponível.'}”</Typography>
        <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>Fonte: {item.source} • {item.status}</Typography>
      </>:<Alert severity="info" sx={{mt:3}}>A Lectio de hoje ainda não foi publicada.</Alert>}
      <Button onClick={onOpen} disabled={!item} variant="outlined" size="large" sx={{mt:4,minWidth:190}}>Acessar leitura completa</Button>
    </Box>
  </Card>;
}
