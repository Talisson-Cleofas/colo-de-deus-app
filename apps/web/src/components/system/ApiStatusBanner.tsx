import { Alert, Button, Collapse } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';

export function ApiStatusBanner() {
  const [unavailable, setUnavailable] = useState(false);

  const check = useCallback(async () => {
    try {
      await api.get('/health', { timeout: 5000 });
      setUnavailable(false);
    } catch {
      setUnavailable(true);
    }
  }, []);

  useEffect(() => {
    void check();
    const timer = window.setInterval(check, 30000);
    const failed = () => setUnavailable(true);
    const online = () => void check();
    window.addEventListener('colo:api-unavailable', failed);
    window.addEventListener('online', online);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('colo:api-unavailable', failed);
      window.removeEventListener('online', online);
    };
  }, [check]);

  return (
    <Collapse in={unavailable}>
      <Alert
        severity="warning"
        action={<Button onClick={check}>Tentar novamente</Button>}
        sx={{ mb: 2 }}
      >
        Não foi possível acessar a API. Alguns dados podem estar temporariamente indisponíveis.
      </Alert>
    </Collapse>
  );
}
