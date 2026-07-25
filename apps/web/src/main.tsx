import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { PermissionProvider } from './rbac/PermissionContext';
import { AppErrorBoundary } from './components/system/AppErrorBoundary';
import { enableOfflineSync, registerServiceWorker } from './offline/registerServiceWorker';
import { theme } from './theme/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { startFrontendMetrics } from './performance/webVitals';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 45_000, gcTime: 10*60_000, retry: 1, refetchOnWindowFocus: false } } });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <PermissionProvider>
              <App />
            </PermissionProvider>
          </AuthProvider>
          </QueryClientProvider>
        </BrowserRouter>
      </ThemeProvider>
    </AppErrorBoundary>
  </React.StrictMode>,
);

startFrontendMetrics();
registerServiceWorker();
enableOfflineSync();
