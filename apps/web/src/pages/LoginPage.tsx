import { Google, WifiOffOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { Brand } from '../components/Brand';

export function LoginPage() {
  const { login, loading, error } = useAuth();
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 470 }}>
        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
          <Brand />
          <Typography variant="h4" mt={5}>Bem-vindo</Typography>
          <Typography color="text.secondary" mt={1} mb={4}>
            Entre com sua conta Google para acessar a Missão Brasília.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Button
            fullWidth
            size="large"
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} /> : <Google />}
            onClick={login}
            disabled={loading}
          >
            {import.meta.env.VITE_DEMO_MODE === 'true'
              ? 'Entrar no modo demonstração'
              : 'Entrar com Google'}
          </Button>
          <Stack direction="row" gap={1} mt={2} alignItems="flex-start">
            <WifiOffOutlined color="disabled" fontSize="small" />
            <Typography color="text.secondary" fontSize={12}>
              O primeiro login precisa de internet. Depois, o Firebase mantém sua sessão com segurança neste dispositivo.
            </Typography>
          </Stack>
          <Typography color="text.secondary" fontSize={12} mt={2}>
            O acesso é liberado somente para e-mails ativos na aba Membros do Google Sheets.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
