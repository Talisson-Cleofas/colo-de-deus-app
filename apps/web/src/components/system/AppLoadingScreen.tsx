import { Box, CircularProgress, Typography } from '@mui/material';
import { Brand } from '../Brand';

export function AppLoadingScreen() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Box sx={{ display: 'grid', justifyItems: 'center', gap: 3 }}>
        <Brand />
        <CircularProgress />
        <Typography color="text.secondary">Validando sua sessão...</Typography>
      </Box>
    </Box>
  );
}
