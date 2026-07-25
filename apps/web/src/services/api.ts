import axios, { AxiosError } from 'axios';
import { getCurrentIdToken } from './firebase';
import { recordMetric } from '../performance/webVitals';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  (config as typeof config & { metadata?: { startedAt: number } }).metadata = { startedAt: performance.now() };
  const token = await getCurrentIdToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => { const started=(response.config as typeof response.config & {metadata?:{startedAt:number}}).metadata?.startedAt; if(started) recordMetric(`api.${response.config.method ?? 'get'}.${response.config.url ?? 'unknown'}`, performance.now()-started); return response; },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('colo:session-expired'));
    }
    if (!error.response && error.code !== 'ECONNABORTED') {
      window.dispatchEvent(new CustomEvent('colo:api-unavailable'));
    }
    if (error.code === 'ECONNABORTED') window.dispatchEvent(new CustomEvent('colo:api-timeout'));
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) return data.message.join(', ');
    if (typeof data?.message === 'string') return data.message;
    if (error.code === 'ECONNABORTED') return 'O servidor demorou para responder. Tente novamente.';
    if (!error.response) return navigator.onLine ? 'Não foi possível conectar à API.' : 'Você está sem conexão com a internet.';
  }
  return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
}
