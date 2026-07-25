import { syncOfflineActions } from './offlineQueue';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (error) {
      console.error('Falha ao registrar service worker', error);
    }
  });
}

export function enableOfflineSync() {
  const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
  const sync = () => void syncOfflineActions(apiBaseUrl);
  window.addEventListener('online', sync);
  if (navigator.onLine) sync();
  return () => window.removeEventListener('online', sync);
}
