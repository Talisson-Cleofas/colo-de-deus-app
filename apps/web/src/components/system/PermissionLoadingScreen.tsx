import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';

export function PermissionLoadingScreen({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  return (
    <Box sx={{ minHeight: 420, display: 'grid', placeItems: 'center', p: 3 }}>
      <Stack spacing={2.5} alignItems="center" sx={{ maxWidth: 560, width: '100%' }}>
        {error ? (
          <>
            <Alert severity="warning" sx={{ width: '100%' }}>
              Não foi possível validar suas permissões agora. Isso não significa que seu perfil esteja sem acesso.<br />
              {error}
            </Alert>
            <Button variant="contained" onClick={onRetry}>Tentar novamente</Button>
          </>
        ) : (
          <>
            <CircularProgress />
            <Typography variant="h6">Validando permissões...</Typography>
            <Typography color="text.secondary" textAlign="center">Aguarde enquanto carregamos seu perfil com segurança.</Typography>
          </>
        )}
      </Stack>
    </Box>
  );
}
