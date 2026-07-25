import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, Box, Button, Paper, Typography } from '@mui/material';

type State = { failed: boolean; message: string };

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { failed: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro de renderização:', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
        <Paper sx={{ p: 4, maxWidth: 620, width: '100%' }}>
          <Typography variant="h5" fontWeight={800}>Não foi possível abrir esta tela</Typography>
          <Alert severity="error" sx={{ my: 2 }}>{this.state.message || 'Erro inesperado.'}</Alert>
          <Button variant="contained" onClick={() => window.location.reload()}>Recarregar aplicação</Button>
        </Paper>
      </Box>
    );
  }
}
