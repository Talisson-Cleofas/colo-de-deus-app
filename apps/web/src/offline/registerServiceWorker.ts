import { syncOfflineActions } from './offlineQueue';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      await registration.update();
      const update = () => void registration.update();
      window.addEventListener('focus', update);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') update(); });
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) worker.postMessage({ type: 'SKIP_WAITING' });
        });
      });
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!reloading) { reloading = true; window.location.reload(); }
      });
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
