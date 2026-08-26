import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  discardOfflineActionsForOwner,
  enqueueOfflineAction,
  getOfflineActions,
  syncOfflineActions,
} from './offlineQueue';

describe('offlineQueue', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  it('vincula a ação ao usuário e envia token renovado e idempotency key', async () => {
    enqueueOfflineAction({ ownerId: 'user-a', url: '/missionary-agenda/a/complete', method: 'POST' });
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const getToken = vi.fn().mockResolvedValue('fresh-token');
    await expect(syncOfflineActions('/api', { ownerId: 'user-a', getToken, fetcher })).resolves.toEqual({
      synced: 1, pending: 0, conflicts: 0,
    });
    expect(fetcher).toHaveBeenCalledWith('/api/missionary-agenda/a/complete', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer fresh-token', 'Idempotency-Key': expect.any(String) }),
    }));
    expect(getOfflineActions()).toHaveLength(0);
  });

  it('nunca reproduz ação do usuário A durante sessão do usuário B', async () => {
    enqueueOfflineAction({ ownerId: 'user-a', url: '/events', method: 'POST', body: { title: 'A' } });
    const fetcher = vi.fn();
    const result = await syncOfflineActions('/api', { ownerId: 'user-b', getToken: async () => 'token-b', fetcher });
    expect(result).toEqual({ synced: 0, pending: 1, conflicts: 0 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('preserva conflitos sem repetir indefinidamente', async () => {
    enqueueOfflineAction({ ownerId: 'user-a', url: '/events/a', method: 'PATCH' });
    const result = await syncOfflineActions('/api', {
      ownerId: 'user-a', getToken: async () => 'token', fetcher: vi.fn().mockResolvedValue(new Response('', { status: 409 })),
    });
    expect(result.conflicts).toBe(1);
    expect(getOfflineActions()[0].attempts).toBe(6);
  });

  it('remove operações pendentes do proprietário no logout', () => {
    enqueueOfflineAction({ ownerId: 'user-a', url: '/events/a', method: 'DELETE' });
    expect(discardOfflineActionsForOwner('user-a')).toBe(1);
    expect(getOfflineActions()).toHaveLength(0);
  });
});
