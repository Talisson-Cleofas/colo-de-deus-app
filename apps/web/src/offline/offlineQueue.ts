export type OfflineAction = {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  createdAt: string;
};

const STORAGE_KEY = 'colo-de-deus-offline-actions';

export function getOfflineActions(): OfflineAction[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as OfflineAction[];
  } catch {
    return [];
  }
}

export function enqueueOfflineAction(action: Omit<OfflineAction, 'id' | 'createdAt'>) {
  const actions = getOfflineActions();
  actions.push({ ...action, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
}

export async function syncOfflineActions(apiBaseUrl: string) {
  if (!navigator.onLine) return { synced: 0, pending: getOfflineActions().length };
  const actions = getOfflineActions();
  const pending: OfflineAction[] = [];
  let synced = 0;
  for (const action of actions) {
    try {
      const response = await fetch(`${apiBaseUrl}${action.url}`, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: action.body === undefined ? undefined : JSON.stringify(action.body),
      });
      if (!response.ok) throw new Error(String(response.status));
      synced += 1;
    } catch {
      pending.push(action);
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  return { synced, pending: pending.length };
}
