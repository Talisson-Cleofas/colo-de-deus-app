export type OfflineAction = {
  id: string;
  idempotencyKey: string;
  ownerId: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  createdAt: string;
  attempts: number;
  nextAttemptAt: string;
};

type SyncContext = {
  ownerId: string;
  getToken: (forceRefresh?: boolean) => Promise<string | null>;
  fetcher?: typeof fetch;
  now?: () => Date;
};

const STORAGE_KEY = 'colo-de-deus-offline-actions-v2';
const LEGACY_STORAGE_KEY = 'colo-de-deus-offline-actions';
const MAX_ATTEMPTS = 6;

function save(actions: OfflineAction[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
}

export function getOfflineActions(): OfflineAction[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as OfflineAction[];
  } catch {
    return [];
  }
}

export function discardLegacyOfflineActions() {
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function enqueueOfflineAction(
  action: Omit<OfflineAction, 'id' | 'idempotencyKey' | 'createdAt' | 'attempts' | 'nextAttemptAt'>,
) {
  if (!action.ownerId.trim()) throw new Error('Uma ação offline precisa estar vinculada ao usuário autenticado.');
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const actions = getOfflineActions();
  actions.push({ ...action, id, idempotencyKey: id, createdAt, attempts: 0, nextAttemptAt: createdAt });
  save(actions);
  return id;
}

export function discardOfflineActionsForOwner(ownerId: string) {
  const actions = getOfflineActions();
  const remaining = actions.filter((action) => action.ownerId !== ownerId);
  save(remaining);
  return actions.length - remaining.length;
}

function retryAt(now: Date, attempts: number) {
  const delay = Math.min(5 * 60_000, 1_000 * 2 ** Math.max(0, attempts - 1));
  return new Date(now.getTime() + delay).toISOString();
}

export async function syncOfflineActions(apiBaseUrl: string, context: SyncContext) {
  const actions = getOfflineActions();
  if (!navigator.onLine || !context.ownerId) return { synced: 0, pending: actions.length, conflicts: 0 };
  const fetcher = context.fetcher ?? fetch;
  const now = context.now?.() ?? new Date();
  const pending: OfflineAction[] = [];
  let synced = 0;
  let conflicts = 0;
  for (const action of actions) {
    if (action.ownerId !== context.ownerId || new Date(action.nextAttemptAt) > now) {
      pending.push(action);
      continue;
    }
    const token = await context.getToken(action.attempts > 0);
    if (!token) {
      pending.push(action);
      continue;
    }
    try {
      const response = await fetcher(`${apiBaseUrl}${action.url}`, {
        method: action.method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': action.idempotencyKey,
        },
        body: action.body === undefined ? undefined : JSON.stringify(action.body),
      });
      if (response.ok) synced += 1;
      else if (response.status === 409 || response.status === 412) {
        conflicts += 1;
        pending.push({ ...action, attempts: MAX_ATTEMPTS });
      } else if ([401, 403].includes(response.status)) pending.push(action);
      else throw new Error(String(response.status));
    } catch {
      const attempts = action.attempts + 1;
      pending.push({
        ...action,
        attempts,
        nextAttemptAt: attempts >= MAX_ATTEMPTS ? action.nextAttemptAt : retryAt(now, attempts),
      });
    }
  }
  save(pending);
  return { synced, pending: pending.length, conflicts };
}
