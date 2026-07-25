import { ArrowBackOutlined, HomeOutlined, LockOutlined } from '@mui/icons-material';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

export function ForbiddenPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const attemptedPath = (location.state as { from?: string } | null)?.from;

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '70vh', px: 2 }}>
      <Paper sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center', maxWidth: 580, width: '100%' }}>
        <Typography color="primary.main" fontWeight={900} fontSize={{ xs: 64, sm: 88 }} lineHeight={1}>403</Typography>
        <LockOutlined color="primary" sx={{ fontSize: 54, mt: 1 }} />
        <Typography variant="h4" fontWeight={800} mt={2}>Sem permissão</Typography>
        <Typography color="text.secondary" my={2}>
          Seu perfil não possui a permissão necessária para acessar esta página.
        </Typography>
        {attemptedPath && (
          <Typography component="code" sx={{ display: 'block', color: 'text.secondary', mb: 3, overflowWrap: 'anywhere' }}>
            {attemptedPath}
          </Typography>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
          <Button variant="outlined" startIcon={<ArrowBackOutlined />} onClick={() => navigate(-1)}>Voltar</Button>
          <Button variant="contained" startIcon={<HomeOutlined />} onClick={() => navigate('/')}>Ir para o início</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
