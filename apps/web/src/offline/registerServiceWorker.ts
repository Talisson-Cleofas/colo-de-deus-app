import { getCurrentIdToken } from '../services/firebase';
import type { AuthUser } from '../types';
import { discardLegacyOfflineActions, syncOfflineActions } from './offlineQueue';

const RELOAD_GUARD = 'colo:pwa-controller-reload';

function currentOwnerId() {
  try {
    const user = JSON.parse(localStorage.getItem('colo:user') ?? 'null') as AuthUser | null;
    return user?.memberId || user?.id || user?.uid || '';
  } catch {
    return '';
  }
}

function announceUpdate(registration: ServiceWorkerRegistration) {
  window.dispatchEvent(new CustomEvent('colo:pwa-update', {
    detail: { apply: () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' }) },
  }));
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      await registration.update();
      const update = () => void registration.update();
      window.addEventListener('focus', update);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') update(); });
      if (registration.waiting && navigator.serviceWorker.controller) announceUpdate(registration);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) announceUpdate(registration);
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (sessionStorage.getItem(RELOAD_GUARD) === '1') return;
        sessionStorage.setItem(RELOAD_GUARD, '1');
        window.location.reload();
      });
      window.addEventListener('pageshow', () => sessionStorage.removeItem(RELOAD_GUARD), { once: true });
    } catch (error) {
      console.error('Falha ao registrar service worker', error);
    }
  });
}

export function enableOfflineSync() {
  discardLegacyOfflineActions();
  const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
  const sync = () => {
    const ownerId = currentOwnerId();
    if (ownerId) void syncOfflineActions(apiBaseUrl, { ownerId, getToken: getCurrentIdToken });
  };
  window.addEventListener('online', sync);
  window.addEventListener('colo:session-changed', sync);
  if (navigator.onLine) sync();
  return () => {
    window.removeEventListener('online', sync);
    window.removeEventListener('colo:session-changed', sync);
  };
}
