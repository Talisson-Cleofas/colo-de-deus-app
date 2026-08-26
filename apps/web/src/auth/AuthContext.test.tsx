import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const mocks = vi.hoisted(() => ({ get: vi.fn(), observe: vi.fn(), signOut: vi.fn() }));
vi.mock('../services/api', () => ({ api: { get: mocks.get, post: vi.fn() }, apiErrorMessage: () => 'Falha transitória da API' }));
vi.mock('../services/firebase', () => ({ observeAuthState: mocks.observe, googleSignIn: vi.fn(), googleSignOut: mocks.signOut }));

function Probe() {
  const { user, initializing, error } = useAuth();
  return <div><span>{initializing ? 'Inicializando' : user ? `Autenticado: ${user.name}` : 'Não autenticado'}</span>{error && <span>{error}</span>}</div>;
}

describe('AuthProvider', () => {
  beforeEach(() => { localStorage.clear(); mocks.get.mockReset(); mocks.observe.mockReset(); });

  it('expõe loading até o observador resolver e depois estado não autenticado', async () => {
    let callback: (ready: boolean, hasUser: boolean) => void = () => undefined;
    mocks.observe.mockImplementation(async (next) => { callback = next; return () => undefined; });
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByText('Inicializando')).toBeInTheDocument();
    await act(async () => callback(true, false));
    expect(await screen.findByText('Não autenticado')).toBeInTheDocument();
  });

  it('restaura usuário autenticado validado pela API', async () => {
    localStorage.setItem('colo:user', JSON.stringify({ id: 'a', uid: 'a', memberId: 'a', name: 'Snapshot' }));
    mocks.get.mockResolvedValue({ data: { user: { id: 'a', uid: 'a', memberId: 'a', name: 'Membro A' } } });
    mocks.observe.mockImplementation(async (callback) => { await callback(true, true); return () => undefined; });
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText('Autenticado: Membro A')).toBeInTheDocument();
  });

  it('preserva snapshot e anuncia falha transitória da API', async () => {
    localStorage.setItem('colo:user', JSON.stringify({ id: 'a', name: 'Snapshot' }));
    mocks.get.mockRejectedValue(new Error('offline'));
    mocks.observe.mockImplementation(async (callback) => { await callback(true, true); return () => undefined; });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('Falha transitória da API')).toBeInTheDocument());
    expect(screen.getByText('Autenticado: Snapshot')).toBeInTheDocument();
    expect(localStorage.getItem('colo:user')).not.toBeNull();
  });
});
